from uuid import uuid4

from fastapi import APIRouter, HTTPException, status, Depends

from config import ADMIN_BOOTSTRAP_KEY
from database.db import db
from models.auth_model import (
    BootstrapAdminRequest,
    LoginRequest,
    RegisterRequest,
)
from services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from utils.helpers import get_current_timestamp

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register_user(payload: RegisterRequest):
    email = payload.email.lower().strip()

    if db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = f"USR-{uuid4().hex[:12].upper()}"
    now = get_current_timestamp()
    user_doc = {
        "_id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "phone": payload.phone,
        "role": "citizen",
        "password_hash": hash_password(payload.password),
        "created_at": now,
        "updated_at": now,
    }

    db.users.insert_one(user_doc)

    token = create_access_token(
        subject=user_id,
        role=user_doc["role"],
        email=user_doc["email"],
        name=user_doc["name"],
    )

    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": user_doc["name"],
                "email": user_doc["email"],
                "role": user_doc["role"],
                "phone": user_doc.get("phone"),
            },
        },
    }


@router.post("/login")
def login_user(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        subject=user["_id"],
        role=user["role"],
        email=user["email"],
        name=user["name"],
    )

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "phone": user.get("phone"),
            },
        },
    }


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": current_user["_id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "role": current_user["role"],
            "phone": current_user.get("phone"),
        },
    }


@router.post("/bootstrap-admin")
def bootstrap_admin(payload: BootstrapAdminRequest):
    if not ADMIN_BOOTSTRAP_KEY or payload.bootstrap_key != ADMIN_BOOTSTRAP_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid bootstrap key",
        )

    email = payload.email.lower().strip()

    existing = db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = f"ADM-{uuid4().hex[:12].upper()}"
    now = get_current_timestamp()
    user_doc = {
        "_id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "phone": payload.phone,
        "role": "admin",
        "password_hash": hash_password(payload.password),
        "created_at": now,
        "updated_at": now,
    }

    db.users.insert_one(user_doc)

    return {
        "success": True,
        "message": "Admin account created successfully",
        "data": {
            "id": user_id,
            "email": email,
            "role": "admin",
        },
    }
