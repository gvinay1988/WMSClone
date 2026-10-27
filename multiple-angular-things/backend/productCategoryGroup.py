import json
import os
import uuid
from typing import Any

import jwt
import mysql.connector
from flask import Blueprint, current_app, jsonify, request

from database import get_connection


product_category_group_bp = Blueprint("product_category_group", __name__)

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
CATEGORY_FIELDS = ("category1", "category2", "category3")


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
        return respond(401, "Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return respond(401, "Missing bearer token")

    try:
        payload: dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            return respond(401, "Invalid token")
    except jwt.ExpiredSignatureError:
        return respond(401, "Token expired")
    except jwt.PyJWTError:
        return respond(401, "Invalid token")
    return None


def initialize_product_category_group():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS product_category_groups (
                id CHAR(36) PRIMARY KEY,
                groupName VARCHAR(100) NOT NULL,
                category1 LONGTEXT NOT NULL,
                category2 LONGTEXT NOT NULL,
                category3 LONGTEXT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _normalize_group(payload: dict[str, Any]):
    group_name = payload.get("groupName")
    if not isinstance(group_name, str) or not group_name.strip():
        return None, "Group name is required"
    group_name = group_name.strip()
    if len(group_name) > 100:
        return None, "Group name must be 100 characters or fewer"

    values = {"groupName": group_name}
    for field in CATEGORY_FIELDS:
        categories = payload.get(field, [])
        if not isinstance(categories, list):
            return None, f"{field} must be a list"

        normalized_categories = []
        seen = set()
        for category in categories:
            if not isinstance(category, str) or not category.strip():
                return None, f"{field} values must be non-empty strings"
            category = category.strip()
            if len(category) > 255:
                return None, f"{field} values must be 255 characters or fewer"
            if category not in seen:
                seen.add(category)
                normalized_categories.append(category)
        values[field] = normalized_categories
    return values, None


def _serialize_group(record_id: str, values: dict[str, Any]):
    return {
        "id": record_id,
        "groupName": values["groupName"],
        "category1": values["category1"],
        "category2": values["category2"],
        "category3": values["category3"],
    }


@product_category_group_bp.route(
    "/productCategoryGroup/services/saveorUpdateProductCategoryGroup",
    methods=["POST", "OPTIONS"],
)
def save_or_update_product_category_group():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return respond(400, "Request body is required")

    values, validation_error = _normalize_group(payload)
    if validation_error:
        return respond(400, validation_error)

    record_id = payload.get("id")
    if record_id is not None and (
        not isinstance(record_id, str) or not record_id.strip()
    ):
        return respond(400, "Group id must be a non-empty string")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if record_id:
            record_id = record_id.strip()
            cursor.execute(
                "SELECT id FROM product_category_groups WHERE id = %s",
                (record_id,),
            )
            if not cursor.fetchone():
                return respond(404, "Product category group not found")
            cursor.execute(
                """
                UPDATE product_category_groups
                SET groupName = %s, category1 = %s, category2 = %s, category3 = %s,
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    values["groupName"],
                    json.dumps(values["category1"]),
                    json.dumps(values["category2"]),
                    json.dumps(values["category3"]),
                    record_id,
                ),
            )
            conn.commit()
            return respond(
                200,
                "Product category group updated successfully",
                operation="UPDATE",
                group=_serialize_group(record_id, values),
            )

        record_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO product_category_groups
                (id, groupName, category1, category2, category3)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                record_id,
                values["groupName"],
                json.dumps(values["category1"]),
                json.dumps(values["category2"]),
                json.dumps(values["category3"]),
            ),
        )
        conn.commit()
        return respond(
            201,
            "Product category group saved successfully",
            operation="CREATE",
            group=_serialize_group(record_id, values),
        )
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while saving product category group")
        return respond(500, "Database error while saving product category group")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@product_category_group_bp.route(
    "/productCategoryGroup/services/fetchAllProductCategoryGroups",
    methods=["POST", "OPTIONS"],
)
def fetch_all_product_category_groups():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return respond(401, "Unauthorized", groupList=[])

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, groupName, category1, category2, category3
            FROM product_category_groups
            ORDER BY createdAt DESC, groupName
            """
        )
        groups = []
        for row in cursor.fetchall():
            groups.append({
                "id": row["id"],
                "groupName": row["groupName"],
                "category1": json.loads(row["category1"]),
                "category2": json.loads(row["category2"]),
                "category3": json.loads(row["category3"]),
            })
        return respond(
            200,
            "Product category groups fetched successfully",
            groupList=groups,
        )
    except (mysql.connector.Error, json.JSONDecodeError):
        current_app.logger.exception("Error while fetching product category groups")
        return respond(500, "Error while fetching product category groups", groupList=[])
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@product_category_group_bp.route(
    "/productCategoryGroup/services/deleteProductCategoryGroup",
    methods=["POST", "OPTIONS"],
)
def delete_product_category_group():
    if request.method == "OPTIONS":
        return "", 200

    auth_error = _authorize()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    record_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(record_id, str) or not record_id.strip():
        return respond(400, "Product category group id is required")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM product_category_groups WHERE id = %s",
            (record_id.strip(),),
        )
        if cursor.rowcount == 0:
            return respond(404, "Product category group not found")
        conn.commit()
        return respond(
            200,
            "Product category group deleted successfully",
            operation="DELETE",
            groupId=record_id.strip(),
        )
    except mysql.connector.Error:
        if conn:
            conn.rollback()
        current_app.logger.exception("Database error while deleting product category group")
        return respond(500, "Database error while deleting product category group")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
