import re
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from database.db import db

from models.complaint_model import (
    ComplaintCreate,
    Feedback,
    ComplaintStatusUpdate
)

from services.preprocess import preprocess_pipeline

from services.ai_service import (
    get_full_prediction,
    route_department
)
from services.gemini_service import (
    build_fallback_insights,
    enhance_complaint_insights,
    translate_complaint_to_english,
)
from services.preprocess import clean_text
from services.auth_service import get_current_admin, get_current_user
from services.otp_service import consume_verified_email
from services.ws_manager import ws_manager

from utils.helpers import get_current_timestamp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["complaints"])
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads" / "complaints"
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


async def _save_complaint_image(image: UploadFile, complaint_id: str) -> dict[str, str]:
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint image is required",
        )

    content_type = (image.content_type or "").lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, or WEBP complaint images are allowed",
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded complaint image is empty",
        )

    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint image must be 5 MB or smaller",
        )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{complaint_id}-{uuid4().hex[:8]}{extension}"
    stored_path = UPLOADS_DIR / stored_filename
    stored_path.write_bytes(contents)

    return {
        "image_url": f"/uploads/complaints/{stored_filename}",
        "image_filename": image.filename,
        "image_content_type": content_type,
    }


def _build_location_payload(data: ComplaintCreate) -> dict | None:
    has_coordinates = data.latitude is not None or data.longitude is not None

    if not has_coordinates:
        return None

    if data.latitude is None or data.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both latitude and longitude are required when attaching location",
        )

    return {
        "latitude": data.latitude,
        "longitude": data.longitude,
        "accuracy": data.location_accuracy,
        "captured_at": data.location_captured_at,
    }


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate = Depends(ComplaintCreate.as_form),
    image: UploadFile = File(None),  # P4 fix: image is optional
    current_user: dict = Depends(get_current_user),
):
    try:
        submitted_name = data.name.strip()
        submitted_email = data.email.lower().strip()
        submitted_phone = data.phone.strip()
        description = data.description.strip()
        category = data.category.strip() if data.category and data.category.strip() else "General"

        if not consume_verified_email(submitted_email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify this email with OTP before submitting a complaint",
            )

        # Preprocess text and translate non-English complaints before classification.
        processed_text, language = preprocess_pipeline(description)
        original_language = language
        if original_language != "en":
            translated_text = await translate_complaint_to_english(description, original_language)
            processed_text = clean_text(translated_text)
            language = "en"
        
        # Get full AI prediction
        ai_prediction = get_full_prediction(processed_text)
        
        department = ai_prediction["department"]
        priority = ai_prediction["priority"]
        confidence = ai_prediction["confidence"]
        routed_to = route_department(department)

        gemini_insights = await enhance_complaint_insights(description, department, priority)
        if not gemini_insights:
            gemini_insights = build_fallback_insights(description, department, priority)

        complaint_id = f"CMP-{uuid4().hex[:10].upper()}"
        timestamp = get_current_timestamp()
        # P4 fix: only save image when one was actually uploaded
        image_meta = await _save_complaint_image(image, complaint_id) if (image and image.filename) else {}
        location = _build_location_payload(data)

        complaint_document = {
            "complaint_id": complaint_id,
            "user_id": current_user["_id"],
            "name": submitted_name,
            "email": submitted_email,
            "phone": submitted_phone,
            "category": category,
            "description": description,
            "original_text": description,
            "processed_text": processed_text,
            "image_url": image_meta.get("image_url"),
            "image_filename": image_meta.get("image_filename"),
            "image_content_type": image_meta.get("image_content_type"),
            "location": location,
            "language": language,
            "original_language": original_language,
            "department": department,
            "priority": priority,
            "confidence": round(confidence, 4),
            "department_confidence": round(ai_prediction["department_confidence"], 4),
            "priority_confidence": round(ai_prediction["priority_confidence"], 4),
            "severity_score": ai_prediction.get("severity_score", 0),
            "severity_reasons": ai_prediction.get("severity_reasons", []),
            "is_low_confidence": ai_prediction.get("is_low_confidence", False),
            "needs_manual_review": ai_prediction.get("needs_manual_review", False),
            "ai_summary": gemini_insights.get("summary", ""),
            "ai_reasoning": gemini_insights.get("reasoning", ""),
            "ai_urgency": gemini_insights.get("urgency", ""),
            "gemini_generated_at": timestamp,
            "requested_priority": data.requested_priority,
            "routed_to": routed_to,
            "status": "PENDING",
            "created_at": timestamp,
            "updated_at": timestamp
        }

        db.complaints.insert_one(complaint_document)
        await ws_manager.broadcast(
            "admin:analytics",
            {
                "type": "complaint_created",
                "complaint_id": complaint_id,
                "status": complaint_document["status"],
                "priority": priority,
                "department": department,
                "created_at": timestamp,
            },
        )

        return {
            "success": True,
            "message": "Complaint registered successfully",
            "data": {
                "complaint_id": complaint_id,
                "department": department,
                "priority": priority,
                "confidence": round(confidence, 4),
                "severity_score": ai_prediction.get("severity_score", 0),
                "status": "PENDING",
                "routed_to": routed_to,
                "image_url": image_meta.get("image_url"),
                "image_filename": image_meta.get("image_filename"),
                "location": location,
                "needs_manual_review": ai_prediction.get("needs_manual_review", False),
                "ai_summary": gemini_insights.get("summary", ""),
                "ai_reasoning": gemini_insights.get("reasoning", ""),
                "ai_urgency": gemini_insights.get("urgency", ""),
                "gemini_generated_at": timestamp,
            }
        }

    except PyMongoError as exc:
        logger.error(f"Database error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while registering complaint"
        ) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=jsonable_encoder(exc.errors()),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while registering complaint"
        ) from exc


# P6 fix: /my MUST be registered before /{complaint_id} to avoid being swallowed
@router.get("/complaints/my")
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    try:
        complaints = list(
            db.complaints.find({"user_id": current_user["_id"]}, {"_id": 0}).sort("created_at", -1)
        )
        return {"success": True, "data": complaints}
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while fetching complaints",
        ) from exc


@router.get("/complaints")
def get_all_complaints(
    _: dict = Depends(get_current_admin),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),  # P7 fix: pagination
):
    try:
        skip = (page - 1) * page_size
        total = db.complaints.count_documents({})
        complaints = list(
            db.complaints.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
        )

        return {
            "success": True,
            "data": complaints,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": -(-total // page_size),  # ceiling division
            },
        }
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while fetching complaints"
        ) from exc


# P6 fix: the original /my route here is now removed — moved above /{complaint_id}


@router.get("/complaints/{complaint_id}")
def get_complaint_by_id(complaint_id: str, current_user: dict = Depends(get_current_user)):
    complaint = db.complaints.find_one(
        {"complaint_id": complaint_id},
        {"_id": 0}
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    if current_user.get("role") != "admin" and complaint.get("user_id") != current_user.get("_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this complaint",
        )

    return {
        "success": True,
        "data": complaint
    }


@router.get("/complaints/priority/{level}")
def get_priority_complaints(level: str, _: dict = Depends(get_current_admin)):
    complaints = list(
        db.complaints.find(
            {"priority": level.upper()},
            {"_id": 0}
        )
    )

    return {
        "success": True,
        "data": complaints
    }


@router.get("/complaints/department/{department}")
def get_department_complaints(department: str, _: dict = Depends(get_current_admin)):
    complaints = list(
        db.complaints.find(
            {"department": department},
            {"_id": 0}
        )
    )

    return {
        "success": True,
        "data": complaints
    }


@router.put("/complaints/{complaint_id}/status")
async def update_status(
    complaint_id: str,
    data: ComplaintStatusUpdate,
    admin_user: dict = Depends(get_current_admin),
):
    try:
        updated_at = get_current_timestamp()
        result = db.complaints.update_one(
            {"complaint_id": complaint_id},
            {"$set": {
                "status": data.status,
                "updated_at": updated_at,
                "reviewed_by": {
                    "id": admin_user["_id"],
                    "name": admin_user["name"],
                    "email": admin_user["email"],
                },
            }}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Complaint not found"
            )

        updated = db.complaints.find_one({"complaint_id": complaint_id}, {"_id": 0})
        if updated:
            event = {
                "type": "complaint_status_updated",
                "complaint_id": complaint_id,
                "status": updated.get("status"),
                "updated_at": updated.get("updated_at"),
                "reviewed_by": updated.get("reviewed_by"),
            }
            await ws_manager.broadcast(f"complaint:{complaint_id}", event)
            if updated.get("user_id"):
                await ws_manager.broadcast(f"user:{updated['user_id']}", event)
            await ws_manager.broadcast("admin:analytics", event)

        return {
            "success": True,
            "message": "Status updated successfully",
            "data": {
                "complaint_id": complaint_id,
                "status": data.status,
                "updated_at": updated_at,
            }
        }
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while updating complaint"
        ) from exc


@router.post("/feedback")
def feedback(data: Feedback, current_user: dict = Depends(get_current_user)):
    db.feedback.insert_one({
        "text": data.text,
        "correct_department": data.correct_department,
        "complaint_id": data.complaint_id,
        "timestamp": get_current_timestamp(),
        "submitted_by": {
            "id": current_user.get("_id"),
            "name": current_user.get("name"),
            "email": current_user.get("email"),
        },
    })

    return {
        "success": True,
        "message": "Feedback stored successfully"
    }
@router.get("/stats")
def get_stats(_: dict = Depends(get_current_admin)):
    total_complaints = db.complaints.count_documents({})
    high_priority = db.complaints.count_documents({
        "priority": "HIGH"
    })
    medium_priority = db.complaints.count_documents({
        "priority": "MEDIUM"
    })
    low_priority = db.complaints.count_documents({
        "priority": "LOW"
    })

    return {
        "success": True,
        "data": {
            "total_complaints": total_complaints,
            "high_priority": high_priority,
            "medium_priority": medium_priority,
            "low_priority": low_priority
        }
    }

@router.get("/department-stats")
def department_stats(_: dict = Depends(get_current_admin)):
    # P8 fix: single $group aggregation instead of 11 separate count_documents calls
    pipeline = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
    ]
    rows = db.complaints.aggregate(pipeline)

    # Seed known departments with 0 so the response is always complete
    known_departments = [
        "Water", "Electricity", "Roads", "Garbage", "Drainage",
        "Sanitation", "Transport", "Street Light", "Health", "Police", "General",
    ]
    result = {dept: 0 for dept in known_departments}
    for row in rows:
        if row["_id"]:
            result[row["_id"]] = row["count"]

    return {
        "success": True,
        "data": result
    }


@router.get("/recent-complaints")
def recent_complaints(_: dict = Depends(get_current_admin)):
    complaints = list(
        db.complaints.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(5)
    )

    return {
        "success": True,
        "data": complaints
    }


@router.get("/complaints/{complaint_id}/summary")
def get_complaint_summary(complaint_id: str, _: dict = Depends(get_current_user)):
    """
    Generate AI summary of a complaint using extractive summarization.
    """
    try:
        complaint = db.complaints.find_one(
            {"complaint_id": complaint_id},
            {"_id": 0}
        )
        
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        description = complaint.get("description", "")
        summary = complaint.get("ai_summary") or description
        reasoning = complaint.get("ai_reasoning") or "This complaint was analyzed by the local ML pipeline."
        urgency = complaint.get("ai_urgency") or "This complaint should be reviewed based on local severity scoring."
        
        return {
            "success": True,
            "data": {
                "complaint_id": complaint_id,
                "original": description,
                "summary": summary,
                "reasoning": reasoning,
                "urgency": urgency,
                "department": complaint.get("department"),
                "priority": complaint.get("priority")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary")


@router.get("/search")
def search_complaints(
    keyword: str = Query(min_length=2, max_length=100),
    _: dict = Depends(get_current_admin),
):
    safe_keyword = re.escape(keyword)

    complaints = list(
        db.complaints.find(
            {
                "original_text": {
                    "$regex": safe_keyword,
                    "$options": "i"
                }
            },
            {"_id": 0}
        )
    )

    return {
        "success": True,
        "data": complaints
    }


@router.delete("/complaints/{complaint_id}")
def delete_complaint(complaint_id: str, _: dict = Depends(get_current_admin)):
    try:
        result = db.complaints.delete_one({
            "complaint_id": complaint_id
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Complaint not found"
            )

        return {
            "success": True,
            "message": "Complaint deleted successfully"
        }
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while deleting complaint"
        ) from exc


@router.get("/health")
def health_check():
    return {
        "success": True,
        "status": "healthy",
        "service": "AI Smart Grievance System",
        "version": "1.0.0",
    }
