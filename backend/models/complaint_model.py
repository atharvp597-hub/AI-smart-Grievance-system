from typing import Optional, Literal, List

from fastapi import Form
from pydantic import BaseModel, EmailStr, Field, constr


class ComplaintLocation(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0)
    captured_at: Optional[str] = None


class ComplaintCreate(BaseModel):
    name: constr(min_length=2, max_length=100)
    email: EmailStr
    phone: constr(min_length=8, max_length=16)
    category: Optional[constr(min_length=2, max_length=60)] = None
    description: constr(min_length=10, max_length=4000)
    requested_priority: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_accuracy: Optional[float] = Field(default=None, ge=0)
    location_captured_at: Optional[str] = None

    @classmethod
    def as_form(
        cls,
        name: constr(min_length=2, max_length=100) = Form(...),
        email: EmailStr = Form(...),
        phone: constr(min_length=8, max_length=16) = Form(...),
        category: Optional[constr(min_length=2, max_length=60)] = Form(None),
        description: constr(min_length=10, max_length=4000) = Form(...),
        requested_priority: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = Form(None),
        latitude: Optional[float] = Form(None),
        longitude: Optional[float] = Form(None),
        location_accuracy: Optional[float] = Form(None),
        location_captured_at: Optional[str] = Form(None),
    ) -> "ComplaintCreate":
        return cls(
            name=name,
            email=email,
            phone=phone,
            category=category,
            description=description,
            requested_priority=requested_priority,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            location_captured_at=location_captured_at,
        )


class Feedback(BaseModel):
    text: constr(min_length=3, max_length=2000)
    correct_department: constr(min_length=2, max_length=50)
    complaint_id: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: Literal["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]

    @classmethod
    def as_form(
        cls,
        status: Literal["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"] = Form(...),
    ) -> "ComplaintStatusUpdate":
        return cls(status=status)


class ComplaintResponse(BaseModel):
    complaint_id: str
    name: str
    email: str
    phone: str
    description: str
    image_url: str
    image_filename: str
    location: Optional[ComplaintLocation] = None
    language: str
    department: str
    priority: str
    confidence: float
    severity_score: int
    severity_reasons: List[str]
    status: str
    created_at: str
    updated_at: str
    status_history: List[dict] = []
    is_low_confidence: bool = False
    needs_manual_review: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "complaint_id": "CMP-ABC1234567",
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+919876543210",
                "description": "No water supply since morning",
                "image_url": "/uploads/complaints/CMP-ABC1234567-issue.jpg",
                "image_filename": "issue.jpg",
                "location": {
                    "latitude": 28.6139,
                    "longitude": 77.2090,
                    "accuracy": 18.0,
                    "captured_at": "2024-05-11T10:29:00Z"
                },
                "language": "en",
                "department": "Water",
                "priority": "HIGH",
                "confidence": 0.95,
                "severity_score": 8,
                "severity_reasons": ["Critical service failure"],
                "status": "PENDING",
                "created_at": "2024-05-11T10:30:00Z",
                "updated_at": "2024-05-11T10:30:00Z",
                "status_history": [],
                "is_low_confidence": False,
                "needs_manual_review": False
            }
        }
