import math
import os
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request


product_master_bp = Blueprint("product_master", __name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

TEXT_FIELDS = {
    "product": 255,
    "description": 2000,
    "hsnType": 20,
    "hsnCode": 50,
    "configuration": 255,
    "dfsCode": 100,
    "type": 100,
    "productClass": 100,
    "productType": 100,
    "upcEan": 100,
    "warehouse": 100,
    "baseUnit": 50,
    "salesUnit": 50,
    "purchaseUnit": 50,
    "instructions": 10000,
}
NUMERIC_FIELDS = (
    "length", "width", "height", "weight", "mrp", "sellingPrice", "tax",
    "minStock", "maxStock", "leadTime",
)
PRODUCT_COLUMNS = (
    "id", "name", "product", "description", "category", "hsnType", "hsnCode",
    "category1", "category2", "category3", "configuration", "dfsCode", "type",
    "productClass", "productType", "upcEan", "warehouse", "productImage", "length",
    "width", "height", "weight", "mrp", "sellingPrice", "tax", "baseUnit",
    "salesUnit", "purchaseUnit", "minStock", "maxStock", "leadTime", "instructions",
)
MAX_PRODUCT_EXCEL_ROWS = 5000


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),
        database=os.getenv("MYSQL_DATABASE", "employee_db"),
        autocommit=True,
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


def _authorize():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return "Missing bearer token"

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return "Missing bearer token"

    try:
        payload: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            return "Invalid token"
    except jwt.ExpiredSignatureError:
        return "Token expired"
    except jwt.PyJWTError:
        return "Invalid token"
    return None


def _normalize_product(payload: dict[str, Any]):
    values: dict[str, Any] = {}
    for field, max_length in (("id", 100), ("name", 255)):
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            return None, f"{field} is required"
        value = value.strip()
        if len(value) > max_length:
            return None, f"{field} must be {max_length} characters or fewer"
        values[field] = value

    category = payload.get("category")
    if category is None or (isinstance(category, str) and not category.strip()):
        values["category"] = None
    elif not isinstance(category, str):
        return None, "category must be a string"
    else:
        category = category.strip()
        if len(category) > 100:
            return None, "category must be 100 characters or fewer"
        values["category"] = category

    for field, max_length in TEXT_FIELDS.items():
        value = payload.get(field, "")
        if value is None:
            value = ""
        if not isinstance(value, str):
            return None, f"{field} must be a string"
        value = value.strip()
        if len(value) > max_length:
            return None, f"{field} must be {max_length} characters or fewer"
        values[field] = value

    for field in ("category1", "category2", "category3"):
        value = payload.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            values[field] = None
            continue
        if not isinstance(value, str):
            return None, f"{field} must be a string"
        value = value.strip()
        if len(value) > 100:
            return None, f"{field} must be 100 characters or fewer"
        values[field] = value

    image = payload.get("productImage", "")
    if image is None or (isinstance(image, str) and not image.strip()):
        values["productImage"] = None
    elif not isinstance(image, str):
        return None, "productImage must be a valid image"
    else:
        image = image.strip()
        if not image.startswith("data:image/"):
            return None, "productImage must be a valid image"
        if len(image) > 8 * 1024 * 1024:
            return None, "Product image must be 8 MB or smaller"
        values["productImage"] = image

    for field in NUMERIC_FIELDS:
        value = payload.get(field)
        if value in (None, ""):
            values[field] = None
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None, f"{field} must be a number"
        try:
            numeric_value = float(value)
        except OverflowError:
            return None, f"{field} is outside the supported range"
        if not math.isfinite(numeric_value) or numeric_value < 0:
            return None, f"{field} must be a finite non-negative number"
        maximum = 2147483647 if field == "leadTime" else 99999.999 if field == "tax" else 99999999999.999
        if numeric_value > maximum:
            return None, f"{field} is outside the supported range"
        if field == "leadTime" and not numeric_value.is_integer():
            return None, "leadTime must be a whole number"
        values[field] = int(numeric_value) if field == "leadTime" else numeric_value

    return values, None


def initialize_product_master():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS product_master (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                product VARCHAR(255) NOT NULL DEFAULT '',
                description VARCHAR(2000) NOT NULL DEFAULT '',
                category VARCHAR(100) NULL,
                hsnType VARCHAR(20) NOT NULL DEFAULT '',
                hsnCode VARCHAR(50) NOT NULL DEFAULT '',
                category1 VARCHAR(100) NULL DEFAULT NULL,
                category2 VARCHAR(100) NULL DEFAULT NULL,
                category3 VARCHAR(100) NULL DEFAULT NULL,
                configuration VARCHAR(255) NOT NULL DEFAULT '',
                dfsCode VARCHAR(100) NOT NULL DEFAULT '',
                `type` VARCHAR(100) NOT NULL DEFAULT '',
                productClass VARCHAR(100) NOT NULL DEFAULT '',
                productType VARCHAR(100) NOT NULL DEFAULT '',
                upcEan VARCHAR(100) NOT NULL DEFAULT '',
                warehouse VARCHAR(100) NOT NULL DEFAULT '',
                productImage LONGTEXT NULL,
                length DECIMAL(14, 3),
                width DECIMAL(14, 3),
                height DECIMAL(14, 3),
                weight DECIMAL(14, 3),
                mrp DECIMAL(14, 3),
                sellingPrice DECIMAL(14, 3),
                tax DECIMAL(8, 3),
                baseUnit VARCHAR(50) NOT NULL DEFAULT '',
                salesUnit VARCHAR(50) NOT NULL DEFAULT '',
                purchaseUnit VARCHAR(50) NOT NULL DEFAULT '',
                minStock DECIMAL(14, 3),
                maxStock DECIMAL(14, 3),
                leadTime INT,
                instructions TEXT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            ALTER TABLE product_master
                    MODIFY category VARCHAR(100) NULL,
                    MODIFY category1 VARCHAR(100) NULL DEFAULT NULL,
                    MODIFY category2 VARCHAR(100) NULL DEFAULT NULL,
                    MODIFY category3 VARCHAR(100) NULL DEFAULT NULL,
                    MODIFY productImage LONGTEXT NULL
            """
        )
        cursor.execute(
            """
            UPDATE product_master
            SET category = NULLIF(TRIM(category), ''),
                    category1 = NULLIF(TRIM(category1), ''),
                    category2 = NULLIF(TRIM(category2), ''),
                    category3 = NULLIF(TRIM(category3), ''),
                    productImage = NULLIF(TRIM(productImage), '')
            WHERE category = ''
                    OR category1 = ''
                    OR category2 = ''
                    OR category3 = ''
                    OR productImage = ''
            """
        )
    finally:
        cursor.close()
        conn.close()


def _close(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


def _product_json_row(payload):
    if not isinstance(payload, dict):
        return None, "Product row must be an object"

    aliases = {
        "product": "product",
        "productid": "id",
        "productname": "name",
    }
    column_by_header = {
        "".join(character.lower() for character in column if character.isalnum()): column
        for column in PRODUCT_COLUMNS
    }
    normalized = {}
    for header, value in payload.items():
        if not isinstance(header, str):
            continue
        key = "".join(character.lower() for character in header if character.isalnum())
        if not key or key == "sno":
            continue
        column = aliases.get(key, column_by_header.get(key))
        if column is None:
            continue
        normalized[column] = value

    for column in NUMERIC_FIELDS:
        value = normalized.get(column)
        if value is None or (isinstance(value, str) and not value.strip()):
            normalized[column] = None
            continue
        if isinstance(value, bool):
            return None, f"{column} must be a number"
        if isinstance(value, str):
            try:
                normalized[column] = float(value)
            except ValueError:
                return None, f"{column} must be a number"
    for column in PRODUCT_COLUMNS:
        if column in NUMERIC_FIELDS:
            continue
        value = normalized.get(column)
        if value is not None and not isinstance(value, str):
            normalized[column] = str(value).strip()

    return normalized, None


@product_master_bp.route(
    "/productMaster/services/saveorUpdateProductMaster",
    methods=["POST", "OPTIONS"],
)
def save_or_update_product():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")

    values, validation_error = _normalize_product(payload)
    if validation_error:
        return respond(400, validation_error)

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM product_master WHERE id = %s", (values["id"],))
        exists = cursor.fetchone() is not None
        columns = ", ".join(f"`{column}`" for column in PRODUCT_COLUMNS)
        if exists:
            assignments = ", ".join(
                f"`{column}` = %s" for column in PRODUCT_COLUMNS if column != "id"
            )
            cursor.execute(
                f"UPDATE product_master SET {assignments}, updatedAt = CURRENT_TIMESTAMP WHERE id = %s",
                tuple(values[column] for column in PRODUCT_COLUMNS if column != "id")
                + (values["id"],),
            )
            conn.commit()
            return respond(
                200, "Product updated successfully", operation="UPDATE", productId=values["id"]
            )

        placeholders = ", ".join(["%s"] * len(PRODUCT_COLUMNS))
        cursor.execute(
            f"INSERT INTO product_master ({columns}) VALUES ({placeholders})",
            tuple(values[column] for column in PRODUCT_COLUMNS),
        )
        conn.commit()
        return respond(
            201, "Product saved successfully", operation="CREATE", productId=values["id"]
        )
    except mysql.connector.IntegrityError:
        if conn:
            conn.rollback()
        return respond(409, "A product with this ID already exists")
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving product")
        return respond(500, "Database error while saving product")
    finally:
        _close(cursor, conn)


@product_master_bp.route(
    "/productMaster/services/fetchAllProducts",
    methods=["POST", "OPTIONS"],
)
def fetch_all_products():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, auth_error, productList=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT {", ".join(f"`{column}`" for column in PRODUCT_COLUMNS)}
            FROM product_master
            ORDER BY updatedAt DESC, name, id
            """
        )
        return respond(200, "Products fetched successfully", productList=cursor.fetchall())
    except mysql.connector.Error:
        current_app.logger.exception("Database error while fetching products")
        return respond(500, "Database error while fetching products", productList=[])
    finally:
        _close(cursor, conn)


@product_master_bp.route(
    "/productMaster/services/uploadProductsExcel",
    methods=["POST", "OPTIONS"],
)
def upload_products_excel():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("products"), list):
        return respond(400, "Request body must contain a products array")

    product_rows = payload["products"]
    if not product_rows:
        return respond(400, "The request contains no product rows")
    if len(product_rows) > MAX_PRODUCT_EXCEL_ROWS:
        return respond(400, f"Request cannot contain more than {MAX_PRODUCT_EXCEL_ROWS} product rows")

    imported_count = 0
    failures = []
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        for row_number, row in enumerate(product_rows, start=2):
            product, row_error = _product_json_row(row)
            if row_error:
                failures.append({"row": row_number, "reason": row_error})
                continue

            values, validation_error = _normalize_product(product)
            if validation_error:
                failures.append({
                    "row": row_number,
                    "productId": product.get("id"),
                    "reason": validation_error,
                })
                continue

            cursor.execute("SELECT id FROM product_master WHERE id = %s", (values["id"],))
            exists = cursor.fetchone() is not None
            if exists:
                update_columns = [
                    column for column in PRODUCT_COLUMNS
                    if column != "id" and column in product
                ]
                assignments = ", ".join(f"`{column}` = %s" for column in update_columns)
                cursor.execute(
                    f"UPDATE product_master SET {assignments}, updatedAt = CURRENT_TIMESTAMP WHERE id = %s",
                    tuple(values[column] for column in update_columns) + (values["id"],),
                )
            else:
                columns = ", ".join(f"`{column}`" for column in PRODUCT_COLUMNS)
                placeholders = ", ".join(["%s"] * len(PRODUCT_COLUMNS))
                cursor.execute(
                    f"INSERT INTO product_master ({columns}) VALUES ({placeholders})",
                    tuple(values[column] for column in PRODUCT_COLUMNS),
                )
            conn.commit()
            imported_count += 1

        return respond(
            200,
            "Product Excel upload processed",
            importedCount=imported_count,
            failureCount=len(failures),
            failures=failures,
        )
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while uploading product rows")
        return respond(500, "Database error while uploading product rows")
    finally:
        _close(cursor, conn)


@product_master_bp.route(
    "/productMaster/services/deleteProductMaster",
    methods=["POST", "OPTIONS"],
)
def delete_product():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, auth_error)

    payload = request.get_json(silent=True)
    product_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(product_id, str) or not product_id.strip():
        return respond(400, "Product ID is required")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM product_master WHERE id = %s", (product_id.strip(),))
        if cursor.rowcount == 0:
            return respond(404, "Product not found")
        conn.commit()
        return respond(200, "Product deleted successfully", operation="DELETE", productId=product_id)
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting product")
        return respond(500, "Database error while deleting product")
    finally:
        _close(cursor, conn)
