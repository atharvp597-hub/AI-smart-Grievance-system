"""
AI Service for complaint classification and routing.
Uses ML models for intelligent prediction.
"""
from typing import Dict
import logging
from .inference_service import get_inference_service

logger = logging.getLogger(__name__)


def classify(text: str) -> Dict:
    """
    Classify complaint to department using ML model.
    
    Args:
        text: Complaint description
        
    Returns:
        {
            "department": str,
            "confidence": float,
            "top_k": [(str, float), ...],
            "is_low_confidence": bool
        }
    """
    try:
        service = get_inference_service()
        result = service.predict(text)
        
        return {
            "department": result["department"],
            "confidence": result["department_confidence"],
            "top_k": result["department_top_k"],
            "is_low_confidence": result["is_low_confidence"]
        }
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {
            "department": "General",
            "confidence": 0.5,
            "top_k": [("General", 0.5)],
            "is_low_confidence": True
        }


def detect_priority(text: str) -> str:
    """
    Detect priority level from complaint.
    
    Args:
        text: Complaint description
        
    Returns:
        "LOW", "MEDIUM", or "HIGH"
    """
    try:
        service = get_inference_service()
        result = service.predict(text)
        return result["priority"]
    except Exception as e:
        logger.error(f"Priority detection error: {e}")
        return "MEDIUM"


def get_full_prediction(text: str) -> Dict:
    """
    Get complete AI prediction for a complaint.
    
    Args:
        text: Complaint description
        
    Returns:
        Complete prediction result with department, priority, confidence, 
        severity, and metadata
    """
    try:
        service = get_inference_service()
        return service.predict(text)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            "department": "General",
            "priority": "MEDIUM",
            "confidence": 0.5,
            "severity_score": 3,
            "severity_reasons": ["Error in prediction"],
            "is_low_confidence": True,
            "needs_manual_review": True
        }


def route_department(department: str) -> str:
    """
    Route department to contact email.
    
    Args:
        department: Department name
        
    Returns:
        Contact email for department
    """
    routes = {
        "Water": "water@gov.in",
        "Electricity": "electricity@gov.in",
        "Roads": "roads@gov.in",
        "Garbage": "sanitation@gov.in",
        "Drainage": "drainage@gov.in",
        "Sanitation": "sanitation@gov.in",
        "Transport": "transport@gov.in",
        "Street Light": "streetlight@gov.in",
        "Health": "health@gov.in",
        "Police": "police@gov.in",
        "General": "general@gov.in"
    }
    
    return routes.get(department, "general@gov.in")