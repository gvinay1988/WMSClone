import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request


state_master_bp = Blueprint("state_master", __name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


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
        payload: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = payload.get("sub")
        if not user:
            raise ValueError("Invalid token")
        return user
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token expired") from exc
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid token") from exc


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


def initialize_state_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS state_master (
                id CHAR(36) PRIMARY KEY,
                stateCode VARCHAR(20) NOT NULL,
                stateName VARCHAR(100) NOT NULL,
                country VARCHAR(100) NOT NULL,
                capital VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_states_code_country (stateCode, country)
            )
            """
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _authorize():
    try:
        get_current_user()
        return None
    except ValueError as exc:
        return respond(401, str(exc))


@state_master_bp.route(
    "/stateMaster/services/saveorUpdateStateMaster",
    methods=["POST", "OPTIONS"],
)
def save_or_update_state():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")

    fields = ("stateCode", "stateName", "country", "capital", "status")
    values = {}
    for field in fields:
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            return respond(400, f"{field} is required")
        value = value.strip()
        max_length = {
            "stateCode": 20,
            "stateName": 100,
            "country": 100,
            "capital": 100,
            "status": 20,
        }[field]
        if len(value) > max_length:
            return respond(400, f"{field} must be {max_length} characters or fewer")
        values[field] = value

    if values["status"] not in ("Active", "Inactive"):
        return respond(400, "status must be Active or Inactive")

    record_id = payload.get("id")
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if record_id:
            cursor.execute("SELECT id FROM state_master WHERE id = %s", (record_id,))
            if not cursor.fetchone():
                return respond(404, "State not found")
            cursor.execute(
                """
                UPDATE state_master
                SET stateCode = %s, stateName = %s, country = %s, capital = %s,
                    status = %s, updatedAt = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    values["stateCode"], values["stateName"], values["country"],
                    values["capital"], values["status"], record_id,
                ),
            )
            conn.commit()
            return respond(200, "State updated successfully", operation="UPDATE", stateId=record_id)

        record_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO state_master (id, stateCode, stateName, country, capital, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                record_id, values["stateCode"], values["stateName"], values["country"],
                values["capital"], values["status"],
            ),
        )
        conn.commit()
        return respond(201, "State saved successfully", operation="CREATE", stateId=record_id)
    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()
        return respond(409, "A state with this code and country already exists")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving state")
        return respond(500, "Database error while saving state")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@state_master_bp.route(
    "/stateMaster/services/fetchAllStates",
    methods=["POST", "OPTIONS"],
)
def fetch_all_states():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, "Unauthorized", stateList=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, stateCode, stateName, country, capital, status, createdAt, updatedAt
            FROM state_master
            ORDER BY createdAt DESC, stateName, country
            """
        )
        return respond(200, "States fetched successfully", stateList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching states")
        return respond(500, "Database error while fetching states", stateList=[])
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@state_master_bp.route(
    "/stateMaster/services/deleteStateMaster",
    methods=["POST", "OPTIONS"],
)
def delete_state():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip():
        return respond(400, "State id is required")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM state_master WHERE id = %s", (record_id.strip(),))
        if cursor.rowcount == 0:
            return respond(404, "State not found")
        conn.commit()
        return respond(200, "State deleted successfully", operation="DELETE", stateId=record_id)
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting state")
        return respond(500, "Database error while deleting state")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
