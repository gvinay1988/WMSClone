import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, jsonify, request


# =========================================================
# SUPPLIER BLUEPRINT
# =========================================================

supplier_bp = Blueprint("supplier", __name__)

print("")
print("=========================================================")
print("SUPPLIER.PY LOADED")
print("Supplier Blueprint created successfully")
print("=========================================================")
print("")
print("########### SUPPLIER.PY IS BEING LOADED ###########")


# =========================================================
# JWT CONFIGURATION
# =========================================================

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# =========================================================
# MYSQL CONNECTION
# =========================================================

def get_connection():

    print("[SUPPLIER] Connecting to MySQL...")

    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=True
    )

    print("[SUPPLIER] MySQL connection successful")

    return conn


# =========================================================
# JWT VALIDATION
# =========================================================

def get_current_user() -> str:

    print("[SUPPLIER] Checking JWT token...")

    authorization = request.headers.get("Authorization", "")

    print("[SUPPLIER] Authorization header present:",
          bool(authorization))

    if not authorization.startswith("Bearer "):

        print("[SUPPLIER] ERROR: Missing Bearer token")

        raise ValueError("Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    if not token:

        print("[SUPPLIER] ERROR: Empty token")

        raise ValueError("Missing bearer token")

    try:

        payload: dict[str, Any] = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        current_user = payload.get("sub", "")

        print("[SUPPLIER] JWT validation successful")
        print("[SUPPLIER] Logged-in user:", current_user)

        return current_user

    except jwt.ExpiredSignatureError:

        print("[SUPPLIER] ERROR: JWT token expired")

        raise ValueError("Token expired")

    except jwt.PyJWTError:

        print("[SUPPLIER] ERROR: Invalid JWT token")

        raise ValueError("Invalid token")


# =========================================================
# CREATE SUPPLIER TABLE
# =========================================================

def initialize_supplier_table():

    print("")
    print("=========================================================")
    print("[SUPPLIER] INITIALIZING SUPPLIERS TABLE")
    print("=========================================================")

    conn = None
    cursor = None

    try:

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
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
            """
        )

        conn.commit()

        print("[SUPPLIER] suppliers table created/verified successfully")

    except Exception as exc:

        print("[SUPPLIER] ERROR while creating suppliers table:")
        print(exc)

    finally:

        if cursor:

            cursor.close()

        if conn:

            conn.close()

    print("=========================================================")
    print("")


# =========================================================
# INITIALIZE SUPPLIER
# =========================================================

def initialize_supplier():

    print("[SUPPLIER] initialize_supplier() called")

    initialize_supplier_table()

    print("[SUPPLIER] Supplier initialization completed")
    print("")


# =========================================================
# SAVE / UPDATE SUPPLIER
# =========================================================

@supplier_bp.route(
    "/supplier/services/saveorUpdateSupplierMaster",
    methods=["POST", "OPTIONS"]
)
def save_or_update_supplier():

    print("")
    print("=========================================================")
    print("[SUPPLIER API] REQUEST RECEIVED")
    print("Method :", request.method)
    print("Path   :", request.path)
    print("=========================================================")

    # =====================================================
    # HANDLE CORS PREFLIGHT
    # =====================================================
    if request.method == "OPTIONS":
        print("[SUPPLIER API] OPTIONS / PREFLIGHT REQUEST")
        print("[SUPPLIER API] Returning 200")
        print("=========================================================")
        print("")
        return "", 200
    # =====================================================
    # JWT VALIDATION
    # =====================================================

    try:
        current_user = get_current_user()
        print("[SUPPLIER API] Authenticated user:", current_user)
    except ValueError as exc:
        print("[SUPPLIER API] JWT ERROR:", str(exc))
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401
    # =====================================================
    # GET REQUEST PAYLOAD
    # =====================================================
    payload = request.get_json(silent=True)
    print("[SUPPLIER API] Request payload:")
    print(payload)
    if not payload:
        print("[SUPPLIER API] ERROR: Request body is empty")
        return jsonify({
            "success": False,
            "detail": "Request body is required"
        }), 400

    # =====================================================
    # REQUIRED FIELDS
    # =====================================================
    supplier_code = payload.get("supplierCode")
    supplier_name = payload.get("supplierName")
    print("[SUPPLIER API] Supplier Code :", supplier_code)
    print("[SUPPLIER API] Supplier Name :", supplier_name)
    if not supplier_code:
        print("[SUPPLIER API] ERROR: supplierCode is required")
        return jsonify({
            "success": False,
            "detail": "supplierCode is required"
        }), 400
    if not supplier_name:
        print("[SUPPLIER API] ERROR: supplierName is required")
        return jsonify({
            "success": False,
            "detail": "supplierName is required"
        }), 400
    conn = None
    cursor = None

    try:
        # =================================================
        # MYSQL CONNECTION
        # =================================================
        print("[SUPPLIER API] Connecting to MySQL...")
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        # =================================================
        # CHECK EXISTING SUPPLIER
        # =================================================
        print(
            "[SUPPLIER API] Checking supplier code:",
            supplier_code
        )
        cursor.execute(
            """
            SELECT id
            FROM suppliers
            WHERE supplierCode = %s
            """,
            (supplier_code,)
        )
        existing_supplier = cursor.fetchone()
        # =================================================
        # UPDATE EXISTING SUPPLIER
        # =================================================
        if existing_supplier:
            print("[SUPPLIER API] Existing supplier found")
            print("[SUPPLIER API] Performing UPDATE")
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
            print("[SUPPLIER API] UPDATE successful")
            print("[SUPPLIER API] Supplier ID:", supplier_id)
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
        # =================================================
        # CREATE NEW SUPPLIER
        # =================================================
        print("[SUPPLIER API] Supplier does not exist")
        print("[SUPPLIER API] Performing CREATE")
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
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
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
        print("[SUPPLIER API] CREATE successful")
        print("[SUPPLIER API] Supplier ID:", supplier_id)
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
        print("[SUPPLIER API] MYSQL ERROR:")
        print(exc)
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500
    except Exception as exc:
        if conn:
            conn.rollback()
        print("[SUPPLIER API] GENERAL ERROR:")
        print(exc)
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500
    finally: 
        if cursor:
            cursor.close()
        if conn:

            conn.close()

        print("[SUPPLIER API] Database connection closed")

        print("=========================================================")
        print("")