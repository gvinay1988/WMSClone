import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, jsonify, request


# ============================================================
# USER CONFIGURATION BLUEPRINT
# ============================================================

user_configuration_bp = Blueprint(
    "user_configuration",
    __name__
)


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


# ============================================================
# MYSQL DATABASE CONNECTION
# ============================================================

def get_connection():

    return mysql.connector.connect(
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


# ============================================================
# GET CURRENT USER FROM JWT TOKEN
# ============================================================

def get_current_user() -> str:

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    # Check Authorization header
    if not authorization.startswith("Bearer "):

        raise ValueError(
            "Missing bearer token"
        )

    # Extract token
    token = authorization.split(
        " ",
        1
    )[1].strip()

    if not token:

        raise ValueError(
            "Missing bearer token"
        )

    try:

        payload: dict[str, Any] = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload.get(
            "sub",
            ""
        )

    except jwt.ExpiredSignatureError:

        raise ValueError(
            "Token expired"
        )

    except jwt.PyJWTError:

        raise ValueError(
            "Invalid token"
        )


# ============================================================
# CREATE USER CONFIGURATION TABLE
# ============================================================

def initialize_user_configuration_table():

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_configurations (

                id CHAR(36) PRIMARY KEY,

                firstName VARCHAR(100) NOT NULL,

                lastName VARCHAR(100) NOT NULL,

                userID VARCHAR(100) NOT NULL UNIQUE,

                userIDName VARCHAR(255) NOT NULL,

                password VARCHAR(255),

                rolesList VARCHAR(100),

                businessUnit VARCHAR(255),

                usersCreationLimit INT,

                concurrentLogins INT,

                address VARCHAR(500),

                country VARCHAR(100),

                state VARCHAR(100),

                city VARCHAR(100),

                email VARCHAR(255) NOT NULL,

                phoneNumber VARCHAR(50),

                pin VARCHAR(20),

                status VARCHAR(50),

                createdBy VARCHAR(255),

                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )

        conn.commit()

        print(
            "user_configurations table initialized successfully"
        )

    except Exception as exc:

        print(
            "Error creating user_configurations table:",
            exc
        )

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


# ============================================================
# INITIALIZATION FUNCTION
# ============================================================

def initialize_user_configuration():

    initialize_user_configuration_table()


# ============================================================
# SAVE / UPDATE USER CONFIGURATION
# ============================================================

@user_configuration_bp.route(
    "/userConfiguration/services/saveorUpdateUserConfiguration",
    methods=["POST", "OPTIONS"]
)
def save_or_update_user_configuration():

    # Handle CORS preflight request
    if request.method == "OPTIONS":
        return "", 200

    # Validate JWT token
    try:

        get_current_user()

    except ValueError as exc:

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401

    # Get request body
    payload = request.get_json(
        silent=True
    )

    if not payload:

        return jsonify({
            "success": False,
            "detail": "Request body is required"
        }), 400

    # ========================================================
    # REQUIRED FIELDS
    # ========================================================

    first_name = payload.get(
        "firstName"
    )

    last_name = payload.get(
        "lastName"
    )

    user_id = payload.get(
        "userID"
    )

    user_id_name = payload.get(
        "userIDName"
    )

    email = payload.get(
        "email"
    )

    # Validate firstName
    if not first_name:

        return jsonify({
            "success": False,
            "detail": "firstName is required"
        }), 400

    # Validate lastName
    if not last_name:

        return jsonify({
            "success": False,
            "detail": "lastName is required"
        }), 400

    # Validate userID
    if not user_id:

        return jsonify({
            "success": False,
            "detail": "userID is required"
        }), 400

    # Validate userIDName
    if not user_id_name:

        return jsonify({
            "success": False,
            "detail": "userIDName is required"
        }), 400

    # Validate email
    if not email:

        return jsonify({
            "success": False,
            "detail": "email is required"
        }), 400

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # CHECK WHETHER USER ALREADY EXISTS
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM user_configurations
            WHERE userID = %s
            """,
            (
                user_id,
            )
        )

        existing_user = cursor.fetchone()

        # ====================================================
        # UPDATE EXISTING USER
        # ====================================================

        if existing_user:

            user_configuration_id = existing_user["id"]

            cursor.execute(
                """
                UPDATE user_configurations

                SET

                    firstName = %s,

                    lastName = %s,

                    userIDName = %s,

                    password = %s,

                    rolesList = %s,

                    businessUnit = %s,

                    usersCreationLimit = %s,

                    concurrentLogins = %s,

                    address = %s,

                    country = %s,

                    state = %s,

                    city = %s,

                    email = %s,

                    phoneNumber = %s,

                    pin = %s,

                    status = %s,

                    updatedAt = CURRENT_TIMESTAMP

                WHERE id = %s
                """,
                (

                    first_name,

                    last_name,

                    user_id_name,

                    payload.get("password"),

                    payload.get("rolesList"),

                    payload.get("businessUnit"),

                    payload.get("usersCreationLimit"),

                    payload.get("concurrentLogins"),

                    payload.get("address"),

                    payload.get("country"),

                    payload.get("state"),

                    payload.get("city"),

                    email,

                    payload.get("phoneNumber"),

                    payload.get("pin"),

                    payload.get("status"),

                    user_configuration_id
                )
            )

            conn.commit()

            return jsonify({

                "success": True,

                "message":
                    "User configuration updated successfully",

                "operation": "UPDATE",

                "userConfiguration": {

                    "id":
                        user_configuration_id,

                    "userID":
                        user_id,

                    "firstName":
                        first_name,

                    "lastName":
                        last_name,

                    "email":
                        email
                }

            }), 200

        # ====================================================
        # CREATE NEW USER
        # ====================================================

        user_configuration_id = str(
            uuid.uuid4()
        )

        cursor.execute(
            """
            INSERT INTO user_configurations (

                id,

                firstName,

                lastName,

                userID,

                userIDName,

                password,

                rolesList,

                businessUnit,

                usersCreationLimit,

                concurrentLogins,

                address,

                country,

                state,

                city,

                email,

                phoneNumber,

                pin,

                status,

                createdBy

            )

            VALUES (

                %s, %s, %s, %s, %s,

                %s, %s, %s, %s, %s,

                %s, %s, %s, %s, %s,

                %s, %s, %s, %s

            )
            """,
            (

                user_configuration_id,

                first_name,

                last_name,

                user_id,

                user_id_name,

                payload.get("password"),

                payload.get("rolesList"),

                payload.get("businessUnit"),

                payload.get("usersCreationLimit"),

                payload.get("concurrentLogins"),

                payload.get("address"),

                payload.get("country"),

                payload.get("state"),

                payload.get("city"),

                email,

                payload.get("phoneNumber"),

                payload.get("pin"),

                payload.get("status"),

                payload.get("createdBy")
            )
        )

        conn.commit()

        return jsonify({

            "success": True,

            "message":
                "User configuration created successfully",

            "operation": "CREATE",

            "userConfiguration": {

                "id":
                    user_configuration_id,

                "userID":
                    user_id,

                "firstName":
                    first_name,

                "lastName":
                    last_name,

                "email":
                    email
            }

        }), 201

    # ========================================================
    # MYSQL ERROR
    # ========================================================

    except mysql.connector.Error as exc:

        if conn:
            conn.rollback()

        return jsonify({

            "success": False,

            "detail": str(exc)

        }), 500

    # ========================================================
    # GENERAL ERROR
    # ========================================================

    except Exception as exc:

        if conn:
            conn.rollback()

        return jsonify({

            "success": False,

            "detail": str(exc)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


# ============================================================
# FETCH ALL USER CONFIGURATIONS
# ============================================================

@user_configuration_bp.route(
    "/userConfiguration/services/fetchAllUserConfigurations",
    methods=["POST", "OPTIONS"]
)
def fetch_all_user_configurations():

    # Handle CORS preflight request
    if request.method == "OPTIONS":
        return "", 200

    # Validate JWT token
    try:

        get_current_user()

    except ValueError as exc:

        return jsonify({

            "statusCode": 401,

            "statusMsg": str(exc),

            "userConfigurationList": []

        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # Fetch all records
        cursor.execute(
            """
            SELECT

                id,

                firstName,

                lastName,

                userID,

                userIDName,

                rolesList,

                businessUnit,

                usersCreationLimit,

                concurrentLogins,

                address,

                country,

                state,

                city,

                email,

                phoneNumber,

                pin,

                status,

                createdBy,

                createdAt,

                updatedAt

            FROM user_configurations

            ORDER BY createdAt DESC
            """
        )

        user_configurations = cursor.fetchall()

        return jsonify({

            "statusCode": 200,

            "statusMsg":
                "User configurations fetched successfully",

            "userConfigurationList":
                user_configurations

        }), 200

    # ========================================================
    # MYSQL ERROR
    # ========================================================

    except mysql.connector.Error as exc:

        return jsonify({

            "statusCode": 500,

            "statusMsg": str(exc),

            "userConfigurationList": []

        }), 500

    # ========================================================
    # GENERAL ERROR
    # ========================================================

    except Exception as exc:

        return jsonify({

            "statusCode": 500,

            "statusMsg": str(exc),

            "userConfigurationList": []

        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================
# Your app.py may currently import:
#
# from userConfiguration import initialize_userConfiguration
#
# Therefore keep this alias.

initialize_userConfiguration = initialize_user_configuration