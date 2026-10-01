"""
ML Inference Service
Integrates trained models for complaint classification and priority detection.
"""
import sys
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Try to import ML models
ML_AVAILABLE = False
GrievanceInferenceAdapter = None
get_default_adapter = None

try:
    # Add project root to path so `ml` package can be imported (ml is sibling of backend)
    ML_DIR = Path(__file__).parent.parent.parent / "ml"
    PROJECT_ROOT = ML_DIR.parent
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    # Try importing ml package modules
    try:
        from ml.ai_core import GrievanceInferenceAdapter, get_default_adapter
        ML_AVAILABLE = True
        logger.info(f"ML module path: {ML_DIR}")
    except ImportError:
        # Fallback: try importing ai_core directly if ml dir was added
        try:
            if str(ML_DIR) not in sys.path:
                sys.path.insert(0, str(ML_DIR))
            from ai_core import GrievanceInferenceAdapter, get_default_adapter
            ML_AVAILABLE = True
            logger.info(f"ML module path: {ML_DIR} (direct)")
        except ImportError as e:
            raise
except ImportError as e:
    logger.warning(f"ML models not available - will use fallback classification: {e}")
    ML_AVAILABLE = False


class InferenceService:
    """Wrapper service for ML model inference with graceful fallback."""
    
    _instance = None
    _adapter = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._adapter = None
        self._load_models()
    
    def _load_models(self):
        """Load ML models at initialization."""
        if not ML_AVAILABLE:
            logger.warning("ML models not available - using fallback classification")
            return
        
        try:
            if get_default_adapter is None:
                logger.warning("ML adapter not imported - using fallback")
                return
                
            self._adapter = get_default_adapter()
            logger.info("✓ ML models loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            self._adapter = None
    
    def predict(self, text: str) -> Dict:
        """
        Predict department, priority, and severity for a complaint.
        
        Returns:
            {
                "department": str,
                "priority": str,
                "confidence": float,
                "department_confidence": float,
                "priority_confidence": float,
                "severity_score": int,
                "severity_reasons": [str],
                "is_low_confidence": bool,
                "needs_manual_review": bool,
                "department_top_k": [(str, float)],
                "priority_top_k": [(str, float)],
                "language": str
            }
        """
        if self._adapter is None:
            logger.debug("Using fallback classification")
            return self._fallback_predict(text)
        
        try:
            result = self._adapter.predict(text)
            return result
        except Exception as e:
            logger.error(f"Inference failed: {e}, using fallback")
            return self._fallback_predict(text)
    
    def _fallback_predict(self, text: str) -> Dict:
        """Fallback prediction when models are unavailable."""
        # Basic keyword-based fallback
        text_lower = text.lower()
        
        # Department detection
        departments = {
            "Water": ["water", "tap", "pipeline", "supply", "drainage", "sewage"],
            "Electricity": ["electricity", "power", "light", "transformer", "voltage"],
            "Roads": ["road", "pothole", "street", "pavement", "highway"],
            "Garbage": ["garbage", "trash", "waste", "rubbish", "litter"],
            "Drainage": ["drain", "sewer", "overflow", "blockage"],
            "Sanitation": ["dirty", "cleaning", "hygiene", "sanitation"],
            "Transport": ["bus", "auto", "transport", "vehicle", "public"],
            "Street Light": ["street light", "lamp", "lighting", "dark"],
            "Health": ["hospital", "doctor", "health", "medical", "clinic"],
            "Police": ["police", "crime", "theft", "safety", "law"],
        }
        
        department = "General"
        confidence = 0.50
        
        for dept, keywords in departments.items():
            if any(kw in text_lower for kw in keywords):
                department = dept
                confidence = 0.65
                break
        
        # Priority detection
        priority = "LOW"
        if any(w in text_lower for w in ["urgent", "emergency", "danger", "fire", "critical", "accident"]):
            priority = "HIGH"
        elif any(w in text_lower for w in ["problem", "issue", "not working", "broken", "damaged"]):
            priority = "MEDIUM"
        
        return {
            "department": department,
            "priority": priority,
            "confidence": round(confidence, 4),
            "department_confidence": round(confidence, 4),
            "priority_confidence": round(confidence, 4),
            "severity_score": 8 if priority == "HIGH" else 5 if priority == "MEDIUM" else 2,
            "severity_reasons": ["Using fallback classification"] if not ML_AVAILABLE else ["Low confidence - using keyword fallback"],
            "is_low_confidence": True,
            "needs_manual_review": not ML_AVAILABLE,
            "department_top_k": [(department, round(confidence, 4))],
            "priority_top_k": [(priority, round(confidence, 4))],
            "language": "en"
        }


# Global singleton instance
_inference_service: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    """Get or create the inference service singleton."""
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service


def initialize_inference_service():
    """Initialize inference service at application startup."""
    service = get_inference_service()
    return service
