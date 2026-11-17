import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

from database import get_connection


organization_master_bp = Blueprint("organization_master", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ORGANIZATION_FIELDS = {
    "organizationCode": 30,
    "organizationName": 100,
    "legalName": 150,
    "taxId": 50,
    "registrationNumber": 50,
    "email": 100,
    "phone": 30,
    "address": 255,
    "city": 100,
    "country": 100,
}


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


def authorize():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return "Missing bearer token"
    try:
        payload: dict[str, Any] = jwt.decode(
            authorization.split(" ", 1)[1].strip(),
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return None if payload.get("sub") else "Invalid token"
    except jwt.ExpiredSignatureError:
        return "Token expired"
    except jwt.PyJWTError:
        return "Invalid token"


def initialize_organization_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id CHAR(36) PRIMARY KEY,
                organizationCode VARCHAR(30) NOT NULL UNIQUE,
                organizationName VARCHAR(100) NOT NULL,
                legalName VARCHAR(150) NOT NULL DEFAULT '',
                taxId VARCHAR(50) NOT NULL DEFAULT '',
                registrationNumber VARCHAR(50) NOT NULL DEFAULT '',
                email VARCHAR(100) NOT NULL DEFAULT '',
                phone VARCHAR(30) NOT NULL DEFAULT '',
                address VARCHAR(255) NOT NULL DEFAULT '',
                city VARCHAR(100) NOT NULL DEFAULT '',
                country VARCHAR(100) NOT NULL DEFAULT '',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        sample_rows = [
            ("ORG-001", "Northstar Trading", "Northstar Trading Private Limited",
             "SAMPLE-TAX-001", "SAMPLE-REG-001", "organization001@example.com",
             "0000000101", "1 Demo Business Street", "Mumbai", "India"),
            ("ORG-002", "Greenfield Supplies", "Greenfield Supplies Private Limited",
             "SAMPLE-TAX-002", "SAMPLE-REG-002", "organization002@example.com",
             "0000000102", "2 Demo Business Street", "Delhi", "India"),
            ("ORG-003", "Bluewave Logistics", "Bluewave Logistics Private Limited",
             "SAMPLE-TAX-003", "SAMPLE-REG-003", "organization003@example.com",
             "0000000103", "3 Demo Business Street", "Bengaluru", "India"),
            ("ORG-004", "Pioneer Components", "Pioneer Components Private Limited",
             "SAMPLE-TAX-004", "SAMPLE-REG-004", "organization004@example.com",
             "0000000104", "4 Demo Business Street", "Kolkata", "India"),
            ("ORG-005", "Summit Retail Group", "Summit Retail Group Private Limited",
             "SAMPLE-TAX-005", "SAMPLE-REG-005", "organization005@example.com",
             "0000000105", "5 Demo Business Street", "Ahmedabad", "India"),
            ("ORG-006", "Evergreen Manufacturing", "Evergreen Manufacturing Private Limited",
             "SAMPLE-TAX-006", "SAMPLE-REG-006", "organization006@example.com",
             "0000000106", "6 Demo Business Street", "Pune", "India"),
            ("ORG-007", "Silverline Distribution", "Silverline Distribution Private Limited",
             "SAMPLE-TAX-007", "SAMPLE-REG-007", "organization007@example.com",
             "0000000107", "7 Demo Business Street", "Hyderabad", "India"),
            ("ORG-008", "Cedar Peak Industries", "Cedar Peak Industries Private Limited",
             "SAMPLE-TAX-008", "SAMPLE-REG-008", "organization008@example.com",
             "0000000108", "8 Demo Business Street", "Chennai", "India"),
            ("ORG-009", "Brightpath Commerce", "Brightpath Commerce Private Limited",
             "SAMPLE-TAX-009", "SAMPLE-REG-009", "organization009@example.com",
             "0000000109", "9 Demo Business Street", "Jaipur", "India"),
            ("ORG-010", "Redwood Supply Network", "Redwood Supply Network Private Limited",
             "SAMPLE-TAX-010", "SAMPLE-REG-010", "organization010@example.com",
             "0000000110", "10 Demo Business Street", "Surat", "India"),
        ]
        cursor.execute("SELECT COUNT(*) FROM organizations")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                """
                INSERT INTO organizations (
                    id, organizationCode, organizationName, legalName, taxId,
                    registrationNumber, email, phone, address, city, country
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [(str(uuid.uuid4()), *row) for row in sample_rows],
            )
        cursor.executemany(
            """
            UPDATE organizations
            SET phone = %s
            WHERE organizationCode = %s AND organizationName = %s
                AND (phone IS NULL OR phone = '')
            """,
            [(row[6], row[0], row[1]) for row in sample_rows],
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _validated_fields(payload):
    values = {}
    for field, max_length in ORGANIZATION_FIELDS.items():
        value = payload.get(field, "")
        if value is None:
            value = ""
        if not isinstance(value, str):
            return None, f"{field} must be a string"
        value = value.strip()
        if field in ("organizationCode", "organizationName") and not value:
            return None, f"{field} is required"
        if len(value) > max_length:
            return None, f"{field} must be {max_length} characters or fewer"
        values[field] = value
    return values, None


@organization_master_bp.route(
    "/organizationMaster/services/saveorUpdateOrganizationMaster",
    methods=["POST", "OPTIONS"],
)
def save_or_update_organization():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")
    values, validation_error = _validated_fields(payload)
    if validation_error:
        return respond(400, validation_error)

    record_id = payload.get("id")
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        columns = ", ".join(ORGANIZATION_FIELDS)
        value_placeholders = ", ".join(["%s"] * len(ORGANIZATION_FIELDS))
        field_values = tuple(values[field] for field in ORGANIZATION_FIELDS)
        if record_id:
            cursor.execute("SELECT id FROM organizations WHERE id = %s", (record_id,))
            if cursor.fetchone() is None:
                return respond(404, "Organization not found")
            assignments = ", ".join(f"{field} = %s" for field in ORGANIZATION_FIELDS)
            cursor.execute(
                f"UPDATE organizations SET {assignments}, updatedAt = CURRENT_TIMESTAMP WHERE id = %s",
                (*field_values, record_id),
            )
            conn.commit()
            return respond(200, "Organization updated successfully", operation="UPDATE", organizationId=record_id)

        record_id = str(uuid.uuid4())
        cursor.execute(
            f"INSERT INTO organizations (id, {columns}) VALUES (%s, {value_placeholders})",
            (record_id, *field_values),
        )
        conn.commit()
        return respond(201, "Organization saved successfully", operation="CREATE", organizationId=record_id)
    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()
        return respond(409, "Organization code already exists")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving organization")
        return respond(500, "Database error while saving organization")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organization_master_bp.route(
    "/organizationMaster/services/fetchAllOrganizations",
    methods=["POST", "OPTIONS"],
)
def fetch_all_organizations():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, organizationList=[])
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, organizationCode, organizationName, legalName, taxId,
                registrationNumber, email, phone, address, city, country, createdAt, updatedAt
            FROM organizations
            ORDER BY organizationCode
            """
        )
        return respond(200, "Organizations fetched successfully", organizationList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching organizations")
        return respond(500, "Database error while fetching organizations", organizationList=[])
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@organization_master_bp.route(
    "/organizationMaster/services/deleteOrganizationMaster",
    methods=["POST", "OPTIONS"],
)
def delete_organization():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)
    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip():
        return respond(400, "Organization id is required")

    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM organizations WHERE id = %s", (record_id.strip(),))
        if cursor.rowcount == 0:
            return respond(404, "Organization not found")
        conn.commit()
        return respond(200, "Organization deleted successfully", operation="DELETE", organizationId=record_id)
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting organization")
        return respond(500, "Database error while deleting organization")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
