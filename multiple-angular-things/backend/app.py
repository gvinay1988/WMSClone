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
from stateTax import state_tax_bp, initialize_state_tax
from stateMaster import state_master_bp, initialize_state_master
from product import product_master_bp, initialize_product_master
from productBySupplier import product_by_supplier_bp, initialize_product_by_supplier
from vehicle import vehicle_master_bp, initialize_vehicle_master
from transporter import transporter_master_bp, initialize_transporter_master
from productCategoryGroup import (
    product_category_group_bp,
    initialize_product_category_group,
)

app = Flask(__name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

CORS(
    app,
    resources={r"/*": {
        "origins": [
            r"http://localhost:\d+",
            r"http://127\.0\.0\.1:\d+"
        ],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }},
    supports_credentials=False
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
initialize_state_tax()
initialize_state_master()
initialize_product_master()
initialize_product_by_supplier()
initialize_vehicle_master()
initialize_transporter_master()
initialize_product_category_group()

app.register_blueprint(supplier_bp)
app.register_blueprint(user_configuration_bp)
app.register_blueprint(parameter_bp)
app.register_blueprint(state_tax_bp)
app.register_blueprint(state_master_bp)
app.register_blueprint(product_master_bp)
app.register_blueprint(product_by_supplier_bp)
app.register_blueprint(vehicle_master_bp)
app.register_blueprint(transporter_master_bp)
app.register_blueprint(product_category_group_bp)


def create_access_token(subject: str, role: str) -> str:
    payload = {
        "sub": subject,
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
    user_id = (payload.get("userID") or "").strip()
    password = payload.get("password")

    if not user_id or not password:
        return jsonify({"detail": "User ID and password are required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT userID, userIDName, email, password, rolesList, status
            FROM user_configurations
            WHERE userID = %s
            """,
            (user_id,),
        )
        user = cursor.fetchone()

        if user:
            if user["password"] != password:
                return jsonify({"detail": "Invalid User ID or password"}), 401
            if (user.get("status") or "Active").strip().lower() != "active":
                return jsonify({"detail": "This user account is inactive"}), 403

            role = user.get("rolesList") or "user"
            token = create_access_token(user["userID"], role)
            return jsonify({
                "token": token,
                "user": {
                    "userID": user["userID"],
                    "userIDName": user["userIDName"],
                    "email": user["email"],
                    "role": role,
                },
                "message": "Login successful",
            }), 200

        # Keep the seeded administrator login working for existing deployments.
        cursor.execute(
            "SELECT email, role FROM users WHERE email = %s AND password = %s",
            (user_id, password),
        )
        admin = cursor.fetchone()
        if not admin:
            return jsonify({"detail": "Invalid User ID or password"}), 401

        token = create_access_token(admin["email"], admin["role"])
        return jsonify({
            "token": token,
            "user": {
                "userID": admin["email"],
                "userIDName": admin["email"],
                "email": admin["email"],
                "role": admin["role"],
            },
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