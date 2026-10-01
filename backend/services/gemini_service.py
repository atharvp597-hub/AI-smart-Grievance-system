"""Gemini enhancement service for complaint summaries, translation, and chat."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, Optional

from google import genai

from config import GEMINI_API_KEY, GEMINI_MAX_RETRIES, GEMINI_MODEL, GEMINI_TIMEOUT_SECONDS
from models.chat_model import ChatMessage

logger = logging.getLogger(__name__)

_CLIENT: Optional[genai.Client] = None
_CACHE: dict[str, tuple[float, Dict[str, str]]] = {}
_TRANSLATION_CACHE: dict[str, tuple[float, str]] = {}
_CACHE_TTL_SECONDS = 60 * 30
_CACHE_MAX_ENTRIES = 500  # P13 fix: cap size to prevent unbounded memory growth


def _evict_oldest(cache: dict, max_entries: int) -> None:
    """Remove the oldest half of entries when the cache exceeds max_entries."""
    if len(cache) >= max_entries:
        # Sort by creation timestamp (index 0 of value tuple) and drop oldest half
        sorted_keys = sorted(cache, key=lambda k: cache[k][0])
        for key in sorted_keys[: max_entries // 2]:
            cache.pop(key, None)


def _get_client() -> Optional[genai.Client]:
    global _CLIENT
    api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    if _CLIENT is None:
        _CLIENT = genai.Client(api_key=api_key)

    return _CLIENT


def _build_prompt(complaint_text: str, department: str, priority: str) -> str:
    return (
        "You are an AI civic grievance assistant.\n\n"
        "Analyze the complaint and generate:\n\n"
        "1. A short summary\n"
        "2. A brief urgency explanation\n"
        "3. A professional reasoning statement\n\n"
        f"Complaint:\n{complaint_text}\n\n"
        f"Department:\n{department}\n\n"
        f"Priority:\n{priority}\n\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '"summary": "...",\n'
        '"reasoning": "...",\n'
        '"urgency": "..."\n'
        "}"
    )


def _build_translation_prompt(complaint_text: str, source_language: str) -> str:
    return (
        "You are an expert translator for Indian civic complaints.\n\n"
        "Translate the complaint into clear English.\n"
        "Preserve location details, urgency, and service issue terms.\n"
        "If the complaint is mixed Hindi/Hinglish, normalize it into natural English.\n"
        "Return ONLY the translated English sentence with no quotes, markdown, or explanation.\n\n"
        f"Source language: {source_language}\n"
        f"Complaint:\n{complaint_text}"
    )


def _build_chat_prompt(message: str, history: list[ChatMessage]) -> str:
    serialized_history: list[str] = []
    for item in history[-8:]:
        role = "User" if item.role == "user" else "Assistant"
        serialized_history.append(f"{role}: {item.content.strip()}")

    history_block = "\n".join(serialized_history).strip()

    return (
        "You are Nivaran AI Assistant, a helpful civic grievance chatbot for Indian citizens.\n\n"
        "Your job is to help users:\n"
        "1. Understand how to file a complaint\n"
        "2. Explain departments and complaint priorities\n"
        "3. Guide users on tracking complaints\n"
        "4. Suggest how to describe issues clearly\n"
        "5. Answer platform-related questions briefly and practically\n\n"
        "Rules:\n"
        "- Be concise, supportive, and clear.\n"
        "- Stay focused on grievance support, complaint filing, tracking, departments, and public-service issue reporting.\n"
        "- If asked something unrelated, gently steer back to grievance help.\n"
        "- Do not invent complaint IDs, statuses, or account data.\n"
        "- Use plain text only.\n\n"
        f"Conversation so far:\n{history_block or 'No previous messages.'}\n\n"
        f"User: {message.strip()}\n"
        "Assistant:"
    )


def _cache_key(complaint_text: str, department: str, priority: str) -> str:
    normalized = f"{complaint_text.strip()}|{department.strip()}|{priority.strip()}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _translation_cache_key(complaint_text: str, source_language: str) -> str:
    normalized = f"{complaint_text.strip()}|{source_language.strip()}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _get_cached(payload_key: str) -> Optional[Dict[str, str]]:
    cached = _CACHE.get(payload_key)
    if not cached:
        return None

    created_at, data = cached
    if time.time() - created_at > _CACHE_TTL_SECONDS:
        _CACHE.pop(payload_key, None)
        return None

    return data


def _set_cached(payload_key: str, data: Dict[str, str]) -> None:
    _evict_oldest(_CACHE, _CACHE_MAX_ENTRIES)  # P13 fix
    _CACHE[payload_key] = (time.time(), data)


def _get_cached_translation(payload_key: str) -> Optional[str]:
    cached = _TRANSLATION_CACHE.get(payload_key)
    if not cached:
        return None

    created_at, data = cached
    if time.time() - created_at > _CACHE_TTL_SECONDS:
        _TRANSLATION_CACHE.pop(payload_key, None)
        return None

    return data


def _set_cached_translation(payload_key: str, data: str) -> None:
    _evict_oldest(_TRANSLATION_CACHE, _CACHE_MAX_ENTRIES)  # P13 fix
    _TRANSLATION_CACHE[payload_key] = (time.time(), data)


def _fallback_payload(complaint_text: str, department: str, priority: str) -> Dict[str, str]:
    text = complaint_text.strip()
    summary = text[:140].rstrip(" .")
    if len(text) > 140:
        summary += "..."

    urgency = f"{priority.title()} priority based on the {department.lower()} complaint context."
    reasoning = (
        f"The complaint suggests a {priority.lower()} priority issue in {department.lower()} services, "
        "so it should be reviewed promptly."
    )

    return {
        "summary": summary or "Complaint requires review.",
        "reasoning": reasoning,
        "urgency": urgency,
    }


def _parse_json_response(raw_text: str) -> Dict[str, str]:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            payload = json.loads(cleaned[start : end + 1])
        else:
            raise

    return {
        "summary": str(payload.get("summary", "")).strip(),
        "reasoning": str(payload.get("reasoning", "")).strip(),
        "urgency": str(payload.get("urgency", "")).strip(),
    }


def _call_gemini_sync(prompt: str) -> Dict[str, str]:
    client = _get_client()
    if client is None:
        raise RuntimeError("Gemini API key is not configured")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0.2,
            "top_p": 0.9,
            "max_output_tokens": 256,
            "response_mime_type": "application/json",
        },
    )

    raw_text = getattr(response, "text", None) or ""
    if not raw_text and getattr(response, "candidates", None):
        candidate = response.candidates[0]
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        raw_text = "".join(getattr(part, "text", "") for part in parts)

    if not raw_text:
        raise RuntimeError("Gemini returned an empty response")

    return _parse_json_response(raw_text)


def _call_gemini_translation_sync(prompt: str) -> str:
    client = _get_client()
    if client is None:
        raise RuntimeError("Gemini API key is not configured")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0.1,
            "top_p": 0.8,
            "max_output_tokens": 256,
            "response_mime_type": "text/plain",
        },
    )

    raw_text = getattr(response, "text", None) or ""
    if not raw_text and getattr(response, "candidates", None):
        candidate = response.candidates[0]
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        raw_text = "".join(getattr(part, "text", "") for part in parts)

    translated = raw_text.strip()
    if not translated:
        raise RuntimeError("Gemini returned an empty translation")

    return translated


def _call_gemini_chat_sync(prompt: str) -> Dict[str, str]:
    client = _get_client()
    if client is None:
        raise RuntimeError("Gemini API key is not configured")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0.4,
            "top_p": 0.9,
            "max_output_tokens": 512,
            "response_mime_type": "text/plain",
        },
    )

    raw_text = getattr(response, "text", None) or ""
    if not raw_text and getattr(response, "candidates", None):
        candidate = response.candidates[0]
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        raw_text = "".join(getattr(part, "text", "") for part in parts)

    reply = raw_text.strip()
    if not reply:
        raise RuntimeError("Gemini returned an empty chat response")

    return {
        "reply": reply,
        "model": GEMINI_MODEL,
    }


async def enhance_complaint_insights(
    complaint_text: str,
    department: str,
    priority: str,
) -> Dict[str, str]:
    """Generate a short summary, reasoning, and urgency explanation with Gemini."""

    payload_key = _cache_key(complaint_text, department, priority)
    cached = _get_cached(payload_key)
    if cached:
        return cached

    prompt = _build_prompt(complaint_text, department, priority)
    fallback = _fallback_payload(complaint_text, department, priority)

    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(_call_gemini_sync, prompt),
                timeout=GEMINI_TIMEOUT_SECONDS,
            )

            merged = {
                "summary": result.get("summary") or fallback["summary"],
                "reasoning": result.get("reasoning") or fallback["reasoning"],
                "urgency": result.get("urgency") or fallback["urgency"],
            }
            _set_cached(payload_key, merged)
            return merged
        except Exception as exc:  # pragma: no cover - fallback path is intentional
            logger.warning("Gemini attempt %s failed: %s", attempt + 1, exc)
            if attempt >= GEMINI_MAX_RETRIES:
                _set_cached(payload_key, fallback)
                return fallback


async def translate_complaint_to_english(
    complaint_text: str,
    source_language: str,
) -> str:
    if not complaint_text.strip() or source_language == "en":
        return complaint_text.strip()

    payload_key = _translation_cache_key(complaint_text, source_language)
    cached = _get_cached_translation(payload_key)
    if cached:
        return cached

    prompt = _build_translation_prompt(complaint_text, source_language)

    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            translated = await asyncio.wait_for(
                asyncio.to_thread(_call_gemini_translation_sync, prompt),
                timeout=GEMINI_TIMEOUT_SECONDS,
            )
            _set_cached_translation(payload_key, translated)
            return translated
        except Exception as exc:  # pragma: no cover - fallback path is intentional
            logger.warning("Gemini translation attempt %s failed: %s", attempt + 1, exc)
            if attempt >= GEMINI_MAX_RETRIES:
                _set_cached_translation(payload_key, complaint_text.strip())
                return complaint_text.strip()


async def chat_with_gemini(message: str, history: list[ChatMessage]) -> Dict[str, str]:
    prompt = _build_chat_prompt(message, history)

    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_call_gemini_chat_sync, prompt),
                timeout=GEMINI_TIMEOUT_SECONDS,
            )
        except Exception as exc:
            logger.warning("Gemini chat attempt %s failed: %s", attempt + 1, exc)
            if attempt >= GEMINI_MAX_RETRIES:
                raise RuntimeError("Unable to generate assistant reply right now") from exc


def build_fallback_insights(complaint_text: str, department: str, priority: str) -> Dict[str, str]:
    return _fallback_payload(complaint_text, department, priority)
