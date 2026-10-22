import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, jsonify, request

state_tax_bp = Blueprint("state_tax", __name__)

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
        return payload.get("sub", "")
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


def initialize_state_tax():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS state_taxes (
                id CHAR(36) PRIMARY KEY,
                stateCode VARCHAR(20) NOT NULL,
                stateName VARCHAR(100) NOT NULL,
                country VARCHAR(100) NOT NULL,
                taxName VARCHAR(100) NOT NULL,
                taxType VARCHAR(50) NOT NULL,
                taxRate DECIMAL(7, 4) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                description VARCHAR(500),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_state_taxes_state (stateCode, country)
            )
            """
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


@state_tax_bp.route(
    "/stateTax/services/saveorUpdateStateTax",
    methods=["POST", "OPTIONS"],
)
def save_or_update_state_tax():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc))

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")

    required_fields = ("stateCode", "stateName", "country", "taxName", "taxType", "status")
    for field in required_fields:
        if not str(payload.get(field, "")).strip():
            return respond(400, f"{field} is required")

    try:
        tax_rate = float(payload.get("taxRate"))
    except (TypeError, ValueError):
        return respond(400, "taxRate must be a number from 0 to 100")

    if not 0 <= tax_rate <= 100:
        return respond(400, "taxRate must be a number from 0 to 100")

    record_id = payload.get("id")
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        fields = (
            payload["stateCode"].strip(),
            payload["stateName"].strip(),
            payload["country"].strip(),
            payload["taxName"].strip(),
            payload["taxType"].strip(),
            tax_rate,
            payload["status"].strip(),
            (payload.get("description") or "").strip() or None,
        )

        if record_id:
            cursor.execute("SELECT id FROM state_taxes WHERE id = %s", (record_id,))
            if not cursor.fetchone():
                return respond(404, "State and tax record not found")

            cursor.execute(
                """
                UPDATE state_taxes
                SET stateCode = %s, stateName = %s, country = %s, taxName = %s,
                    taxType = %s, taxRate = %s, status = %s, description = %s,
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (*fields, record_id),
            )
            conn.commit()
            return respond(
                200,
                "State and tax updated successfully",
                operation="UPDATE",
                stateTaxId=record_id,
            )

        record_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO state_taxes (
                id, stateCode, stateName, country, taxName, taxType, taxRate, status, description
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (record_id, *fields),
        )
        conn.commit()
        return respond(
            201,
            "State and tax saved successfully",
            operation="CREATE",
            stateTaxId=record_id,
        )
    except mysql.connector.Error as exc:
        if conn:
            conn.rollback()
        return respond(500, "Database error while saving state and tax", error=str(exc))
    except Exception as exc:
        if conn:
            conn.rollback()
        return respond(500, "Error while saving state and tax", error=str(exc))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@state_tax_bp.route(
    "/stateTax/services/fetchAllStateTaxes",
    methods=["POST", "OPTIONS"],
)
def fetch_all_state_taxes():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc), stateTaxList=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, stateCode, stateName, country, taxName, taxType, taxRate,
                   status, description, createdAt, updatedAt
            FROM state_taxes
            ORDER BY createdAt DESC, stateName, taxName
            """
        )
        return respond(
            200,
            "State and tax records fetched successfully",
            stateTaxList=cursor.fetchall(),
        )
    except mysql.connector.Error as exc:
        return respond(
            500,
            "Database error while fetching state and tax records",
            stateTaxList=[],
            error=str(exc),
        )
    except Exception as exc:
        return respond(
            500,
            "Error while fetching state and tax records",
            stateTaxList=[],
            error=str(exc),
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@state_tax_bp.route(
    "/stateTax/services/deleteStateTax",
    methods=["POST", "OPTIONS"],
)
def delete_state_tax():
    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return respond(401, str(exc))

    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not record_id:
        return respond(400, "State and tax record id is required")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM state_taxes WHERE id = %s", (record_id,))
        if cursor.rowcount == 0:
            return respond(404, "State and tax record not found")
        conn.commit()
        return respond(
            200,
            "State and tax deleted successfully",
            operation="DELETE",
            stateTaxId=record_id,
        )
    except mysql.connector.Error as exc:
        if conn:
            conn.rollback()
        return respond(500, "Database error while deleting state and tax", error=str(exc))
    except Exception as exc:
        if conn:
            conn.rollback()
        return respond(500, "Error while deleting state and tax", error=str(exc))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
