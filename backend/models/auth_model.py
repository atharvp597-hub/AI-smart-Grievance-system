from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, constr


class RegisterRequest(BaseModel):
    name: constr(min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[constr(min_length=8, max_length=16)] = None
    password: constr(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Literal["citizen", "admin"]
    phone: Optional[str] = None


class BootstrapAdminRequest(BaseModel):
    name: constr(min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[constr(min_length=8, max_length=16)] = None
    password: constr(min_length=8, max_length=128)
    bootstrap_key: constr(min_length=1, max_length=200)
