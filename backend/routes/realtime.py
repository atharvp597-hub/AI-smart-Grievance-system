from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from database.db import db
from services.auth_service import decode_access_token
from services.ws_manager import ws_manager

router = APIRouter(tags=["realtime"])


async def _authenticate_websocket(websocket: WebSocket):
    """
    P12 fix: authenticate via the first WebSocket message, NOT a URL query param.
    Client sends {"token": "<jwt>"} as its first text frame after connecting.
    This keeps the token out of server access logs and browser history.
    Falls back to query param with a deprecation warning for backwards compat.
    """
    import json as _json
    import logging as _logging
    _logger = _logging.getLogger(__name__)

    token = websocket.query_params.get("token")
    if token:
        _logger.warning(
            "WS client sent token via URL query param (deprecated). "
            "Update client to send token as first message frame."
        )
    else:
        try:
            raw = await websocket.receive_text()
            data = _json.loads(raw)
            token = data.get("token", "")
        except Exception:
            await websocket.close(code=4401)
            return None

    if not token:
        await websocket.close(code=4401)
        return None

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4401)
            return None

        user = db.users.find_one({"_id": user_id}, {"password_hash": 0})
        if not user:
            await websocket.close(code=4401)
            return None

        return user
    except Exception:
        await websocket.close(code=4401)
        return None


@router.websocket("/api/ws/users/me")
async def user_updates(websocket: WebSocket):
    user = await _authenticate_websocket(websocket)
    if user is None:
        return

    room = f"user:{user['_id']}"
    await ws_manager.connect(room, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(room, websocket)


@router.websocket("/api/ws/admin/analytics")
async def admin_analytics_updates(websocket: WebSocket):
    user = await _authenticate_websocket(websocket)
    if user is None:
        return

    if user.get("role") != "admin":
        await websocket.close(code=4403)
        return

    room = "admin:analytics"
    await ws_manager.connect(room, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(room, websocket)


@router.websocket("/api/ws/complaints/{complaint_id}")
async def complaint_updates(websocket: WebSocket, complaint_id: str):
    user = await _authenticate_websocket(websocket)
    if user is None:
        return

    complaint = db.complaints.find_one({"complaint_id": complaint_id}, {"_id": 0, "user_id": 1})
    if complaint is None:
        await websocket.close(code=4404)
        return

    is_admin = user.get("role") == "admin"
    is_owner = complaint.get("user_id") == user.get("_id")
    if not (is_admin or is_owner):
        await websocket.close(code=4403)
        return

    room = f"complaint:{complaint_id}"
    await ws_manager.connect(room, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(room, websocket)
