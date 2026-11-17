import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

from database import get_connection


vehicle_by_transporter_bp = Blueprint("vehicle_by_transporter", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


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


def close(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


def initialize_vehicle_by_transporter():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transporter_vehicle_assignments (
                id CHAR(36) PRIMARY KEY,
                transporterId CHAR(36) NOT NULL UNIQUE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_tva_transporter
                    FOREIGN KEY (transporterId) REFERENCES transporter_master(id)
                    ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transporter_vehicle_assignment_items (
                assignmentId CHAR(36) NOT NULL,
                vehicleId CHAR(36) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (assignmentId, vehicleId),
                CONSTRAINT fk_tvai_assignment
                    FOREIGN KEY (assignmentId)
                    REFERENCES transporter_vehicle_assignments(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_tvai_vehicle
                    FOREIGN KEY (vehicleId) REFERENCES vehicle_master(id)
                    ON DELETE CASCADE
            )
            """
        )
        conn.commit()
    finally:
        close(cursor, conn)


def validate_assignment_payload(payload):
    if not isinstance(payload, dict):
        return None, None, "Request body is required"

    transporter_id = payload.get("transporterId")
    if not isinstance(transporter_id, str) or not transporter_id.strip():
        return None, None, "transporterId is required"

    vehicle_ids = payload.get("vehicleIds")
    if not isinstance(vehicle_ids, list):
        return None, None, "vehicleIds must be an array"

    normalized_ids = []
    for vehicle_id in vehicle_ids:
        if not isinstance(vehicle_id, str) or not vehicle_id.strip():
            return None, None, "Each vehicleId must be a non-empty string"
        normalized_ids.append(vehicle_id.strip())

    return transporter_id.strip(), list(dict.fromkeys(normalized_ids)), None


def persist_assignment(update=False):
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    transporter_id, vehicle_ids, validation_error = validate_assignment_payload(payload)
    if validation_error:
        return respond(400, validation_error)

    conn = cursor = None
    try:
        conn = get_connection()
        conn.autocommit = False
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM transporter_master WHERE id = %s",
            (transporter_id,),
        )
        if cursor.fetchone() is None:
            return respond(404, "Transporter not found")

        cursor.execute(
            "SELECT id FROM transporter_vehicle_assignments WHERE transporterId = %s",
            (transporter_id,),
        )
        assignment = cursor.fetchone()
        if update and assignment is None:
            return respond(404, "Vehicle assignment not found")
        if not update and assignment is not None:
            return respond(409, "Vehicle assignment already exists; use update")

        if vehicle_ids:
            placeholders = ", ".join(["%s"] * len(vehicle_ids))
            cursor.execute(
                f"SELECT id FROM vehicle_master WHERE id IN ({placeholders})",
                tuple(vehicle_ids),
            )
            valid_ids = {row[0] for row in cursor.fetchall()}
            invalid_ids = set(vehicle_ids) - valid_ids
            if invalid_ids:
                return respond(
                    400,
                    f"Invalid vehicle IDs: {', '.join(sorted(invalid_ids))}",
                )

        if update:
            assignment_id = assignment[0]
            cursor.execute(
                "DELETE FROM transporter_vehicle_assignment_items WHERE assignmentId = %s",
                (assignment_id,),
            )
        else:
            assignment_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO transporter_vehicle_assignments (id, transporterId)
                VALUES (%s, %s)
                """,
                (assignment_id, transporter_id),
            )

        if vehicle_ids:
            cursor.executemany(
                """
                INSERT INTO transporter_vehicle_assignment_items
                    (assignmentId, vehicleId)
                VALUES (%s, %s)
                """,
                [(assignment_id, vehicle_id) for vehicle_id in vehicle_ids],
            )

        conn.commit()
        operation = "UPDATE" if update else "CREATE"
        message = "Vehicle assignment updated successfully" if update else "Vehicle assignment saved successfully"
        return respond(
            200 if update else 201,
            message,
            operation=operation,
            id=assignment_id,
            transporterId=transporter_id,
            vehicleIds=vehicle_ids,
        )
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving transporter vehicle assignment")
        return respond(500, "Database error while saving transporter vehicle assignment")
    finally:
        close(cursor, conn)


@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/saveVehicleByTransporter",
    methods=["POST", "OPTIONS"],
)
def save_vehicle_by_transporter():
    return persist_assignment(update=False)


@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/updateVehicleByTransporter",
    methods=["POST", "OPTIONS"],
)
def update_vehicle_by_transporter():
    return persist_assignment(update=True)


def assignment_response(transporter_id):
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT a.id, t.id AS transporterId, t.transporterCode, t.transporterName,
                   v.id AS vehicleId, v.vehicleCode, v.vehicleName, v.vehicleType,
                   v.registrationNumber, v.capacity, v.status
            FROM transporter_vehicle_assignments a
            JOIN transporter_master t ON t.id = a.transporterId
            LEFT JOIN transporter_vehicle_assignment_items i ON i.assignmentId = a.id
            LEFT JOIN vehicle_master v ON v.id = i.vehicleId
        """
        params = ()
        if transporter_id:
            query += " WHERE a.transporterId = %s"
            params = (transporter_id,)
        query += " ORDER BY t.transporterCode, v.vehicleCode"
        cursor.execute(query, params)
        rows = cursor.fetchall()

        assignments = {}
        for row in rows:
            assignment = assignments.setdefault(
                row["id"],
                {
                    "id": row["id"],
                    "transporterId": row["transporterId"],
                    "transporterCode": row["transporterCode"],
                    "transporterName": row["transporterName"],
                    "vehicleIds": [],
                    "vehicles": [],
                },
            )
            if row["vehicleId"]:
                assignment["vehicleIds"].append(row["vehicleId"])
                assignment["vehicles"].append(
                    {
                        "id": row["vehicleId"],
                        "vehicleCode": row["vehicleCode"],
                        "vehicleName": row["vehicleName"],
                        "vehicleType": row["vehicleType"],
                        "registrationNumber": row["registrationNumber"],
                        "capacity": row["capacity"],
                        "status": row["status"],
                    }
                )

        if transporter_id and not assignments:
            cursor.execute(
                "SELECT id FROM transporter_master WHERE id = %s",
                (transporter_id,),
            )
            if cursor.fetchone() is None:
                return respond(404, "Transporter not found", assignment=None, vehicleIds=[])
            return respond(200, "No vehicle assignment found", assignment=None, vehicleIds=[])

        assignment_list = list(assignments.values())
        if transporter_id:
            assignment = assignment_list[0]
            return respond(
                200,
                "Vehicle assignment fetched successfully",
                assignment=assignment,
                vehicleIds=assignment["vehicleIds"],
            )
        return respond(
            200,
            "Vehicle assignments fetched successfully",
            assignmentList=assignment_list,
        )
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching transporter vehicle assignments")
        if transporter_id:
            return respond(500, "Database error while fetching vehicle assignment", assignment=None, vehicleIds=[])
        return respond(500, "Database error while fetching vehicle assignments", assignmentList=[])
    finally:
        close(cursor, conn)


@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/fetchAllVehicleByTransporter",
    methods=["POST", "OPTIONS"],
)
def fetch_all_vehicle_by_transporter():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, assignmentList=[])
    return assignment_response(None)


@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/fetchVehicleByTransporter",
    methods=["POST", "OPTIONS"],
)
@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/fetchVehiclesByTransporter",
    methods=["POST", "OPTIONS"],
)
def fetch_vehicle_by_transporter():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, assignment=None, vehicleIds=[])

    payload = request.get_json(silent=True)
    transporter_id = payload.get("transporterId") if isinstance(payload, dict) else None
    if not isinstance(transporter_id, str) or not transporter_id.strip():
        return respond(400, "transporterId is required", assignment=None, vehicleIds=[])
    return assignment_response(transporter_id.strip())


@vehicle_by_transporter_bp.route(
    "/vehicleByTransporter/services/deleteVehicleByTransporter",
    methods=["POST", "OPTIONS"],
)
def delete_vehicle_by_transporter():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")
    transporter_id = payload.get("transporterId")
    vehicle_id = payload.get("vehicleId")
    if not isinstance(transporter_id, str) or not transporter_id.strip():
        return respond(400, "transporterId is required")
    if vehicle_id is not None and (not isinstance(vehicle_id, str) or not vehicle_id.strip()):
        return respond(400, "vehicleId must be a non-empty string")

    transporter_id = transporter_id.strip()
    conn = cursor = None
    try:
        conn = get_connection()
        conn.autocommit = False
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM transporter_vehicle_assignments WHERE transporterId = %s",
            (transporter_id,),
        )
        assignment = cursor.fetchone()
        if assignment is None:
            cursor.execute("SELECT id FROM transporter_master WHERE id = %s", (transporter_id,))
            if cursor.fetchone() is None:
                return respond(404, "Transporter not found")
            return respond(404, "Vehicle assignment not found")

        assignment_id = assignment[0]
        if vehicle_id is None:
            cursor.execute(
                "DELETE FROM transporter_vehicle_assignments WHERE id = %s",
                (assignment_id,),
            )
            message = "Vehicle assignment deleted successfully"
        else:
            cursor.execute(
                """
                DELETE FROM transporter_vehicle_assignment_items
                WHERE assignmentId = %s AND vehicleId = %s
                """,
                (assignment_id, vehicle_id.strip()),
            )
            if cursor.rowcount == 0:
                return respond(404, "Vehicle assignment not found")
            message = "Vehicle removed from transporter successfully"

        conn.commit()
        return respond(
            200,
            message,
            operation="DELETE",
            transporterId=transporter_id,
            vehicleId=vehicle_id.strip() if vehicle_id else None,
        )
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting transporter vehicle assignment")
        return respond(500, "Database error while deleting transporter vehicle assignment")
    finally:
        close(cursor, conn)
