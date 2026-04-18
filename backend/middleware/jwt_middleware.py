import jwt
import os
from functools import wraps
from flask import request, jsonify

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")


def jwt_required(f):
    """Decorator: blocks request if no valid JWT token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1].strip()

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.current_user = payload  # attach decoded payload to request
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please login again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please login again."}), 401

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator: blocks request if user role is not admin. Must be used after @jwt_required."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = getattr(request, "current_user", None)
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated