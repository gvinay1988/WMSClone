import json
import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

from database import get_connection


customer_master_bp = Blueprint(
    "customer_master",
    __name__,
    url_prefix="/customerMaster/services/customerMaster",
)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ADDRESS_FIELDS = (
    "city",
    "town",
    "district",
    "state",
    "postalCode",
    "landmark",
    "nearbyAddress",
)

ADDRESS_FIELD_LENGTHS = {
    "city": 100,
    "town": 100,
    "district": 100,
    "state": 100,
    "postalCode": 20,
    "landmark": 255,
    "nearbyAddress": 1000,
}


def _respond(status_code: int, message: str, **extra):
    body = {
        "statusCode": status_code,
        "statusMsg": message,
        "success": status_code < 400,
        **extra,
    }

    if status_code >= 400:
        body["detail"] = message

    return jsonify(body), status_code


def _authorize():
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return _respond(401, "Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        return _respond(401, "Missing bearer token")

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if not payload.get("sub"):
            return _respond(401, "Invalid token")

    except jwt.ExpiredSignatureError:
        return _respond(401, "Token expired")
    except jwt.PyJWTError:
        return _respond(401, "Invalid token")

    return None


def initialize_customer_master():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_master (
                customerID VARCHAR(100) PRIMARY KEY,
                customerName VARCHAR(255) NOT NULL,
                customerIDName VARCHAR(358) NOT NULL,
                customerType LONGTEXT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_master_addresses (
                id CHAR(36) PRIMARY KEY,
                customerID VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL DEFAULT '',
                town VARCHAR(100) NOT NULL DEFAULT '',
                district VARCHAR(100) NOT NULL DEFAULT '',
                state VARCHAR(100) NOT NULL DEFAULT '',
                postalCode VARCHAR(20) NOT NULL DEFAULT '',
                landmark VARCHAR(255) NOT NULL DEFAULT '',
                nearbyAddress VARCHAR(1000) NOT NULL DEFAULT '',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_customer_master_addresses_customerID (customerID),
                CONSTRAINT fk_customer_master_addresses_customer
                    FOREIGN KEY (customerID)
                    REFERENCES customer_master(customerID)
                    ON DELETE CASCADE
            )
            """
        )

        conn.commit()

    finally:
        cursor.close()
        conn.close()


def _first_value(payload: dict[str, Any], *keys: str):
    for key in keys:
        if key in payload:
            return payload[key]

    return None


def _normalize_customer(payload: dict[str, Any]):
    customer_id = _first_value(payload, "customerID", "customerId")

    if not isinstance(customer_id, str) or not customer_id.strip():
        return None, "customerID is required"

    customer_id = customer_id.strip()

    if len(customer_id) > 100:
        return None, "customerID must be 100 characters or fewer"

    customer_name = _first_value(payload, "customerName", "Name", "name")

    if not isinstance(customer_name, str) or not customer_name.strip():
        return None, "customerName is required"

    customer_name = customer_name.strip()

    if len(customer_name) > 255:
        return None, "customerName must be 255 characters or fewer"

    customer_id_name = _first_value(
        payload,
        "customerIDName",
        "customerIdName",
        "IDName",
    )

    if not isinstance(customer_id_name, str) or not customer_id_name.strip():
        return None, "customerIDName is required"

    customer_id_name = customer_id_name.strip()

    if len(customer_id_name) > 358:
        return None, "customerIDName must be 358 characters or fewer"

    # Customer Type accepts an array of strings.
    # No fixed list of allowed customer type values is enforced.
    customer_type = _first_value(payload, "customerType", "type")

    if not isinstance(customer_type, list) or not all(
        isinstance(item, str) for item in customer_type
    ):
        return None, "customerType must be an array of strings"

    addresses = payload.get("addresses")

    if not isinstance(addresses, list):
        return None, "addresses must be a list"

    normalized_addresses = []

    for index, address in enumerate(addresses):
        if not isinstance(address, dict):
            return None, f"addresses[{index}] must be an object"

        normalized_address = {}

        for field in ADDRESS_FIELDS:
            value = address.get(field, "")

            if not isinstance(value, str):
                return None, f"addresses[{index}].{field} must be a string"

            value = value.strip()

            if len(value) > ADDRESS_FIELD_LENGTHS[field]:
                return None, (
                    f"addresses[{index}].{field} must be "
                    f"{ADDRESS_FIELD_LENGTHS[field]} characters or fewer"
                )

            normalized_address[field] = value

        normalized_addresses.append(normalized_address)

    return {
        "customerID": customer_id,
        "customerName": customer_name,
        "customerIDName": customer_id_name,
        "customerType": customer_type,
        "addresses": normalized_addresses,
    }, None


def _serialize_customer(
    customer: dict[str, Any],
    addresses: list[dict[str, Any]],
):
    customer_type = customer["customerType"]

    if isinstance(customer_type, str):
        customer_type = json.loads(customer_type)

    return {
        "customerID": customer["customerID"],
        "customerName": customer["customerName"],
        "customerIDName": customer["customerIDName"],
        "customerType": customer_type,
        "addresses": addresses,
    }


def _fetch_customer(cursor, customer_id: str):
    cursor.execute(
        """
        SELECT customerID, customerName, customerIDName, customerType
        FROM customer_master
        WHERE customerID = %s
        """,
        (customer_id,),
    )

    customer = cursor.fetchone()

    if customer is None:
        return None

    cursor.execute(
        """
        SELECT city, town, district, state, postalCode, landmark, nearbyAddress
        FROM customer_master_addresses
        WHERE customerID = %s
        ORDER BY createdAt, id
        """,
        (customer_id,),
    )

    return _serialize_customer(customer, cursor.fetchall())


def _insert_addresses(
    cursor,
    customer_id: str,
    addresses: list[dict[str, Any]],
):
    if not addresses:
        return

    cursor.executemany(
        """
        INSERT INTO customer_master_addresses
            (
                id,
                customerID,
                city,
                town,
                district,
                state,
                postalCode,
                landmark,
                nearbyAddress
            )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            (
                str(uuid.uuid4()),
                customer_id,
                *(address[field] for field in ADDRESS_FIELDS),
            )
            for address in addresses
        ],
    )
@customer_master_bp.route("/findAllCustomer", methods=["POST"])
def findAllCustomer():

    auth_response = _authorize()
    if auth_response:
        return auth_response

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT customerID, customerName, customerIDName, customerType
            FROM customer_master
        """)

        customers = cursor.fetchall()

        for customer in customers:
            customer["customerType"] = json.loads(customer["customerType"])

            cursor.execute("""
                SELECT city, town, district, state, postalCode, landmark, nearbyAddress
                FROM customer_master_addresses
                WHERE customerID = %s
            """, (customer["customerID"],))

            customer["addresses"] = cursor.fetchall()

        return jsonify({
            "statusCode": 200,
            "statusMsg": "Customers fetched successfully",
            "customers": customers
        })

    except Exception as e:
        return jsonify({
            "statusCode": 500,
            "statusMsg": str(e)
        }), 500

    finally:
        cursor.close()
        conn.close()

@customer_master_bp.route("", methods=["GET", "POST", "OPTIONS"])
def customers():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()

    if auth_error:
        return auth_error

    if request.method == "POST":
        payload = request.get_json(silent=True)

        if not isinstance(payload, dict):
            return _respond(400, "Request body is required")

        customer, validation_error = _normalize_customer(payload)

        if validation_error:
            return _respond(400, validation_error)

        conn = None
        cursor = None

        try:
            conn = get_connection()
            cursor = conn.cursor()
            conn.start_transaction()

            cursor.execute(
                """
                INSERT INTO customer_master
                    (customerID, customerName, customerIDName, customerType)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    customer["customerID"],
                    customer["customerName"],
                    customer["customerIDName"],
                    json.dumps(customer["customerType"]),
                ),
            )

            _insert_addresses(
                cursor,
                customer["customerID"],
                customer["addresses"],
            )

            conn.commit()

            return _respond(
                201,
                "Customer created successfully",
                customer=customer,
            )

        except mysql.connector.IntegrityError:
            if conn:
                conn.rollback()

            return _respond(409, "customerID already exists")

        except mysql.connector.Error:
            if conn:
                conn.rollback()

            current_app.logger.exception(
                "Database error while creating customer"
            )

            return _respond(500, "Database error while creating customer")

        finally:
            if cursor:
                cursor.close()

            if conn:
                conn.close()

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT customerID, customerName, customerIDName, customerType
            FROM customer_master
            ORDER BY customerID
            """
        )

        records = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                customerID,
                city,
                town,
                district,
                state,
                postalCode,
                landmark,
                nearbyAddress
            FROM customer_master_addresses
            ORDER BY createdAt, id
            """
        )

        addresses_by_customer: dict[str, list[dict[str, Any]]] = {}

        for address in cursor.fetchall():
            customer_id = address.pop("customerID")

            addresses_by_customer.setdefault(customer_id, []).append(address)

        customer_list = [
            _serialize_customer(
                record,
                addresses_by_customer.get(record["customerID"], []),
            )
            for record in records
        ]

        return _respond(
            200,
            "Customers fetched successfully",
            customers=customer_list,
        )

    except mysql.connector.Error:
        current_app.logger.exception(
            "Database error while fetching customers"
        )

        return _respond(500, "Database error while fetching customers")

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


@customer_master_bp.route(
    "/<string:customer_id>",
    methods=["GET", "PUT", "DELETE", "OPTIONS"],
)
def customer_by_id(customer_id: str):
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()

    if auth_error:
        return auth_error

    if request.method == "DELETE":
        conn = None
        cursor = None

        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(
                "DELETE FROM customer_master WHERE customerID = %s",
                (customer_id,),
            )

            if cursor.rowcount == 0:
                return _respond(404, "Customer not found")

            conn.commit()

            return _respond(200, "Customer deleted successfully")

        except mysql.connector.Error:
            if conn:
                conn.rollback()

            current_app.logger.exception(
                "Database error while deleting customer"
            )

            return _respond(500, "Database error while deleting customer")

        finally:
            if cursor:
                cursor.close()

            if conn:
                conn.close()

    if request.method == "PUT":
        payload = request.get_json(silent=True)

        if not isinstance(payload, dict):
            return _respond(400, "Request body is required")

        customer, validation_error = _normalize_customer(payload)

        if validation_error:
            return _respond(400, validation_error)

        if customer["customerID"] != customer_id:
            return _respond(
                400,
                "customerID in the request must match the URL",
            )

        conn = None
        cursor = None

        try:
            conn = get_connection()
            cursor = conn.cursor()
            conn.start_transaction()

            cursor.execute(
                """
                UPDATE customer_master
                SET
                    customerName = %s,
                    customerIDName = %s,
                    customerType = %s
                WHERE customerID = %s
                """,
                (
                    customer["customerName"],
                    customer["customerIDName"],
                    json.dumps(customer["customerType"]),
                    customer_id,
                ),
            )

            if cursor.rowcount == 0:
                cursor.execute(
                    "SELECT customerID FROM customer_master WHERE customerID = %s",
                    (customer_id,),
                )

                if cursor.fetchone() is None:
                    conn.rollback()
                    return _respond(404, "Customer not found")

            cursor.execute(
                "DELETE FROM customer_master_addresses WHERE customerID = %s",
                (customer_id,),
            )

            _insert_addresses(
                cursor,
                customer_id,
                customer["addresses"],
            )

            conn.commit()

            return _respond(
                200,
                "Customer updated successfully",
                customer=customer,
            )

        except mysql.connector.Error:
            if conn:
                conn.rollback()

            current_app.logger.exception(
                "Database error while updating customer"
            )

            return _respond(500, "Database error while updating customer")

        finally:
            if cursor:
                cursor.close()

            if conn:
                conn.close()

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        customer = _fetch_customer(cursor, customer_id)

        if customer is None:
            return _respond(404, "Customer not found")

        return _respond(
            200,
            "Customer fetched successfully",
            customer=customer,
        )

    except mysql.connector.Error:
        current_app.logger.exception(
            "Database error while fetching customer"
        )

        return _respond(500, "Database error while fetching customer")

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
