import mysql.connector
from flask import Blueprint, jsonify, request
from database import get_connection
import secrets

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

    country_id = secrets.token_hex(6)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO country_parameter (id, country_name) VALUES (%s, %s)",
            (country_id, country_name),
        )
        conn.commit()

        return respond(
            True, 200, "Country saved successfully",
            countryParameterData={
                "_id": country_id,
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

    except Exception as e:
        conn.rollback()
        return respond(False, 500, str(e))

    finally:
        cursor.close()
        conn.close()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM country_parameter WHERE id = %s", (country_id,)
        )
        if cursor.rowcount == 0:
            return respond(False, 404, "Country not found")
        return respond(True, 200, "Country deleted successfully")
    finally:
        cursor.close()
        conn.close()