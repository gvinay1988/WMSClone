import os
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request


product_by_supplier_bp = Blueprint("product_by_supplier", __name__)
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=False,
    )


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
            authorization.split(" ", 1)[1].strip(), SECRET_KEY, algorithms=[ALGORITHM]
        )
        return None if payload.get("sub") else "Invalid token"
    except jwt.ExpiredSignatureError:
        return "Token expired"
    except jwt.PyJWTError:
        return "Invalid token"


def initialize_product_by_supplier():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS supplier_products (
                supplierId CHAR(36) NOT NULL,
                productId VARCHAR(100) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (supplierId, productId),
                FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES product_master(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while creating supplier_products table")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def close(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


@product_by_supplier_bp.route("/productBySupplier/services/fetchOptions", methods=["POST", "OPTIONS"])
def fetch_options():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, suppliers=[], products=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, supplierCode, supplierName, city, supplierType FROM suppliers "
            "ORDER BY supplierName, supplierCode"
        )
        suppliers = cursor.fetchall()
        cursor.execute(
            "SELECT id, name, product, description, category, hsnCode FROM product_master "
            "ORDER BY name, id"
        )
        products = cursor.fetchall()
        return respond(200, "Options fetched successfully", suppliers=suppliers, products=products)
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching product-by-supplier options")
        return respond(500, "Database error while fetching options", suppliers=[], products=[])
    finally:
        close(cursor, conn)


@product_by_supplier_bp.route("/productBySupplier/services/fetchSupplierProducts", methods=["POST", "OPTIONS"])
def fetch_supplier_products():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error, productIds=[])

    payload = request.get_json(silent=True) or {}
    supplier_id = payload.get("supplierId")
    if not isinstance(supplier_id, str) or not supplier_id.strip():
        return respond(400, "supplierId is required", productIds=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        supplier_id = supplier_id.strip()
        cursor.execute("SELECT id FROM suppliers WHERE id = %s", (supplier_id,))
        if cursor.fetchone() is None:
            return respond(404, "Supplier not found", productIds=[])
        cursor.execute(
            "SELECT productId FROM supplier_products WHERE supplierId = %s ORDER BY productId",
            (supplier_id,),
        )
        return respond(200, "Supplier products fetched successfully", productIds=[row[0] for row in cursor.fetchall()])
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching supplier products")
        return respond(500, "Database error while fetching supplier products", productIds=[])
    finally:
        close(cursor, conn)


@product_by_supplier_bp.route("/productBySupplier/services/saveSupplierProducts", methods=["POST", "OPTIONS"])
def save_supplier_products():
    if request.method == "OPTIONS":
        return "", 200
    auth_error = authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True) or {}
    supplier_id = payload.get("supplierId")
    product_ids = payload.get("productIds")
    if not isinstance(supplier_id, str) or not supplier_id.strip():
        return respond(400, "supplierId is required")
    if not isinstance(product_ids, list) or not all(isinstance(value, str) and value.strip() for value in product_ids):
        return respond(400, "productIds must be an array of product IDs")

    supplier_id = supplier_id.strip()
    product_ids = list(dict.fromkeys(value.strip() for value in product_ids))
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM suppliers WHERE id = %s", (supplier_id,))
        if cursor.fetchone() is None:
            return respond(404, "Supplier not found")

        if product_ids:
            placeholders = ", ".join(["%s"] * len(product_ids))
            cursor.execute(f"SELECT id FROM product_master WHERE id IN ({placeholders})", tuple(product_ids))
            valid_ids = {row[0] for row in cursor.fetchall()}
            invalid_ids = set(product_ids) - valid_ids
            if invalid_ids:
                return respond(400, f"Invalid product IDs: {', '.join(sorted(invalid_ids))}")

        cursor.execute("DELETE FROM supplier_products WHERE supplierId = %s", (supplier_id,))
        cursor.executemany(
            "INSERT INTO supplier_products (supplierId, productId) VALUES (%s, %s)",
            [(supplier_id, product_id) for product_id in product_ids],
        )
        conn.commit()
        return respond(200, "Product assignments saved successfully")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving supplier products")
        return respond(500, "Database error while saving product assignments")
    finally:
        close(cursor, conn)
