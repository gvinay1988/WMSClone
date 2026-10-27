import re

import mysql.connector
from flask import Blueprint, jsonify, request
from database import get_connection

parameter_bp = Blueprint("parameter", __name__, url_prefix="/parameter")


def initialize_parameter():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS country_parameter (
                id INT AUTO_INCREMENT PRIMARY KEY,
                country_name VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS category_parameter (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_number TINYINT NOT NULL,
                category_name VARCHAR(255) NOT NULL,
                UNIQUE KEY uq_category_number_name (category_number, category_name)
            )
        """)
        cursor.execute("""
                CREATE TABLE IF NOT EXISTS application_branding (
                    id TINYINT PRIMARY KEY,
                    dashboard_text VARCHAR(500) NOT NULL DEFAULT '',
                    header_image MEDIUMTEXT NULL
                )
        """)
        cursor.execute("""
                INSERT IGNORE INTO application_branding (id, dashboard_text, header_image)
                VALUES (1, '', NULL)
        """)
    finally:
        cursor.close()
        conn.close()


def respond(success, code, msg, **extra):
    body = {
        "status": "success" if success else "error",
        "statusCode": code,
        "statusMsg": msg,
        "success": success,
    }
    body.update(extra)
    return jsonify(body), code



@parameter_bp.post("/service/saveCountryDetails")
def save_country_details():
    data = request.get_json(silent=True) or {}
    country_name = (data.get("countryName") or "").strip()

    if not country_name:
        return respond(False, 400, "Country name is required")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO country_parameter (country_name) VALUES (%s)",
            (country_name,),
        )
        conn.commit()
        country_id = cursor.lastrowid

        return respond(
            True, 200, "Country saved successfully",
            countryParameterData={
                "id": country_id,
                "countryName": country_name
            },
        )
    except mysql.connector.IntegrityError:
        conn.rollback()
        return respond(False, 409, "Country already exists")
    finally:
        cursor.close()
        conn.close()

@parameter_bp.post("/service/getCountryDetails")
def get_countries():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, country_name AS countryName "
            "FROM country_parameter ORDER BY id DESC"
        )
        return respond(
            True, 200, "Countries fetched successfully",
            countryParameterData=cursor.fetchall(),
        )
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/saveCategoryDetails")
def save_category_details():
    data = request.get_json(silent=True) or {}
    category_number = data.get("categoryNumber")
    category_name = (data.get("categoryName") or "").strip()

    if isinstance(category_number, bool) or category_number not in (1, 2, 3):
        return respond(False, 400, "Category number must be 1, 2, or 3")
    if not category_name:
        return respond(False, 400, "Category name is required")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO category_parameter (category_number, category_name) "
            "VALUES (%s, %s)",
            (category_number, category_name),
        )
        conn.commit()
        return respond(
            True, 200, "Category saved successfully",
            categoryParameterData={
                "id": cursor.lastrowid,
                "categoryNumber": category_number,
                "categoryName": category_name,
            },
        )
    except mysql.connector.IntegrityError:
        conn.rollback()
        return respond(False, 409, "Category already exists")
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/getCategoryDetails")
def get_categories():
    data = request.get_json(silent=True) or {}
    category_number = data.get("categoryNumber")
    if (
        category_number is not None
        and (isinstance(category_number, bool) or category_number not in (1, 2, 3))
    ):
        return respond(False, 400, "Category number must be 1, 2, or 3")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = (
            "SELECT id, category_number AS categoryNumber, "
            "category_name AS categoryName FROM category_parameter"
        )
        params = ()
        if category_number is not None:
            query += " WHERE category_number = %s"
            params = (category_number,)
        query += " ORDER BY id DESC"
        cursor.execute(query, params)
        return respond(
            True, 200, "Categories fetched successfully",
            categoryParameterData=cursor.fetchall(),
        )
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/getApplicationBranding")
def get_application_branding():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT dashboard_text AS dashboardText, header_image AS headerImage "
            "FROM application_branding WHERE id = 1"
        )
        settings = cursor.fetchone()
        if settings is None:
            settings = {"dashboardText": "", "headerImage": None}
        return respond(
            True, 200, "Application branding fetched successfully",
            applicationBrandingData=settings,
        )
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/saveApplicationBranding")
def save_application_branding():
    data = request.get_json(silent=True) or {}
    dashboard_text = data.get("dashboardText", "")
    header_image = data.get("headerImage")

    if not isinstance(dashboard_text, str) or len(dashboard_text) > 500:
        return respond(False, 400, "Dashboard text must be 500 characters or fewer")
    if header_image is not None and (
        not isinstance(header_image, str)
        or len(header_image) > 2_800_000
        or not re.fullmatch(
            r"data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}",
            header_image,
        )
    ):
        return respond(False, 400, "Upload a valid PNG, JPEG, WEBP, or GIF image under 2 MB")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO application_branding (id, dashboard_text, header_image)
            VALUES (1, %s, %s)
            ON DUPLICATE KEY UPDATE
                dashboard_text = VALUES(dashboard_text),
                header_image = COALESCE(VALUES(header_image), header_image)
            """,
            (dashboard_text.strip(), header_image),
        )
        conn.commit()
        return respond(True, 200, "Application branding saved successfully")
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/deleteCategoryDetails")
def delete_category():
    data = request.get_json(silent=True) or {}
    category_id = data.get("id")

    if not category_id:
        return respond(False, 400, "Category ID is required")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM category_parameter WHERE id = %s",
            (category_id,),
        )
        if cursor.rowcount == 0:
            return respond(False, 404, "Category not found")

        conn.commit()
        return respond(True, 200, "Category deleted successfully")
    finally:
        cursor.close()
        conn.close()


@parameter_bp.post("/service/deleteCountryDetails")
def delete_country():
    data = request.get_json(silent=True) or {}
    country_id = data.get("id")

    if not country_id:
        return respond(False, 400, "Country ID is required")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM country_parameter WHERE id = %s",
            (country_id,)
        )

        if cursor.rowcount == 0:
            return respond(False, 404, "Country not found")

        conn.commit()
        return respond(True, 200, "Country deleted successfully")
    finally:
        cursor.close()
        conn.close()