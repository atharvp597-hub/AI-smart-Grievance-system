from collections import defaultdict
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pymongo.errors import PyMongoError

from database.db import db
from models.complaint_model import ComplaintStatusUpdate
from services.auth_service import get_current_admin
from services.ws_manager import ws_manager
from utils.helpers import get_current_timestamp

router = APIRouter(prefix="/api/admin", tags=["admin"])
STATUS_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads" / "status-updates"
MAX_STATUS_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_STATUS_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


async def _save_status_update_image(image: UploadFile, complaint_id: str) -> dict[str, str]:
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A status update image is required",
        )

    content_type = (image.content_type or "").lower()
    extension = ALLOWED_STATUS_IMAGE_TYPES.get(content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, or WEBP status update images are allowed",
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded status update image is empty",
        )

    if len(contents) > MAX_STATUS_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status update image must be 5 MB or smaller",
        )

    STATUS_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{complaint_id}-{uuid4().hex[:8]}{extension}"
    stored_path = STATUS_UPLOADS_DIR / stored_filename
    stored_path.write_bytes(contents)

    return {
        "image_url": f"/uploads/status-updates/{stored_filename}",
        "image_filename": image.filename,
        "image_content_type": content_type,
    }


@router.get("/complaints")
def list_complaints(
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    department: str | None = Query(default=None),
    category: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority.upper()
    if department:
        query["department"] = department
    if category:
        query["category"] = category

    complaints = list(db.complaints.find(query, {"_id": 0}).sort("created_at", -1))
    complaint_ids = [complaint.get("complaint_id") for complaint in complaints if complaint.get("complaint_id")]

    feedback_by_complaint: dict[str, list[dict]] = defaultdict(list)
    if complaint_ids:
        feedback_items = list(
            db.feedback.find(
                {"complaint_id": {"$in": complaint_ids}},
                {"_id": 0},
            ).sort("timestamp", -1)
        )
        for item in feedback_items:
            complaint_id = item.get("complaint_id")
            if complaint_id:
                feedback_by_complaint[complaint_id].append(item)

    for complaint in complaints:
        feedback_items = feedback_by_complaint.get(complaint.get("complaint_id"), [])
        complaint["feedback_items"] = feedback_items
        complaint["feedback_count"] = len(feedback_items)

    return {"success": True, "data": complaints}


@router.put("/complaints/{complaint_id}/status")
async def review_complaint(
    complaint_id: str,
    payload: ComplaintStatusUpdate = Depends(ComplaintStatusUpdate.as_form),
    image: UploadFile = File(...),
    admin_user: dict = Depends(get_current_admin),
):
    try:
        updated_at = get_current_timestamp()
        image_meta = await _save_status_update_image(image, complaint_id)
        history_entry = {
            "status": payload.status,
            "updated_at": updated_at,
            "image_url": image_meta["image_url"],
            "image_filename": image_meta["image_filename"],
            "image_content_type": image_meta["image_content_type"],
            "reviewed_by": {
                "id": admin_user["_id"],
                "name": admin_user["name"],
                "email": admin_user["email"],
            },
        }
        result = db.complaints.update_one(
            {"complaint_id": complaint_id},
            {
                "$set": {
                    "status": payload.status,
                    "updated_at": updated_at,
                    "reviewed_by": history_entry["reviewed_by"],
                    "latest_status_image_url": image_meta["image_url"],
                    "latest_status_image_filename": image_meta["image_filename"],
                },
                "$push": {
                    "status_history": {
                        "$each": [history_entry],
                        "$position": 0,
                    },
                },
            },
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Complaint not found",
            )

        updated = db.complaints.find_one({"complaint_id": complaint_id}, {"_id": 0})
        if updated:
            event = {
                "type": "complaint_status_updated",
                "complaint_id": complaint_id,
                "status": updated.get("status"),
                "updated_at": updated.get("updated_at"),
                "reviewed_by": updated.get("reviewed_by"),
                "status_image_url": image_meta["image_url"],
                "status_image_filename": image_meta["image_filename"],
            }
            await ws_manager.broadcast(f"complaint:{complaint_id}", event)
            user_id = updated.get("user_id")
            if user_id:
                await ws_manager.broadcast(f"user:{user_id}", event)
            await ws_manager.broadcast("admin:analytics", event)

        return {
            "success": True,
            "message": "Complaint status updated",
            "data": {
                "complaint_id": complaint_id,
                "status": payload.status,
                "updated_at": updated_at,
                "status_image_url": image_meta["image_url"],
                "status_image_filename": image_meta["image_filename"],
                "reviewed_by": history_entry["reviewed_by"],
            },
        }
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while updating complaint",
        ) from exc
