# ============================================================
# SUPPLIER.PY - BEGINNER FRIENDLY VERSION
# ============================================================
#
# This file is a Flask backend module for Supplier Master.
#
# Main job of this file:
# 1. Create/register a Flask Blueprint for supplier APIs.
# 2. Connect to MySQL.
# 3. Validate the JWT token sent by Angular.
# 4. Create the suppliers table if it does not exist.
# 5. Receive supplier data from the Angular frontend.
# 6. Check whether the supplier already exists.
# 7. UPDATE the supplier if it exists.
# 8. CREATE a new supplier if it does not exist.
# 9. Return a JSON response to Angular.
#
# Request flow:
#
# Angular
#    |
#    | POST + JSON payload + Authorization: Bearer <JWT>
#    v
# Flask route
#    |
#    +--> Check OPTIONS/CORS
#    |
#    +--> Validate JWT
#    |
#    +--> Read JSON payload
#    |
#    +--> Validate required fields
#    |
#    +--> Connect to MySQL
#    |
#    +--> Search supplierCode
#           |
#           +--> Found    -> UPDATE
#           |
#           +--> Not found -> CREATE
#    |
#    v
# JSON response
#
# ============================================================


# ------------------------------------------------------------
# 1. IMPORTS
# ------------------------------------------------------------

import os
# os allows Python to communicate with operating-system
# environment variables.
#
# Example:
# MYSQL_HOST=127.0.0.1
#
# Python can read it using:
# os.getenv("MYSQL_HOST")


import uuid
# uuid is used to generate a unique ID for every new supplier.
#
# Example generated ID:
# "550e8400-e29b-41d4-a716-446655440000"


from typing import Any
# Any is a typing helper.
# It means a variable can contain any Python data type.
# It is used below while defining the JWT payload.


import jwt
# PyJWT library.
# It is used to decode and validate the JWT token received
# from the Angular application.


import mysql.connector
# This library allows Python/Flask to connect to MySQL.


from flask import Blueprint, jsonify, request
# Blueprint:
#   Used to keep supplier-related routes in a separate module.
#
# jsonify:
#   Converts Python dictionaries into JSON HTTP responses.
#
# request:
#   Gives us access to the incoming HTTP request.
#   Example:
#       request.headers
#       request.get_json()
#       request.method
#       request.path


# ============================================================
# 2. CREATE SUPPLIER BLUEPRINT
# ============================================================

# Blueprint is like a separate group/module of Flask routes.
#
# "supplier" is the internal name of this Blueprint.
# __name__ tells Flask where this Blueprint is defined.
supplier_bp = Blueprint("supplier", __name__)


# These print statements run when this Python file is loaded.
# They are useful for debugging because we can see in the terminal
# that supplier.py was actually imported.
print("")
print("=========================================================")
print("SUPPLIER.PY LOADED")
print("Supplier Blueprint created successfully")
print("=========================================================")
print("")
print("########### SUPPLIER.PY IS BEING LOADED ###########")


# ============================================================
# 3. JWT CONFIGURATION
# ============================================================

# JWT_SECRET is read from an environment variable.
#
# If JWT_SECRET is not configured, "dev-secret-key" is used.
# This fallback is convenient for development, but in production
# a strong secret should be configured in the environment.
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")


# JWT_ALGORITHM is also read from the environment.
# If it is not present, HS256 is used.
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


print("[SUPPLIER] JWT algorithm:", ALGORITHM)
print("[SUPPLIER] JWT secret configured:", bool(SECRET_KEY))


# ============================================================
# 4. MYSQL CONNECTION FUNCTION
# ============================================================

def get_connection():
    # This function creates and returns a connection to MySQL.
    #
    # IMPORTANT:
    # Defining a function does NOT execute it immediately.
    # The code inside this function runs only when another part
    # of the program calls:
    #
    #     get_connection()

    print("[SUPPLIER] Connecting to MySQL...")

    # mysql.connector.connect() creates the actual MySQL connection.
    #
    # Each value is read from an environment variable.
    # If the environment variable does not exist, the second value
    # passed to os.getenv() is used as the default.

    conn = mysql.connector.connect(
        # MySQL server address.
        # Default: local computer.
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),

        # Default MySQL port is 3306.
        # int() converts the text value into an integer.
        port=int(os.getenv("MYSQL_PORT", "3306")),

        # MySQL username.
        user=os.getenv("MYSQL_USER", "root"),

        # MySQL password.
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),

        # Database/schema name.
        database=os.getenv("MYSQL_DATABASE", "employee_db"),

        # When True, database changes are committed automatically.
        autocommit=True
    )

    print("[SUPPLIER] MySQL connection successful")

    # Return the connection object to the code that called this function.
    return conn


# ============================================================
# 5. JWT VALIDATION
# ============================================================

def get_current_user() -> str:
    # This function checks the Authorization header.
    # It extracts the JWT token and validates it.
    #
    # If the token is valid:
    #     return logged-in user's identity.
    #
    # If the token is missing/invalid/expired:
    #     raise ValueError(...)

    print("[SUPPLIER] Checking JWT token...")

    # request.headers contains HTTP request headers.
    #
    # Expected header:
    #
    # Authorization: Bearer eyJhbGciOi...
    #
    # If Authorization does not exist, "" is returned.
    authorization = request.headers.get("Authorization", "")

    print(
        "[SUPPLIER] Authorization header present:",
        bool(authorization)
    )
    # bool("")       -> False
    # bool("Bearer") -> True


    # A valid Authorization header must start with:
    # "Bearer "
    if not authorization.startswith("Bearer "):
        print("[SUPPLIER] ERROR: Missing Bearer token")

        # raise stops this function and sends the error back
        # to the calling try/except block.
        raise ValueError("Missing bearer token")


    # Split only once at the first space.
    #
    # Example:
    # "Bearer ABC123"
    #
    # split(" ", 1) gives:
    # ["Bearer", "ABC123"]
    #
    # [1] gets:
    # "ABC123"
    token = authorization.split(" ", 1)[1].strip()


    # Make sure a token actually exists after "Bearer ".
    if not token:
        print("[SUPPLIER] ERROR: Empty token")
        raise ValueError("Missing bearer token")


    try:
        # jwt.decode() verifies and decodes the JWT.
        #
        # token:
        #     The JWT received from Angular.
        #
        # SECRET_KEY:
        #     The secret used to verify the token.
        #
        # algorithms:
        #     The allowed JWT algorithm.
        payload: dict[str, Any] = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # JWT payload normally contains information such as:
        #
        # {
        #     "sub": "user@example.com",
        #     ...
        # }
        #
        # "sub" normally represents the subject/user identity.
        current_user = payload.get("sub", "")

        print("[SUPPLIER] JWT validation successful")
        print("[SUPPLIER] Logged-in user:", current_user)

        # Return the logged-in user.
        return current_user


    except jwt.ExpiredSignatureError:
        # This exception means the JWT exists but its expiry time
        # has passed.
        print("[SUPPLIER] ERROR: JWT token expired")
        raise ValueError("Token expired")


    except jwt.PyJWTError:
        # Any other PyJWT error comes here.
        # For example: invalid signature, malformed token, etc.
        print("[SUPPLIER] ERROR: Invalid JWT token")
        raise ValueError("Invalid token")


# ============================================================
# 6. CREATE SUPPLIER TABLE
# ============================================================

def initialize_supplier_table():
    # This function creates the suppliers table if it does not exist.
    #
    # CREATE TABLE IF NOT EXISTS means:
    # - If table does not exist -> create it.
    # - If table already exists -> do nothing.

    print("")
    print("=========================================================")
    print("[SUPPLIER] INITIALIZING SUPPLIERS TABLE")
    print("=========================================================")

    # Start with None because a connection/cursor may not have
    # been created if an error happens early.
    conn = None
    cursor = None

    try:
        # Open MySQL connection.
        conn = get_connection()

        print("[SUPPLIER] Database connection object created")


        # Cursor is used to execute SQL commands.
        cursor = conn.cursor()

        print("[SUPPLIER] SQL cursor created")


        # Execute SQL CREATE TABLE command.
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS suppliers (

                -- Unique ID of the supplier.
                id CHAR(36) PRIMARY KEY,

                -- Supplier code.
                -- UNIQUE means two suppliers cannot have the same code.
                supplierCode VARCHAR(100) NOT NULL UNIQUE,

                -- Supplier name is required.
                supplierName VARCHAR(255) NOT NULL,

                -- Remaining fields are optional.
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

                -- Automatically stores creation date/time.
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Automatically stores last update date/time.
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )

        print("[SUPPLIER] CREATE TABLE SQL executed")


        # Commit makes database changes permanent.
        conn.commit()

        print("[SUPPLIER] suppliers table created/verified successfully")


    except Exception as exc:
        # If anything goes wrong, execution comes here.
        print("[SUPPLIER] ERROR while creating suppliers table:")
        print("[SUPPLIER] Exception type:", type(exc).__name__)
        print("[SUPPLIER] Exception message:", exc)


    finally:
        # finally ALWAYS executes after try/except.
        # It is useful for cleanup.

        if cursor:
            # Close the SQL cursor if it was successfully created.
            cursor.close()
            print("[SUPPLIER] SQL cursor closed")

        if conn:
            # Close the MySQL connection if it was successfully created.
            conn.close()
            print("[SUPPLIER] MySQL connection closed")

    print("=========================================================")
    print("")


# ============================================================
# 7. SUPPLIER INITIALIZATION
# ============================================================

def initialize_supplier():
    # This is a small wrapper function.
    #
    # When this function is called, it creates/verifies
    # the suppliers table.

    print("[SUPPLIER] initialize_supplier() called")

    initialize_supplier_table()

    print("[SUPPLIER] Supplier initialization completed")
    print("")


# ============================================================
# 8. SAVE / UPDATE SUPPLIER API
# ============================================================

# @supplier_bp.route(...) is a Flask decorator.
#
# It tells Flask:
# "When this URL is called, execute save_or_update_supplier()."
#
# URL:
# /supplier/services/saveorUpdateSupplierMaster
#
# Allowed methods:
# POST   -> Angular sends supplier data.
# OPTIONS -> Browser CORS preflight request.
@supplier_bp.route(
    "/supplier/services/saveorUpdateSupplierMaster",
    methods=["POST", "OPTIONS"]
)
def save_or_update_supplier():

    # This function executes whenever the API endpoint above
    # receives a POST or OPTIONS request.

    print("")
    print("=========================================================")
    print("[SUPPLIER API] REQUEST RECEIVED")
    print("Method :", request.method)
    print("Path   :", request.path)
    print("=========================================================")


    # ========================================================
    # 8.1 HANDLE CORS PREFLIGHT
    # ========================================================

    # Browsers may send an OPTIONS request before the real POST.
    #
    # This is called a CORS preflight request.
    #
    # We simply return HTTP 200 so the browser knows the request
    # is allowed to continue.
    if request.method == "OPTIONS":

        print("[SUPPLIER API] OPTIONS / PREFLIGHT REQUEST")
        print("[SUPPLIER API] Returning 200")
        print("=========================================================")
        print("")

        return "", 200


    # ========================================================
    # 8.2 JWT VALIDATION
    # ========================================================

    try:
        # Check the Authorization header/JWT.
        current_user = get_current_user()

        print("[SUPPLIER API] Authenticated user:", current_user)


    except ValueError as exc:
        # If get_current_user() raises ValueError,
        # the request is rejected.

        print("[SUPPLIER API] JWT ERROR:", str(exc))

        # Return JSON response with HTTP 401 Unauthorized.
        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 401


    # ========================================================
    # 8.3 GET REQUEST PAYLOAD
    # ========================================================

    # request.get_json() reads the JSON body sent by Angular.
    #
    # silent=True means Flask will return None instead of throwing
    # an error if the body is not valid JSON.
    payload = request.get_json(silent=True)

    print("[SUPPLIER API] Request payload:")
    print(payload)


    # Check whether a payload was actually received.
    if not payload:

        print("[SUPPLIER API] ERROR: Request body is empty")

        return jsonify({
            "success": False,
            "detail": "Request body is required"
        }), 400


    # ========================================================
    # 8.4 REQUIRED FIELDS
    # ========================================================

    # Read supplierCode from JSON.
    #
    # Example:
    # payload = {
    #     "supplierCode": "SUP001",
    #     "supplierName": "ABC Supplier"
    # }
    #
    # payload.get("supplierCode") returns "SUP001".
    supplier_code = payload.get("supplierCode")


    # Read supplierName from JSON.
    supplier_name = payload.get("supplierName")


    print("[SUPPLIER API] Supplier Code :", supplier_code)
    print("[SUPPLIER API] Supplier Name :", supplier_name)


    # supplierCode is mandatory.
    if not supplier_code:

        print("[SUPPLIER API] ERROR: supplierCode is required")

        return jsonify({
            "success": False,
            "detail": "supplierCode is required"
        }), 400


    # supplierName is mandatory.
    if not supplier_name:

        print("[SUPPLIER API] ERROR: supplierName is required")

        return jsonify({
            "success": False,
            "detail": "supplierName is required"
        }), 400


    # These variables will later store:
    # conn   -> MySQL connection
    # cursor -> SQL cursor
    #
    # Start them as None so finally can safely check them.
    conn = None
    cursor = None


    try:

        # ====================================================
        # 8.5 MYSQL CONNECTION
        # ====================================================

        print("[SUPPLIER API] Connecting to MySQL...")

        conn = get_connection()

        # dictionary=True means SQL rows are returned as dictionaries.
        #
        # Without dictionary=True:
        #     ("abc123",)
        #
        # With dictionary=True:
        #     {"id": "abc123"}
        cursor = conn.cursor(dictionary=True)

        print("[SUPPLIER API] Database cursor created")


        # ====================================================
        # 8.6 CHECK WHETHER SUPPLIER ALREADY EXISTS
        # ====================================================

        print(
            "[SUPPLIER API] Checking supplier code:",
            supplier_code
        )


        # Search for a supplier having this supplierCode.
        #
        # %s is a parameter placeholder.
        # The actual value is supplied separately as:
        #
        #     (supplier_code,)
        #
        # This is safer than building SQL by string concatenation.
        cursor.execute(
            """
            SELECT id
            FROM suppliers
            WHERE supplierCode = %s
            """,
            (supplier_code,)
        )


        # fetchone() gets one matching row.
        #
        # If found:
        #     {"id": "..."}
        #
        # If not found:
        #     None
        existing_supplier = cursor.fetchone()

        print("[SUPPLIER API] Existing supplier:", existing_supplier)


        # ====================================================
        # 8.7 UPDATE EXISTING SUPPLIER
        # ====================================================

        if existing_supplier:

            print("[SUPPLIER API] Existing supplier found")
            print("[SUPPLIER API] Performing UPDATE")


            # Get the existing supplier's primary key.
            supplier_id = existing_supplier["id"]

            print("[SUPPLIER API] Existing Supplier ID:", supplier_id)


            # UPDATE changes the existing database row.
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


            # Save the UPDATE permanently.
            conn.commit()

            print("[SUPPLIER API] UPDATE successful")
            print("[SUPPLIER API] Supplier ID:", supplier_id)


            # Return success response to Angular.
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


        # ====================================================
        # 8.8 CREATE NEW SUPPLIER
        # ====================================================

        # If execution reaches here, existing_supplier was None.
        # Therefore no supplier with this code was found.

        print("[SUPPLIER API] Supplier does not exist")
        print("[SUPPLIER API] Performing CREATE")


        # Generate a unique ID for the new supplier.
        supplier_id = str(uuid.uuid4())

        print("[SUPPLIER API] New Supplier ID:", supplier_id)


        # INSERT adds a completely new row.
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


        # Save INSERT permanently.
        conn.commit()

        print("[SUPPLIER API] CREATE successful")
        print("[SUPPLIER API] Supplier ID:", supplier_id)


        # Return HTTP 201 because a new resource was created.
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


    # ========================================================
    # 8.9 MYSQL ERROR
    # ========================================================

    except mysql.connector.Error as exc:

        # Rollback cancels the current database transaction.
        if conn:
            conn.rollback()

        print("[SUPPLIER API] MYSQL ERROR:")
        print("[SUPPLIER API] Error type:", type(exc).__name__)
        print("[SUPPLIER API] Error message:", exc)


        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500


    # ========================================================
    # 8.10 OTHER/PYTHON ERROR
    # ========================================================

    except Exception as exc:

        if conn:
            conn.rollback()

        print("[SUPPLIER API] GENERAL ERROR:")
        print("[SUPPLIER API] Error type:", type(exc).__name__)
        print("[SUPPLIER API] Error message:", exc)


        return jsonify({
            "success": False,
            "detail": str(exc)
        }), 500


    # ========================================================
    # 8.11 CLEANUP
    # ========================================================

    finally:

        # Close cursor after database work is finished.
        if cursor:
            cursor.close()
            print("[SUPPLIER API] Database cursor closed")


        # Close MySQL connection.
        if conn:
            conn.close()
            print("[SUPPLIER API] Database connection closed")


        print("=========================================================")
        print("[SUPPLIER API] REQUEST PROCESSING FINISHED")
        print("=========================================================")
        print("")


# ============================================================
# 9. IMPORTANT NOTE ABOUT INITIALIZATION
# ============================================================
#
# initialize_supplier() is only a function definition.
#
# This file itself does NOT automatically call it here.
#
# Somewhere in the main Flask application, the developer needs
# to call initialize_supplier(), usually while creating/starting
# the application.
#
# Example:
#
#     initialize_supplier()
#
# This will create/verify the suppliers table.
#
# The Blueprint also needs to be registered in the main Flask app:
#
#     app.register_blueprint(supplier_bp)
#
# Then Flask knows that the route inside this Blueprint exists.
#
# ============================================================


# ============================================================
# 10. QUICK BEGINNER SUMMARY
# ============================================================
#
# import
#   -> bring external Python functionality into this file.
#
# Blueprint
#   -> groups supplier-related Flask APIs.
#
# get_connection()
#   -> connects Python to MySQL.
#
# get_current_user()
#   -> checks whether Angular sent a valid JWT.
#
# initialize_supplier_table()
#   -> creates suppliers table if it does not exist.
#
# initialize_supplier()
#   -> calls the table initialization function.
#
# @supplier_bp.route(...)
#   -> maps a URL to a Python function.
#
# request
#   -> gives access to incoming HTTP data.
#
# request.get_json()
#   -> reads Angular's JSON request body.
#
# payload.get(...)
#   -> reads individual values from the JSON object.
#
# cursor.execute(...)
#   -> sends SQL to MySQL.
#
# SELECT
#   -> reads/searches data.
#
# UPDATE
#   -> changes existing data.
#
# INSERT
#   -> creates new data.
#
# conn.commit()
#   -> saves database changes.
#
# conn.rollback()
#   -> cancels a failed database transaction.
#
# jsonify(...)
#   -> sends JSON back to Angular.
#
# 200
#   -> request succeeded, commonly used here for UPDATE.
#
# 201
#   -> new resource was created.
#
# 400
#   -> bad request, such as missing required data.
#
# 401
#   -> authentication/JWT problem.
#
# 500
#   -> server/database/program error.
#
# finally
#   -> cleanup code that runs whether an error happened or not.
#
# ============================================================
