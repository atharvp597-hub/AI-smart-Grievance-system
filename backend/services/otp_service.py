from __future__ import annotations

import asyncio
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from config import (
    OTP_EXPIRY_MINUTES,
    OTP_DEV_MODE,
    OTP_LENGTH,
    OTP_INCLUDE_DEBUG_OTP,
    OTP_MAX_VERIFY_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
    OTP_VERIFIED_EMAIL_WINDOW_MINUTES,
    RESEND_API_KEY,
    RESEND_FROM_EMAIL,
)
from database.db import db

logger = logging.getLogger(__name__)

# P5 fix: OTPs are now persisted in MongoDB instead of in-memory dicts.
# Collections: db.otp_store, db.verified_email_store
# TTL indexes are created at startup to auto-expire documents.


def ensure_otp_indexes():
    """Create TTL indexes so MongoDB auto-expires stale documents."""
    # TTL index on expires_at — MongoDB removes documents 0 seconds after that field
    db.otp_store.create_index("expires_at", expireAfterSeconds=0)
    db.verified_email_store.create_index("expires_at", expireAfterSeconds=0)
    # Unique lookup index
    db.otp_store.create_index("email", unique=True)
    db.verified_email_store.create_index("email", unique=True)


class OtpServiceError(Exception):
    """Structured OTP errors that routes can convert into clean JSON responses."""

    def __init__(self, status_code: int, message: str, *, data: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.data = data or {}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.lower().strip()


def _generate_otp() -> str:
    """Generate a secure 6-digit OTP using Python's secrets module."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def _hash_otp(email: str, otp: str) -> str:
    payload = f"{_normalize_email(email)}:{otp}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _seconds_remaining(target: datetime) -> int:
    remaining = int((target - _utc_now()).total_seconds())
    return max(remaining, 0)


def _build_otp_email_html(email: str, otp: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #0f172a;">
      <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <h1 style="margin: 0 0 12px; font-size: 24px;">Verify your email</h1>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
          Use the one-time password below to continue. This OTP is valid for
          <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.
        </p>
        <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #1d4ed8;">
            Your OTP
          </p>
          <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 0.24em; color: #111827;">
            {otp}
          </p>
        </div>
        <p style="margin: 0; font-size: 14px; color: #475569;">
          Requested for: <strong>{email}</strong>
        </p>
        <p style="margin: 20px 0 0; font-size: 13px; color: #64748b;">
          If you did not request this OTP, you can safely ignore this email.
        </p>
      </div>
    </div>
    """


def _build_otp_email_text(email: str, otp: str) -> str:
    return (
        f"Your OTP is {otp}.\n\n"
        f"It expires in {OTP_EXPIRY_MINUTES} minutes.\n"
        f"Requested for: {email}\n\n"
        "If you did not request this OTP, please ignore this email."
    )


def _send_otp_email_sync(email: str, otp: str) -> dict[str, Any]:
    if not RESEND_API_KEY:
        if OTP_DEV_MODE:
            logger.warning(
                "OTP dev mode active: RESEND_API_KEY is missing, so OTP for %s was not emailed. OTP=%s",
                email,
                otp,
            )
            return {
                "id": None,
                "provider": "dev-mode",
                "debug_otp": otp,
            }
        raise OtpServiceError(
            500,
            "RESEND_API_KEY is not configured on the server",
        )

    try:
        import resend
    except ModuleNotFoundError as exc:
        if OTP_DEV_MODE:
            logger.warning(
                "OTP dev mode active: Resend SDK is not installed, so OTP for %s was not emailed. OTP=%s",
                email,
                otp,
            )
            return {
                "id": None,
                "provider": "dev-mode",
                "debug_otp": otp,
            }
        raise OtpServiceError(
            500,
            "Resend SDK is not installed on the server. Run `pip install -r requirements.txt` in the backend environment.",
        ) from exc

    resend.api_key = RESEND_API_KEY
    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [email],
        "subject": "Your verification OTP",
        "html": _build_otp_email_html(email, otp),
        "text": _build_otp_email_text(email, otp),
    }

    response = resend.Emails.send(params)
    if isinstance(response, dict):
        return response

    # SDK response objects vary across versions; normalize to a dict.
    return {
        "id": getattr(response, "id", None),
        "raw": str(response),
    }


async def send_otp_email(email: str, otp: str) -> dict[str, Any]:
    return await asyncio.to_thread(_send_otp_email_sync, email, otp)


async def create_and_send_otp(email: str) -> dict[str, Any]:
    """
    Generate an OTP, enforce cooldown, send it via Resend, and store it in MongoDB.
    """
    normalized_email = _normalize_email(email)
    now = _utc_now()

    # Check cooldown via DB (P5 fix: was in-memory dict)
    existing = db.otp_store.find_one({"email": normalized_email})
    if existing and existing.get("resend_available_at") and existing["resend_available_at"] > now:
        retry_after = _seconds_remaining(existing["resend_available_at"])
        raise OtpServiceError(
            429,
            "OTP was sent recently. Please wait before requesting another one.",
            data={
                "retry_after_seconds": retry_after,
                "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
            },
        )

    otp = _generate_otp()
    try:
        email_result = await send_otp_email(normalized_email, otp)
    except OtpServiceError:
        raise
    except Exception as exc:
        logger.exception("Failed to send OTP email to %s", normalized_email)
        raise OtpServiceError(
            502,
            "Failed to send OTP email. Please try again later.",
        ) from exc

    otp_doc = {
        "email": normalized_email,
        "otp_hash": _hash_otp(normalized_email, otp),
        "expires_at": now + timedelta(minutes=OTP_EXPIRY_MINUTES),
        "resend_available_at": now + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
        "verification_attempts": 0,
        "created_at": now,
        "email_provider_id": email_result.get("id"),
    }
    # Upsert so a re-send replaces the previous record atomically
    db.otp_store.replace_one({"email": normalized_email}, otp_doc, upsert=True)

    logger.info("OTP generated and sent to %s", normalized_email)
    response_data = {
        "email": normalized_email,
        "expires_in_seconds": OTP_EXPIRY_MINUTES * 60,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
        "provider_message_id": email_result.get("id"),
        "delivery_mode": email_result.get("provider", "resend"),
    }
    if OTP_DEV_MODE and OTP_INCLUDE_DEBUG_OTP and email_result.get("debug_otp"):
        response_data["debug_otp"] = email_result["debug_otp"]
    return response_data


def verify_otp(email: str, otp: str) -> dict[str, Any]:
    """
    Validate an OTP against MongoDB with expiry and attempt checks.
    """
    normalized_email = _normalize_email(email)
    record = db.otp_store.find_one({"email": normalized_email})

    if not record:
        raise OtpServiceError(
            404,
            "No active OTP found for this email. Please request a new OTP.",
        )

    now = _utc_now()
    if record["expires_at"] <= now:
        db.otp_store.delete_one({"email": normalized_email})
        raise OtpServiceError(
            400,
            "OTP has expired. Please request a new OTP.",
        )

    if record["verification_attempts"] >= OTP_MAX_VERIFY_ATTEMPTS:
        db.otp_store.delete_one({"email": normalized_email})
        raise OtpServiceError(
            429,
            "Maximum verification attempts exceeded. Please request a new OTP.",
            data={"max_attempts": OTP_MAX_VERIFY_ATTEMPTS},
        )

    submitted_hash = _hash_otp(normalized_email, otp)
    if submitted_hash != record["otp_hash"]:
        new_attempts = record["verification_attempts"] + 1
        db.otp_store.update_one(
            {"email": normalized_email},
            {"$set": {"verification_attempts": new_attempts}},
        )
        attempts_left = OTP_MAX_VERIFY_ATTEMPTS - new_attempts
        if new_attempts >= OTP_MAX_VERIFY_ATTEMPTS:
            db.otp_store.delete_one({"email": normalized_email})
            raise OtpServiceError(
                429,
                "Maximum verification attempts exceeded. Please request a new OTP.",
                data={"max_attempts": OTP_MAX_VERIFY_ATTEMPTS},
            )
        raise OtpServiceError(
            400,
            "Invalid OTP.",
            data={"attempts_left": attempts_left},
        )

    db.otp_store.delete_one({"email": normalized_email})
    verified_doc = {
        "email": normalized_email,
        "verified_at": now,
        "expires_at": now + timedelta(minutes=OTP_VERIFIED_EMAIL_WINDOW_MINUTES),
    }
    db.verified_email_store.replace_one({"email": normalized_email}, verified_doc, upsert=True)
    logger.info("OTP verified successfully for %s", normalized_email)
    return {
        "email": normalized_email,
        "verified": True,
        "valid_for_seconds": OTP_VERIFIED_EMAIL_WINDOW_MINUTES * 60,
    }


def consume_verified_email(email: str) -> bool:
    """
    Use a verified email once for complaint submission.
    """
    normalized_email = _normalize_email(email)
    record = db.verified_email_store.find_one({"email": normalized_email})
    if not record:
        return False

    if record["expires_at"] <= _utc_now():
        db.verified_email_store.delete_one({"email": normalized_email})
        return False

    db.verified_email_store.delete_one({"email": normalized_email})
    return True
