import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import get_connection
from supplier import supplier_bp, initialize_supplier
from userConfiguration import user_configuration_bp, initialize_user_configuration
from parameter import parameter_bp, initialize_parameter

app = Flask(__name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

CORS(
    app,
    resources={r"/*": {
        "origins": ["http://localhost:4200", "http://127.0.0.1:4200"],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }},
)


def initialize_database():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin'
            )
        """)
        cursor.execute(
            "INSERT IGNORE INTO users (email, password, role) VALUES (%s, %s, %s)",
            ("admin@example.com", "password123", "admin"),
        )
    finally:
        cursor.close()
        conn.close()


initialize_database()
initialize_supplier()
initialize_user_configuration()
initialize_parameter()

app.register_blueprint(supplier_bp)
app.register_blueprint(user_configuration_bp)
app.register_blueprint(parameter_bp)


def create_access_token(email: str, role: str) -> str:
    payload = {
        "sub": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"detail": "Missing token"}), 401
        try:
            request.user = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"detail": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"detail": "Invalid token"}), 401
        return f(*args, **kwargs)
    return wrapper


@app.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        return jsonify({"detail": "Email and password are required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT email, role FROM users WHERE email = %s AND password = %s",
            (email, password),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({"detail": "Invalid email or password"}), 401

        token = create_access_token(user["email"], user["role"])
        return jsonify({
            "token": token,
            "user": {"email": user["email"], "role": user["role"]},
            "message": "Login successful",
        }), 200
    finally:
        cursor.close()
        conn.close()


@app.get("/")
def root():
    return jsonify({"message": "WMS Nexus Authentication API is running"})


@app.errorhandler(Exception)
def handle_error(e):
    code = getattr(e, "code", 500)
    app.logger.exception(e)
    return jsonify({
        "status": "error",
        "statusCode": code if isinstance(code, int) else 500,
        "statusMsg": str(e),
        "success": False,
    }), code if isinstance(code, int) else 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)