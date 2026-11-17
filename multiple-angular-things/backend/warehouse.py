import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

from database import get_connection


warehouse_master_bp = Blueprint("warehouse_master", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
WAREHOUSE_FIELDS = {
    "warehouseCode": 30,
    "warehouseName": 100,
    "warehouseType": 50,
    "contactPerson": 100,
    "email": 100,
    "phone": 30,
    "address": 255,
    "city": 100,
    "state": 100,
    "postalCode": 20,
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


def initialize_warehouse_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS warehouses (
                id CHAR(36) PRIMARY KEY,
                warehouseCode VARCHAR(30) NOT NULL UNIQUE,
                warehouseName VARCHAR(100) NOT NULL,
                warehouseType VARCHAR(50) NOT NULL DEFAULT '',
                contactPerson VARCHAR(100) NOT NULL DEFAULT '',
                email VARCHAR(100) NOT NULL DEFAULT '',
                phone VARCHAR(30) NOT NULL DEFAULT '',
                address VARCHAR(255) NOT NULL DEFAULT '',
                city VARCHAR(100) NOT NULL DEFAULT '',
                state VARCHAR(100) NOT NULL DEFAULT '',
                postalCode VARCHAR(20) NOT NULL DEFAULT '',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        sample_rows = [
            ("WH-001", "Central Distribution Warehouse", "Distribution", "Warehouse Team",
             "warehouse001@example.com", "0000000001", "1 Demo Logistics Road", "Mumbai", "Maharashtra", "400001"),
            ("WH-002", "North Storage Center", "Storage", "Warehouse Team",
             "warehouse002@example.com", "0000000002", "2 Demo Logistics Road", "Delhi", "Delhi", "110001"),
            ("WH-003", "South Fulfillment Hub", "Fulfillment", "Warehouse Team",
             "warehouse003@example.com", "0000000003", "3 Demo Logistics Road", "Bengaluru", "Karnataka", "560001"),
            ("WH-004", "East Regional Warehouse", "Regional", "Warehouse Team",
             "warehouse004@example.com", "0000000004", "4 Demo Logistics Road", "Kolkata", "West Bengal", "700001"),
            ("WH-005", "West Cargo Depot", "Distribution", "Warehouse Team",
             "warehouse005@example.com", "0000000005", "5 Demo Logistics Road", "Ahmedabad", "Gujarat", "380001"),
            ("WH-006", "Pune Inventory Center", "Storage", "Warehouse Team",
             "warehouse006@example.com", "0000000006", "6 Demo Logistics Road", "Pune", "Maharashtra", "411001"),
            ("WH-007", "Hyderabad Dispatch Hub", "Fulfillment", "Warehouse Team",
             "warehouse007@example.com", "0000000007", "7 Demo Logistics Road", "Hyderabad", "Telangana", "500001"),
            ("WH-008", "Chennai Regional Depot", "Regional", "Warehouse Team",
             "warehouse008@example.com", "0000000008", "8 Demo Logistics Road", "Chennai", "Tamil Nadu", "600001"),
            ("WH-009", "Jaipur Storage Facility", "Storage", "Warehouse Team",
             "warehouse009@example.com", "0000000009", "9 Demo Logistics Road", "Jaipur", "Rajasthan", "302001"),
            ("WH-010", "Surat Distribution Point", "Distribution", "Warehouse Team",
             "warehouse010@example.com", "0000000010", "10 Demo Logistics Road", "Surat", "Gujarat", "395001"),
        ]
        cursor.execute("SELECT COUNT(*) FROM warehouses")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                """
                INSERT INTO warehouses (
                    id, warehouseCode, warehouseName, warehouseType, contactPerson,
                    email, phone, address, city, state, postalCode
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [(str(uuid.uuid4()), *row) for row in sample_rows],
            )
        cursor.executemany(
            """
            UPDATE warehouses
            SET phone = %s
            WHERE warehouseCode = %s AND warehouseName = %s AND (phone IS NULL OR phone = '')
            """,
            [(row[5], row[0], row[1]) for row in sample_rows],
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _validated_fields(payload):
    values = {}
    for field, max_length in WAREHOUSE_FIELDS.items():
        value = payload.get(field, "")
        if value is None:
            value = ""
        if not isinstance(value, str):
            return None, f"{field} must be a string"
        value = value.strip()
        if field in ("warehouseCode", "warehouseName") and not value:
            return None, f"{field} is required"
        if len(value) > max_length:
            return None, f"{field} must be {max_length} characters or fewer"
        values[field] = value
    return values, None


@warehouse_master_bp.route(
    "/warehouseMaster/services/saveorUpdateWarehouseMaster",
    methods=["POST", "OPTIONS"],
)
def save_or_update_warehouse():
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
        columns = ", ".join(WAREHOUSE_FIELDS)
        value_placeholders = ", ".join(["%s"] * len(WAREHOUSE_FIELDS))
        field_values = tuple(values[field] for field in WAREHOUSE_FIELDS)
        if record_id:
            cursor.execute("SELECT id FROM warehouses WHERE id = %s", (record_id,))
            if cursor.fetchone() is None:
                return respond(404, "Warehouse not found")
            assignments = ", ".join(f"{field} = %s" for field in WAREHOUSE_FIELDS)
            cursor.execute(
                f"UPDATE warehouses SET {assignments}, updatedAt = CURRENT_TIMESTAMP WHERE id = %s",
                (*field_values, record_id),
            )
            conn.commit()
            return respond(200, "Warehouse updated successfully", operation="UPDATE", warehouseId=record_id)

        record_id = str(uuid.uuid4())
        cursor.execute(
            f"INSERT INTO warehouses (id, {columns}) VALUES (%s, {value_placeholders})",
            (record_id, *field_values),
        )
        conn.commit()
        return respond(201, "Warehouse saved successfully", operation="CREATE", warehouseId=record_id)
    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()
        return respond(409, "Warehouse code already exists")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving warehouse")
        return respond(500, "Database error while saving warehouse")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@warehouse_master_bp.route(
    "/warehouseMaster/services/fetchAllWarehouses",
    methods=["POST", "OPTIONS"],
)
def fetch_all_warehouses():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, warehouseList=[])
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, warehouseCode, warehouseName, warehouseType, contactPerson, email,
                phone, address, city, state, postalCode, createdAt, updatedAt
            FROM warehouses
            ORDER BY warehouseCode
            """
        )
        return respond(200, "Warehouses fetched successfully", warehouseList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching warehouses")
        return respond(500, "Database error while fetching warehouses", warehouseList=[])
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@warehouse_master_bp.route(
    "/warehouseMaster/services/deleteWarehouseMaster",
    methods=["POST", "OPTIONS"],
)
def delete_warehouse():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)
    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip():
        return respond(400, "Warehouse id is required")

    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM warehouses WHERE id = %s", (record_id.strip(),))
        if cursor.rowcount == 0:
            return respond(404, "Warehouse not found")
        conn.commit()
        return respond(200, "Warehouse deleted successfully", operation="DELETE", warehouseId=record_id)
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting warehouse")
        return respond(500, "Database error while deleting warehouse")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
