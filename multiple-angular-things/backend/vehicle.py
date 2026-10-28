import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

vehicle_master_bp = Blueprint("vehicle_master", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"), port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"), password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"), autocommit=True,
    )


def respond(status_code: int, status_msg: str, **extra):
    body = {"statusCode": status_code, "statusMsg": status_msg, "success": status_code < 400, **extra}
    if status_code >= 400:
        body["detail"] = status_msg
    return jsonify(body), status_code


def authorize():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return "Missing bearer token"
    try:
        payload: dict[str, Any] = jwt.decode(authorization.split(" ", 1)[1].strip(), SECRET_KEY, algorithms=[ALGORITHM])
        return None if payload.get("sub") else "Invalid token"
    except jwt.ExpiredSignatureError:
        return "Token expired"
    except jwt.PyJWTError:
        return "Invalid token"


def initialize_vehicle_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_master (
                id CHAR(36) PRIMARY KEY,
                vehicleCode VARCHAR(20) NOT NULL UNIQUE,
                vehicleName VARCHAR(100) NOT NULL,
                vehicleType VARCHAR(50) NOT NULL,
                registrationNumber VARCHAR(30) NOT NULL UNIQUE,
                capacity DECIMAL(12,2) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("SELECT COUNT(*) FROM vehicle_master")
        if cursor.fetchone()[0] == 0:
            vehicles = [
                ("VEH-001", "Delivery Truck 01", "Truck", "MH12AB1001", 12000),
                ("VEH-002", "Delivery Truck 02", "Truck", "MH12AB1002", 12000),
                ("VEH-003", "Heavy Trailer 01", "Trailer", "MH14CD2001", 25000),
                ("VEH-004", "Cargo Van 01", "Van", "MH12EF3001", 1800),
                ("VEH-005", "Cargo Van 02", "Van", "MH12EF3002", 1800),
                ("VEH-006", "Container Truck 01", "Container Truck", "MH15GH4001", 18000),
                ("VEH-007", "Container Truck 02", "Container Truck", "MH15GH4002", 18000),
                ("VEH-008", "Warehouse Forklift 01", "Forklift", "WH-FORK-01", 3500),
                ("VEH-009", "Warehouse Forklift 02", "Forklift", "WH-FORK-02", 3500),
                ("VEH-010", "Pickup 01", "Pickup", "MH12JK5001", 1100),
            ]
            cursor.executemany("""
                INSERT INTO vehicle_master
                (id, vehicleCode, vehicleName, vehicleType, registrationNumber, capacity, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'Active')
            """, [(str(uuid.uuid4()), *vehicle) for vehicle in vehicles])
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def close(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


@vehicle_master_bp.route("/vehicleMaster/services/saveorUpdateVehicleMaster", methods=["POST", "OPTIONS"])
def save_or_update_vehicle():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")

    required = (("vehicleCode", 20), ("vehicleName", 100), ("vehicleType", 50), ("registrationNumber", 30))
    values = {}
    for field, max_length in required:
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            return respond(400, f"{field} is required")
        value = value.strip()
        if len(value) > max_length:
            return respond(400, f"{field} must be {max_length} characters or fewer")
        values[field] = value

    status = payload.get("status", "Active")
    if status not in ("Active", "Inactive"):
        return respond(400, "status must be Active or Inactive")
    try:
        capacity = payload.get("capacity")
        capacity = None if capacity in (None, "") else float(capacity)
        if capacity is not None and capacity < 0:
            raise ValueError
    except (TypeError, ValueError):
        return respond(400, "capacity must be a positive number")

    record_id = payload.get("id")
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if record_id:
            cursor.execute("SELECT id FROM vehicle_master WHERE id = %s", (record_id,))
            if cursor.fetchone() is None:
                return respond(404, "Vehicle not found")
            cursor.execute("""
                UPDATE vehicle_master SET vehicleCode=%s, vehicleName=%s, vehicleType=%s,
                registrationNumber=%s, capacity=%s, status=%s, updatedAt=CURRENT_TIMESTAMP WHERE id=%s
            """, (*values.values(), capacity, status, record_id))
            conn.commit()
            return respond(200, "Vehicle updated successfully", operation="UPDATE", vehicleId=record_id)

        record_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO vehicle_master
            (id, vehicleCode, vehicleName, vehicleType, registrationNumber, capacity, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (record_id, values["vehicleCode"], values["vehicleName"], values["vehicleType"], values["registrationNumber"], capacity, status))
        conn.commit()
        return respond(201, "Vehicle saved successfully", operation="CREATE", vehicleId=record_id)
    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()
        return respond(409, "Vehicle code or registration number already exists")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving vehicle")
        return respond(500, "Database error while saving vehicle")
    finally:
        close(cursor, conn)


@vehicle_master_bp.route("/vehicleMaster/services/fetchAllVehicles", methods=["POST", "OPTIONS"])
def fetch_all_vehicles():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, vehicleList=[])
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, vehicleCode, vehicleName, vehicleType, registrationNumber, capacity, status
            FROM vehicle_master ORDER BY vehicleCode
        """)
        return respond(200, "Vehicles fetched successfully", vehicleList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching vehicles")
        return respond(500, "Database error while fetching vehicles", vehicleList=[])
    finally:
        close(cursor, conn)


@vehicle_master_bp.route("/vehicleMaster/services/deleteVehicleMaster", methods=["POST", "OPTIONS"])
def delete_vehicle():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return auth_error
    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip():
        return respond(400, "Vehicle id is required")
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM vehicle_master WHERE id=%s", (record_id.strip(),))
        if cursor.rowcount == 0:
            return respond(404, "Vehicle not found")
        conn.commit()
        return respond(200, "Vehicle deleted successfully", operation="DELETE", vehicleId=record_id)
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting vehicle")
        return respond(500, "Database error while deleting vehicle")
    finally:
        close(cursor, conn)
