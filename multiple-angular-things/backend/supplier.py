import os
import uuid
import jwt
import mysql.connector

from typing import Any
from flask import Blueprint, jsonify, request


supplier_bp = Blueprint("supplier", __name__)


SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=True
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
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload.get("sub", "")

    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")

    except jwt.PyJWTError:
        raise ValueError("Invalid token")


def initialize_supplier_table():

    conn = None
    cursor = None

    try:

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS suppliers (
                id CHAR(36) PRIMARY KEY,
                supplierCode VARCHAR(100) NOT NULL UNIQUE,
                supplierName VARCHAR(255) NOT NULL,
                supplierType VARCHAR(100),
                contactPerson VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                mobile VARCHAR(50),
                gstNumber VARCHAR(50),
                panNumber VARCHAR(50),
                address VARCHAR(500),
                city VARCHAR(100),
                pinCode VARCHAR(20),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        conn.commit()

    except Exception as exc:

        print("Error creating suppliers table:", exc)

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


def initialize_supplier():
    initialize_supplier_table()


@supplier_bp.route(
    "/supplier/services/saveorUpdateSupplierMaster",
    methods=["POST", "OPTIONS"]
)
def save_or_update_supplier():

    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401

    payload = request.get_json(silent=True)

    if not payload:
        return jsonify({
            "success": False,
            "detail": "Request body is required"
        }), 400

    supplier_code = payload.get("supplierCode")
    supplier_name = payload.get("supplierName")

    if not supplier_code:
        return jsonify({
            "success": False,
            "detail": "supplierCode is required"
        }), 400

    if not supplier_name:
        return jsonify({
            "success": False,
            "detail": "supplierName is required"
        }), 400

    conn = None
    cursor = None

    try:

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM suppliers
            WHERE supplierCode = %s
            """,
            (supplier_code,)
        )

        existing_supplier = cursor.fetchone()

        if existing_supplier:

            supplier_id = existing_supplier["id"]

            cursor.execute(
                """
                UPDATE suppliers
                SET
                    supplierName = %s,
                    supplierType = %s,
                    contactPerson = %s,
                    email = %s,
                    phone = %s,
                    mobile = %s,
                    gstNumber = %s,
                    panNumber = %s,
                    address = %s,
                    city = %s,
                    pinCode = %s,
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    supplier_name,
                    payload.get("supplierType"),
                    payload.get("contactPerson"),
                    payload.get("email"),
                    payload.get("phone"),
                    payload.get("mobile"),
                    payload.get("gstNumber"),
                    payload.get("panNumber"),
                    payload.get("address"),
                    payload.get("city"),
                    payload.get("pinCode"),
                    supplier_id
                )
            )

            conn.commit()

            return jsonify({
                "success": True,
                "message": "Supplier updated successfully",
                "operation": "UPDATE",
                "supplier": {
                    "id": supplier_id,
                    "supplierCode": supplier_code,
                    "supplierName": supplier_name
                }
            }), 200

        supplier_id = str(uuid.uuid4())

        cursor.execute(
            """
            INSERT INTO suppliers (
                id,
                supplierCode,
                supplierName,
                supplierType,
                contactPerson,
                email,
                phone,
                mobile,
                gstNumber,
                panNumber,
                address,
                city,
                pinCode
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            """,
            (
                supplier_id,
                supplier_code,
                supplier_name,
                payload.get("supplierType"),
                payload.get("contactPerson"),
                payload.get("email"),
                payload.get("phone"),
                payload.get("mobile"),
                payload.get("gstNumber"),
                payload.get("panNumber"),
                payload.get("address"),
                payload.get("city"),
                payload.get("pinCode")
            )
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Supplier created successfully",
            "operation": "CREATE",
            "supplier": {
                "id": supplier_id,
                "supplierCode": supplier_code,
                "supplierName": supplier_name
            }
        }), 201

    except mysql.connector.Error as exc:

        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500

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


@supplier_bp.route(
    "/supplier/services/fetchALLSuppliers",
    methods=["POST", "OPTIONS"]
)
def fetch_all_suppliers():

    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()

    except ValueError as exc:
        return jsonify({
            "statusCode": 401,
            "statusMsg": str(exc),
            "supplierDetailsList": []
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                supplierCode,
                supplierName,
                supplierType,
                contactPerson,
                email,
                phone,
                mobile,
                gstNumber,
                panNumber,
                address,
                city,
                pinCode,
                createdAt,
                updatedAt
            FROM suppliers
            ORDER BY createdAt DESC
        """)

        suppliers = cursor.fetchall()

        return jsonify({
            "statusCode": 200,
            "statusMsg": "Suppliers fetched successfully",
            "supplierDetailsList": suppliers
        }), 200

    except mysql.connector.Error as exc:

        return jsonify({
            "statusCode": 500,
            "statusMsg": str(exc),
            "supplierDetailsList": []
        }), 500

    except Exception as exc:

        return jsonify({
            "statusCode": 500,
            "statusMsg": str(exc),
            "supplierDetailsList": []
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()

    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()

    except ValueError as exc:
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                supplierCode,
                supplierName,
                supplierType,
                contactPerson,
                email,
                phone,
                mobile,
                gstNumber,
                panNumber,
                address,
                city,
                pinCode,
                createdAt,
                updatedAt
            FROM suppliers
            ORDER BY createdAt DESC
        """)

        suppliers = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": suppliers
        }), 200

    except mysql.connector.Error as exc:

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500

    except Exception as exc:

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()

    if request.method == "OPTIONS":
        return "", 200

    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                supplierCode,
                supplierName,
                supplierType,
                contactPerson,
                email,
                phone,
                mobile,
                gstNumber,
                panNumber,
                address,
                city,
                pinCode,
                createdAt,
                updatedAt
            FROM suppliers
            ORDER BY createdAt DESC
        """)

        suppliers = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": suppliers
        }), 200

    except mysql.connector.Error as exc:

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500

    except Exception as exc:

        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()