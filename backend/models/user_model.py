from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional
import re


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, description="Unique username")
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password min 6 chars")
    role: Optional[str] = Field(default="user", description="Role: 'admin' or 'user'")

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must be alphanumeric (letters, numbers, underscores only)")
        return v.lower()

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: Optional[str]) -> str:
        allowed = {"admin", "user"}
        if v and v.lower() not in allowed:
            raise ValueError(f"Role must be one of: {allowed}")
        return (v or "user").lower()


class UserLogin(BaseModel):
    username_or_email: str = Field(..., min_length=2, description="Username or email")
    password: str = Field(..., min_length=1, description="Password")

    @field_validator("username_or_email")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    user_code: str
    username: str
    email: str
    role: str
