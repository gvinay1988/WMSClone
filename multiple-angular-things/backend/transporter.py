import os
import uuid
from typing import Any
import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

transporter_master_bp = Blueprint("transporter_master", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_connection():
    return mysql.connector.connect(host=os.getenv("MYSQL_HOST", "127.0.0.1"), port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"), password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"), autocommit=True)


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


def initialize_transporter_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transporter_master (
                id CHAR(36) PRIMARY KEY,
                transporterCode VARCHAR(20) NOT NULL UNIQUE,
                transporterName VARCHAR(100) NOT NULL,
                contactPerson VARCHAR(100), email VARCHAR(100), phone VARCHAR(30), city VARCHAR(100),
                status VARCHAR(20) NOT NULL DEFAULT 'Active', createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("SELECT COUNT(*) FROM transporter_master")
        if cursor.fetchone()[0] == 0:
            rows = [
                ("TRANS-001", "Swift Logistics", "Rajesh Kumar", "rajesh@swiftlogistics.example", "9876543210", "Mumbai"),
                ("TRANS-002", "Metro Freight", "Anita Shah", "anita@metrofreight.example", "9876543211", "Pune"),
                ("TRANS-003", "Golden Roadways", "Vijay Singh", "vijay@goldenroadways.example", "9876543212", "Delhi"),
                ("TRANS-004", "BlueDart Express", "Priya Nair", "priya@bluedart.example", "9876543213", "Bengaluru"),
                ("TRANS-005", "Safe Cargo", "Mohammed Ali", "ali@safecargo.example", "9876543214", "Hyderabad"),
                ("TRANS-006", "North Star Transport", "Neha Gupta", "neha@northstar.example", "9876543215", "Jaipur"),
                ("TRANS-007", "Eastern Link", "Arjun Das", "arjun@easternlink.example", "9876543216", "Kolkata"),
                ("TRANS-008", "Western Movers", "Kiran Patel", "kiran@westernmovers.example", "9876543217", "Ahmedabad"),
                ("TRANS-009", "Rapid Parcel", "Sneha Rao", "sneha@rapidparcel.example", "9876543218", "Chennai"),
                ("TRANS-010", "Prime Haulage", "Deepak Mehta", "deepak@primehaulage.example", "9876543219", "Surat"),
            ]
            cursor.executemany("""
                INSERT INTO transporter_master
                (id, transporterCode, transporterName, contactPerson, email, phone, city, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'Active')
            """, [(str(uuid.uuid4()), *row) for row in rows])
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def close(cursor, conn):
    if cursor: cursor.close()
    if conn: conn.close()


@transporter_master_bp.route("/transporterMaster/services/saveorUpdateTransporterMaster", methods=["POST", "OPTIONS"])
def save_or_update_transporter():
    if request.method == "OPTIONS": return "", 200
    auth_error = authorize()
    if auth_error: return respond(401, auth_error)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict): return respond(400, "Request body is required")
    values = {}
    for field, max_length in (("transporterCode",20),("transporterName",100),("contactPerson",100),("email",100),("phone",30),("city",100)):
        value = payload.get(field, "")
        if field in ("transporterCode", "transporterName") and (not isinstance(value, str) or not value.strip()):
            return respond(400, f"{field} is required")
        if value is None: value = ""
        if not isinstance(value, str): return respond(400, f"{field} must be a string")
        value = value.strip()
        if len(value) > max_length: return respond(400, f"{field} must be {max_length} characters or fewer")
        values[field] = value
    status = payload.get("status", "Active")
    if status not in ("Active", "Inactive"): return respond(400, "status must be Active or Inactive")
    record_id = payload.get("id")
    conn = cursor = None
    try:
        conn = get_connection(); cursor = conn.cursor()
        if record_id:
            cursor.execute("SELECT id FROM transporter_master WHERE id=%s", (record_id,))
            if cursor.fetchone() is None: return respond(404, "Transporter not found")
            cursor.execute("""UPDATE transporter_master SET transporterCode=%s, transporterName=%s, contactPerson=%s,
                email=%s, phone=%s, city=%s, status=%s, updatedAt=CURRENT_TIMESTAMP WHERE id=%s""",
                (*[values[field] for field in ("transporterCode","transporterName","contactPerson","email","phone","city")], status, record_id))
            conn.commit(); return respond(200, "Transporter updated successfully", operation="UPDATE", transporterId=record_id)
        record_id = str(uuid.uuid4())
        cursor.execute("""INSERT INTO transporter_master (id,transporterCode,transporterName,contactPerson,email,phone,city,status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", (record_id, values["transporterCode"], values["transporterName"], values["contactPerson"], values["email"], values["phone"], values["city"], status))
        conn.commit(); return respond(201, "Transporter saved successfully", operation="CREATE", transporterId=record_id)
    except mysql.connector.IntegrityError:
        if conn: conn.rollback()
        return respond(409, "Transporter code already exists")
    except mysql.connector.Error:
        if conn: conn.rollback()
        current_app.logger.exception("Database error while saving transporter")
        return respond(500, "Database error while saving transporter")
    finally: close(cursor, conn)


@transporter_master_bp.route("/transporterMaster/services/fetchAllTransporters", methods=["POST", "OPTIONS"])
def fetch_all_transporters():
    if request.method == "OPTIONS": return "", 200
    auth_error = authorize()
    if auth_error: return respond(401, auth_error, transporterList=[])
    conn = cursor = None
    try:
        conn = get_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("""SELECT id,transporterCode,transporterName,contactPerson,email,phone,city,status
            FROM transporter_master ORDER BY transporterCode""")
        return respond(200, "Transporters fetched successfully", transporterList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching transporters")
        return respond(500, "Database error while fetching transporters", transporterList=[])
    finally: close(cursor, conn)


@transporter_master_bp.route("/transporterMaster/services/deleteTransporterMaster", methods=["POST", "OPTIONS"])
def delete_transporter():
    if request.method == "OPTIONS": return "", 200
    auth_error = authorize()
    if auth_error: return auth_error
    payload = request.get_json(silent=True); record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip(): return respond(400, "Transporter id is required")
    conn = cursor = None
    try:
        conn = get_connection(); cursor = conn.cursor()
        cursor.execute("DELETE FROM transporter_master WHERE id=%s", (record_id.strip(),))
        if cursor.rowcount == 0: return respond(404, "Transporter not found")
        conn.commit(); return respond(200, "Transporter deleted successfully", operation="DELETE", transporterId=record_id)
    except mysql.connector.Error:
        if conn: conn.rollback()
        current_app.logger.exception("Database error while deleting transporter")
        return respond(500, "Database error while deleting transporter")
    finally: close(cursor, conn)
