import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, jsonify, request

user_configuration_bp = Blueprint("user_configuration", __name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

REQUIRED_FIELDS = ["firstName", "lastName", "userID", "userIDName", "email"]


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=True,
    )


def get_current_user() -> str:
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        raise ValueError("Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise ValueError("Missing bearer token")

    try:
        payload: dict[str, Any] = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload.get("sub", "")
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.PyJWTError:
        raise ValueError("Invalid token")


def respond(status_code: int, status_msg: str, **extra):
    body = {
        "statusCode": status_code,
        "statusMsg": status_msg,
        "success": status_code < 400,
        **extra,
    }
    if status_code >= 400:
        body["detail"] = status_msg
    return jsonify(body), status_code


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
                userImage LONGTEXT NULL,
                createdBy VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_configurations'
              AND COLUMN_NAME = 'userImage'
            """
        )

        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                ALTER TABLE user_configurations
                ADD COLUMN userImage LONGTEXT NULL AFTER status
                """
            )

        conn.commit()
        print("user_configurations table initialized successfully")

    except Exception as exc:
        print("Error creating user_configurations table:", exc)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def initialize_user_configuration():
    initialize_user_configuration_table()


@user_configuration_bp.route(
    "/userConfiguration/services/saveorUpdateUserConfiguration",
    methods=["POST", "OPTIONS"],
)
def save_or_update_user_configuration():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc))

    payload = request.get_json(silent=True)

    if not payload:
        return respond(400, "Request body is required")

    for field in REQUIRED_FIELDS:
        if not payload.get(field):
            return respond(400, f"{field} is required")

    first_name = payload["firstName"]
    last_name = payload["lastName"]
    user_id = payload["userID"]
    user_id_name = payload["userIDName"]
    email = payload["email"]
    user_image = payload.get("userImage") or None

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM user_configurations WHERE userID = %s",
            (user_id,),
        )
        existing_user = cursor.fetchone()

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
                    userImage = %s,
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
                    user_image,
                    user_configuration_id,
                ),
            )
            conn.commit()

            return respond(
                200,
                "User configuration updated successfully",
                operation="UPDATE",
                message="User configuration updated successfully",
                userConfiguration={
                    "id": user_configuration_id,
                    "userID": user_id,
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": email,
                },
            )

        user_configuration_id = str(uuid.uuid4())

        cursor.execute(
            """
            INSERT INTO user_configurations (
                id, firstName, lastName, userID, userIDName,
                password, rolesList, businessUnit, usersCreationLimit,
                concurrentLogins, address, country, state, city,
                email, phoneNumber, pin, status, userImage, createdBy
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
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
                user_image,
                payload.get("createdBy"),
            ),
        )
        conn.commit()

        return respond(
            201,
            "User configuration created successfully",
            operation="CREATE",
            message="User configuration created successfully",
            userConfiguration={
                "id": user_configuration_id,
                "userID": user_id,
                "firstName": first_name,
                "lastName": last_name,
                "email": email,
            },
        )

    except mysql.connector.Error as exc:
        if conn:
            conn.rollback()
        return respond(500, str(exc))

    except Exception as exc:
        if conn:
            conn.rollback()
        return respond(500, str(exc))

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_configuration_bp.route(
    "/userConfiguration/services/fetchAllUserConfigurations",
    methods=["POST", "OPTIONS"],
)
def fetch_all_user_configurations():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc), userConfigurationList=[])

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id, firstName, lastName, userID, userIDName,
                rolesList, businessUnit, usersCreationLimit,
                concurrentLogins, address, country, state, city,
                email, phoneNumber, pin, status, userImage,
                createdBy, createdAt, updatedAt
            FROM user_configurations
            ORDER BY createdAt DESC
            """
        )

        return respond(
            200,
            "User configurations fetched successfully",
            userConfigurationList=cursor.fetchall(),
        )

    except mysql.connector.Error as exc:
        return respond(
            500,
            "Database error while fetching user configurations",
            userConfigurationList=[],
            error=str(exc),
        )

    except Exception as exc:
        return respond(
            500,
            "Error while fetching user configurations",
            userConfigurationList=[],
            error=str(exc),
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ============================
# DELETE USER CONFIGURATION
# ============================

@user_configuration_bp.route(
    "/userConfiguration/services/deleteUserConfiguration",
    methods=["POST", "OPTIONS"],
)
def delete_user_configuration():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc))

    payload = request.get_json(silent=True)

    if not payload:
        return respond(400, "Request body is required")

    user_configuration_id = payload.get("id")

    if not user_configuration_id:
        return respond(400, "User configuration id is required")

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, userID, userIDName
            FROM user_configurations
            WHERE id = %s
            """,
            (user_configuration_id,),
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            return respond(
                404,
                "User configuration not found",
                operation="DELETE",
                userConfigurationId=user_configuration_id,
            )

        cursor.execute(
            """
            DELETE FROM user_configurations
            WHERE id = %s
            """,
            (user_configuration_id,),
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return respond(
                500,
                "User configuration could not be deleted",
                operation="DELETE",
                userConfigurationId=user_configuration_id,
            )

        conn.commit()

        return respond(
            200,
            "User configuration deleted successfully",
            operation="DELETE",
            message="User configuration deleted successfully",
            userConfigurationId=user_configuration_id,
            userID=existing_user["userID"],
            userIDName=existing_user["userIDName"],
        )

    except mysql.connector.Error as exc:
        if conn:
            conn.rollback()

        return respond(
            500,
            "Database error while deleting user configuration",
            operation="DELETE",
            error=str(exc),
        )

    except Exception as exc:
        if conn:
            conn.rollback()

        return respond(
            500,
            "Error while deleting user configuration",
            operation="DELETE",
            error=str(exc),
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
