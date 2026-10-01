from fastapi import APIRouter
from fastapi.responses import JSONResponse

from models.otp_model import SendOtpRequest, VerifyOtpRequest
from services.otp_service import OtpServiceError, create_and_send_otp, verify_otp

router = APIRouter(prefix="/api", tags=["otp"])


def _success_response(message: str, data: dict | None = None, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data or {},
        },
    )


def _error_response(error: OtpServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={
            "success": False,
            "message": error.message,
            "data": error.data,
        },
    )


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest):
    """
    Generate and email a 6-digit OTP with cooldown and expiry enforcement.
    """

    try:
        result = await create_and_send_otp(payload.email)
        return _success_response(
            "OTP sent successfully",
            result,
            status_code=200,
        )
    except OtpServiceError as exc:
        return _error_response(exc)
    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Unexpected server error while sending OTP",
                "data": {},
            },
        )


@router.post("/verify-otp")
async def verify_otp_code(payload: VerifyOtpRequest):
    """
    Validate an OTP, enforce attempt limits, and clear it after success.
    """

    try:
        result = verify_otp(payload.email, payload.otp)
        return _success_response(
            "OTP verified successfully",
            result,
            status_code=200,
        )
    except OtpServiceError as exc:
        return _error_response(exc)
    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Unexpected server error while verifying OTP",
                "data": {},
            },
        )
