import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database.db import db
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.complaint import router as complaint_router
from routes.otp import router as otp_router
from routes.realtime import router as realtime_router
from services.inference_service import initialize_inference_service
from services.otp_service import ensure_otp_indexes

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    # Startup
    logger.info("Starting up AI Grievance System...")
    try:
        db.users.create_index("email", unique=True)
        db.complaints.create_index("complaint_id", unique=True)
        db.complaints.create_index("user_id")
        ensure_otp_indexes()  # P5 fix: create TTL indexes for OTP MongoDB collections
        initialize_inference_service()
        logger.info("✓ Inference service initialized")
    except Exception as e:
        logger.error(f"Startup error: {e}")

    yield  # application runs here

    # Shutdown
    logger.info("Shutting down AI Grievance System...")


app = FastAPI(
    title="AI Smart Grievance System",
    description="Intelligent complaint classification and management platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Fix: cannot use allow_origins=["*"] together with allow_credentials=True —
# browsers reject credentialed cross-origin requests to a wildcard origin.
# List the actual frontend origins explicitly instead.
import os

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(complaint_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(chat_router)
app.include_router(otp_router)
app.include_router(realtime_router)


# Home route
@app.get("/")
def home():
    return {
        "message": "AI Smart Grievance System is running",
        "docs": "/docs",
        "health": "/api/health"
    }
