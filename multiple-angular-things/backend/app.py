import os
from datetime import datetime, timedelta, timezone

import jwt
import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS

from supplier import supplier_bp, initialize_supplier


app = Flask(__name__)

app.register_blueprint(supplier_bp)

print("REGISTERED ROUTES:")
print(app.url_map)


# =========================================================
# CORS
# =========================================================

CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:4200",
                "http://127.0.0.1:4200"
            ],
            "methods": [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            ],
            "allow_headers": [
                "Content-Type",
                "Authorization"
            ]
        }
    }
)


# =========================================================
# REGISTER SUPPLIER BLUEPRINT
# =========================================================



 

# =========================================================
# JWT CONFIGURATION
# =========================================================

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "60")
)


# =========================================================
# MYSQL CONNECTION
# =========================================================

def get_connection():

    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=True
    )

    return conn


# =========================================================
# CREATE USERS TABLE
# =========================================================

def initialize_database():

    conn = get_connection()

    try:

        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin'
            )
            """
        )

        cursor.execute(
            """
            INSERT IGNORE INTO users
            (email, password, role)
            VALUES (%s, %s, %s)
            """,
            (
                "admin@example.com",
                "password123",
                "admin"
            )
        )

        conn.commit()

        cursor.close()

    finally:

        conn.close()


# =========================================================
# INITIALIZE DATABASE TABLES
# =========================================================

initialize_database()
initialize_supplier()


# =========================================================
# CREATE JWT TOKEN
# =========================================================

def create_access_token(email: str, role: str) -> str:

    payload = {

        "sub": email,

        "role": role,

        "exp": datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# =========================================================
# LOGIN API
# =========================================================

@app.post("/auth/login")
def login():

    payload = request.get_json(silent=True) or {}

    email = payload.get("email")
    password = payload.get("password")

    # -----------------------------------------------------
    # Validate request
    # -----------------------------------------------------

    if not email or not password:

        return jsonify({
            "detail": "Email and password are required"
        }), 400


    # -----------------------------------------------------
    # Connect to MySQL
    # -----------------------------------------------------

    conn = get_connection()

    try:

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT email, role
            FROM users
            WHERE email = %s
            AND password = %s
            """,
            (
                email,
                password
            )
        )

        user = cursor.fetchone()


        # -------------------------------------------------
        # Invalid login
        # -------------------------------------------------

        if not user:

            return jsonify({
                "detail": "Invalid email or password"
            }), 401


        # -------------------------------------------------
        # Generate JWT
        # -------------------------------------------------

        token = create_access_token(
            user["email"],
            user["role"]
        )


        # -------------------------------------------------
        # Login response
        # -------------------------------------------------

        return jsonify({

            "token": token,

            "user": {
                "email": user["email"],
                "role": user["role"]
            },

            "message": "Login successful"

        }), 200

    finally:

        cursor.close()
        conn.close()


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return jsonify({
        "message": "WMS Nexus Authentication API is running"
    })


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1", 
        port=8000,
        debug=True
    )