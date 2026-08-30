import os
from datetime import datetime, timedelta, timezone

import jwt
import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS

# ============================================================
# IMPORT SUPPLIER
# ============================================================

from supplier import (
    supplier_bp,
    initialize_supplier
)

# ============================================================
# IMPORT USER CONFIGURATION
# ============================================================

from userConfiguration import (
    user_configuration_bp,
    initialize_user_configuration
)


# ============================================================
# CREATE FLASK APP
# ============================================================

app = Flask(__name__)


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "dev-secret-key"
)

ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_EXPIRE_MINUTES",
        "60"
    )
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

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


# ============================================================
# MYSQL DATABASE CONNECTION
# ============================================================

def get_connection():

    conn = mysql.connector.connect(

        host=os.getenv(
            "MYSQL_HOST",
            "127.0.0.1"
        ),

        port=int(
            os.getenv(
                "MYSQL_PORT",
                "3306"
            )
        ),

        user=os.getenv(
            "MYSQL_USER",
            "root"
        ),

        password=os.getenv(
            "MYSQL_PASSWORD",
            "gvinay123"
        ),

        database=os.getenv(
            "MYSQL_DATABASE",
            "employee_db"
        ),

        autocommit=True
    )

    return conn


# ============================================================
# INITIALIZE USERS TABLE
# ============================================================

def initialize_database():

    conn = get_connection()

    cursor = None

    try:

        cursor = conn.cursor()

        # ----------------------------------------------------
        # CREATE USERS TABLE
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # CREATE DEFAULT ADMIN USER
        # ----------------------------------------------------

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

        print("Users table initialized successfully.")

    finally:

        if cursor:
            cursor.close()

        conn.close()


# ============================================================
# INITIALIZE DATABASE TABLES
# ============================================================

print("Initializing database tables...")

# Users table
initialize_database()

# Supplier table
initialize_supplier()

# User Configuration table
initialize_user_configuration()

print("All database tables initialized successfully.")


# ============================================================
# REGISTER BLUEPRINTS
# ============================================================

# ------------------------------------------------------------
# Supplier APIs
# ------------------------------------------------------------

app.register_blueprint(supplier_bp)


# ------------------------------------------------------------
# User Configuration APIs
# ------------------------------------------------------------

app.register_blueprint(user_configuration_bp)


# ============================================================
# CREATE JWT ACCESS TOKEN
# ============================================================

def create_access_token(
    email: str,
    role: str
) -> str:

    payload = {

        "sub": email,

        "role": role,

        "exp": (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# ============================================================
# LOGIN API
# ============================================================

@app.post("/auth/login")
def login():

    # --------------------------------------------------------
    # GET REQUEST BODY
    # --------------------------------------------------------

    payload = request.get_json(
        silent=True
    ) or {}

    email = payload.get("email")
    password = payload.get("password")

    # --------------------------------------------------------
    # VALIDATE INPUT
    # --------------------------------------------------------

    if not email or not password:

        return jsonify({
            "detail": "Email and password are required"
        }), 400

    # --------------------------------------------------------
    # DATABASE CONNECTION
    # --------------------------------------------------------

    conn = get_connection()

    cursor = None

    try:

        cursor = conn.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # CHECK EMAIL AND PASSWORD
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # INVALID LOGIN
        # ----------------------------------------------------

        if not user:

            return jsonify({
                "detail": "Invalid email or password"
            }), 401

        # ----------------------------------------------------
        # CREATE JWT TOKEN
        # ----------------------------------------------------

        token = create_access_token(
            user["email"],
            user["role"]
        )

        # ----------------------------------------------------
        # LOGIN SUCCESS RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "token": token,

            "user": {
                "email": user["email"],
                "role": user["role"]
            },

            "message": "Login successful"

        }), 200

    finally:

        if cursor:
            cursor.close()

        conn.close()


# ============================================================
# ROOT API
# ============================================================

@app.get("/")
def root():

    return jsonify({
        "message": "WMS Nexus Authentication API is running"
    })


# ============================================================
# START FLASK SERVER
# ============================================================

if __name__ == "__main__":

    print("")
    print("============================================================")
    print(" WMS Nexus Flask Backend")
    print("============================================================")
    print(" Server: http://127.0.0.1:8000")
    print(" Login : POST /auth/login")
    print("============================================================")
    print("")

    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True
    )