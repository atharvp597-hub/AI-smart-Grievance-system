from fastapi import APIRouter, HTTPException, status

from models.chat_model import ChatRequest
from services.gemini_service import chat_with_gemini

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _handle_chat(payload: ChatRequest):
    try:
        reply = await chat_with_gemini(payload.message, payload.history)
        return {
            "success": True,
            "message": "Chat response generated successfully",
            "data": reply,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Chat assistant is temporarily unavailable: {exc}",
        ) from exc


@router.post("")
async def chat(payload: ChatRequest):
    return await _handle_chat(payload)


@router.post("/")
async def chat_with_trailing_slash(payload: ChatRequest):
    return await _handle_chat(payload)
