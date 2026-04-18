import random
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from config.db_connection import get_db
from models.user_model import UserRegister, UserLogin
from pydantic import ValidationError

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
JWT_EXPIRY  = int(os.environ.get("JWT_EXPIRY_MINUTES", 60))


def _make_token(user_doc: dict) -> str:
    payload = {
        "sub": user_doc["user_code"],
        "username": user_doc["username"],
        "role": user_doc["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


class AuthService:

    @staticmethod
    def _collection():
        return get_db()["users"]

    @staticmethod
    def _generate_user_code() -> str:
        col = AuthService._collection()
        while True:
            code = "U" + str(random.randint(10000, 99999))
            if not col.find_one({"user_code": code}):
                return code

    @staticmethod
    def _serialize(user: dict) -> dict:
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user

    @staticmethod
    def register(data: dict) -> dict:
        try:
            validated = UserRegister(**data)
        except ValidationError as e:
            errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            raise ValueError("; ".join(errors))

        col = AuthService._collection()
        if col.find_one({"username": validated.username}):
            raise ValueError("Username already taken")
        if col.find_one({"email": validated.email}):
            raise ValueError("Email already registered")

        hashed = bcrypt.hashpw(validated.password.encode(), bcrypt.gensalt()).decode()
        doc = {
            "user_code": AuthService._generate_user_code(),
            "username": validated.username,
            "email": validated.email,
            "password_hash": hashed,
            "role": validated.role,
        }
        col.insert_one(doc)
        serialized = AuthService._serialize(doc.copy())
        serialized["token"] = _make_token(serialized)   # ← JWT attached
        return serialized

    @staticmethod
    def login(data: dict) -> dict:
        try:
            validated = UserLogin(**data)
        except ValidationError as e:
            errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            raise ValueError("; ".join(errors))

        col = AuthService._collection()
        identifier = validated.username_or_email
        user = col.find_one({
            "$or": [{"username": identifier}, {"email": identifier}]
        })

        if not user:
            raise ValueError("No account found with that username or email")
        if not bcrypt.checkpw(validated.password.encode(), user["password_hash"].encode()):
            raise ValueError("Incorrect password")

        serialized = AuthService._serialize(user.copy())
        serialized["token"] = _make_token(serialized)   # ← JWT attached
        return serialized

    @staticmethod
    def get_all_users() -> list:
        col = AuthService._collection()
        users = list(col.find())
        return [AuthService._serialize(u) for u in users]