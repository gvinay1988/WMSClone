# ============================================================
# app.py - BEGINNER FRIENDLY VERSION
# ============================================================
#
# This is the MAIN Flask application file.
#
# Its job is to:
#
# 1. Create the Flask application.
# 2. Register the Supplier Blueprint.
# 3. Configure CORS so Angular can call Flask.
# 4. Configure JWT settings.
# 5. Connect to MySQL.
# 6. Create the users table if it does not exist.
# 7. Create the default admin user.
# 8. Create JWT tokens after successful login.
# 9. Provide the /auth/login API.
# 10. Provide a simple / API to check whether Flask is running.
# 11. Start the Flask development server.
#
#
# COMPLETE FLOW:
#
# Angular Login Page
#       |
#       | POST /auth/login
#       | JSON:
#       | {
#       |   "email": "...",
#       |   "password": "..."
#       | }
#       v
# Flask login()
#       |
#       +--> Read JSON
#       |
#       +--> Validate email/password
#       |
#       +--> Connect MySQL
#       |
#       +--> Search users table
#       |
#       +--> User found?
#              |
#              +-- NO --> 401 Invalid login
#              |
#              +-- YES
#                   |
#                   +--> Create JWT
#                   |
#                   +--> Return token + user
#       |
#       v
# Angular receives JWT
#
# ============================================================


# ============================================================
# 1. IMPORTS
# ============================================================

import os
# os allows Python to read environment variables.
#
# Example:
#     MYSQL_HOST=127.0.0.1
#
# Python can read it using:
#     os.getenv("MYSQL_HOST")


from datetime import datetime, timedelta, timezone
# datetime:
#     Used to get the current date/time.
#
# timedelta:
#     Used to add a period of time, such as 60 minutes.
#
# timezone:
#     Used here to create a UTC-based date/time.


import jwt
# PyJWT library.
#
# It is used to CREATE JWT tokens after successful login.
#
# The supplier.py file also uses jwt, but there it is used mainly
# to VALIDATE/DECODE the token.


import mysql.connector
# Allows Python to connect to MySQL.


from flask import Flask, jsonify, request
# Flask:
#     Creates the Flask application.
#
# jsonify:
#     Converts Python dictionaries into JSON HTTP responses.
#
# request:
#     Gives access to information sent by the Angular/frontend
#     application.


from flask_cors import CORS
# CORS allows the browser to permit requests from another origin.
#
# Your Angular application runs on:
#     http://localhost:4200
#
# Your Flask application runs on:
#     http://127.0.0.1:8000
#
# These are different origins, so CORS is needed.


# ============================================================
# 2. IMPORT SUPPLIER BLUEPRINT
# ============================================================

from supplier import supplier_bp, initialize_supplier
# supplier_bp:
#     The Blueprint containing supplier-related APIs.
#
# initialize_supplier:
#     Function that creates/verifies the suppliers table.
#
# This means app.py does not need to contain all supplier logic.
# The supplier code stays inside supplier.py.


# ============================================================
# 3. CREATE FLASK APPLICATION
# ============================================================

# Flask(__name__) creates the Flask application object.
#
# "app" is the main object that manages:
# - routes
# - requests
# - responses
# - configuration
# - middleware such as CORS
app = Flask(__name__)


print("")
print("=========================================================")
print("FLASK APPLICATION STARTING")
print("=========================================================")


# ============================================================
# 4. REGISTER SUPPLIER BLUEPRINT
# ============================================================

# supplier_bp contains the supplier API routes.
#
# register_blueprint() tells Flask:
#
# "Add all routes defined inside supplier_bp to this application."
#
# Without this line, Flask would not know about the supplier
# routes defined in supplier.py.
app.register_blueprint(supplier_bp)


print("[APP] Supplier Blueprint registered successfully")


# Print all routes known by Flask.
#
# This is VERY useful for debugging.
#
# It lets you see things such as:
#
# /auth/login
# /
# /supplier/services/saveorUpdateSupplierMaster
#
# and the HTTP methods allowed for those routes.
print("[APP] REGISTERED ROUTES:")
print(app.url_map)


# ============================================================
# 5. CORS CONFIGURATION
# ============================================================

# CORS = Cross-Origin Resource Sharing.
#
# Your frontend and backend are running on different origins:
#
# Angular:
#     http://localhost:4200
#
# Flask:
#     http://127.0.0.1:8000
#
# The browser normally restricts cross-origin requests.
# CORS tells Flask which frontend origins are allowed.


CORS(
    app,

    # resources means:
    # Apply this CORS configuration to routes matching /*.
    resources={
        r"/*": {

            # Only these Angular addresses are allowed to call
            # the Flask APIs.
            "origins": [
                "http://localhost:4200",
                "http://127.0.0.1:4200"
            ],

            # HTTP methods allowed from the frontend.
            "methods": [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            ],

            # HTTP request headers allowed from Angular.
            #
            # Content-Type:
            #     Used when sending JSON.
            #
            # Authorization:
            #     Used when sending:
            #     Authorization: Bearer <JWT>
            "allow_headers": [
                "Content-Type",
                "Authorization"
            ]
        }
    }
)


print("[APP] CORS configured")
print("[APP] Allowed Angular origins:")
print("       http://localhost:4200")
print("       http://127.0.0.1:4200")


# ============================================================
# 6. JWT CONFIGURATION
# ============================================================

# Secret key used to sign JWT tokens.
#
# os.getenv("JWT_SECRET", "dev-secret-key") means:
#
# 1. Look for an environment variable named JWT_SECRET.
# 2. If it exists, use that value.
# 3. If it does not exist, use "dev-secret-key".
#
# The fallback is convenient for development.
# In production, a strong secret should be stored securely.
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key")


# JWT algorithm.
#
# HS256 is the default here.
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# How long the JWT remains valid.
#
# Environment variable:
#     JWT_EXPIRE_MINUTES
#
# If it does not exist:
#     60 minutes is used.
#
# int() converts the environment-variable text into an integer.
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "60")
)


print("[APP] JWT algorithm:", ALGORITHM)
print("[APP] JWT expiration:", ACCESS_TOKEN_EXPIRE_MINUTES, "minutes")


# ============================================================
# 7. MYSQL CONNECTION FUNCTION
# ============================================================

def get_connection():
    # This function creates a connection to MySQL.
    #
    # IMPORTANT:
    # Defining a function does not execute it.
    #
    # It executes only when we call:
    #
    #     get_connection()

    print("[APP] Connecting to MySQL...")


    # mysql.connector.connect() creates the actual database
    # connection.
    conn = mysql.connector.connect(

        # MySQL server address.
        # Default:
        #     127.0.0.1
        #
        # This means MySQL is running on this computer.
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),


        # MySQL default port is 3306.
        #
        # int() converts "3306" from string to integer.
        port=int(os.getenv("MYSQL_PORT", "3306")),


        # MySQL username.
        user=os.getenv("MYSQL_USER", "root"),


        # MySQL password.
        #
        # The value shown here is the development fallback
        # from your existing code.
        password=os.getenv("MYSQL_PASSWORD", "gvinay123"),


        # Database/schema that will be used.
        database=os.getenv("MYSQL_DATABASE", "employee_db"),


        # Automatically commit database changes.
        autocommit=True
    )


    print("[APP] MySQL connection successful")

    # Return the connection object.
    return conn


# ============================================================
# 8. CREATE USERS TABLE
# ============================================================

def initialize_database():
    # This function prepares the users table.
    #
    # It does two things:
    #
    # 1. Creates users table if it does not exist.
    # 2. Inserts a default admin user if one does not exist.


    print("")
    print("=========================================================")
    print("[APP] INITIALIZING USERS TABLE")
    print("=========================================================")


    # Open a MySQL connection.
    conn = get_connection()


    try:

        # A cursor allows us to execute SQL commands.
        cursor = conn.cursor()

        print("[APP] SQL cursor created")


        # ====================================================
        # CREATE USERS TABLE
        # ====================================================

        # CREATE TABLE IF NOT EXISTS means:
        #
        # If the users table does not exist:
        #     create it.
        #
        # If it already exists:
        #     do nothing.
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (

                -- Automatically generated numeric ID.
                id INT AUTO_INCREMENT PRIMARY KEY,

                -- User email.
                -- UNIQUE means duplicate email addresses
                -- are not allowed.
                email VARCHAR(255) UNIQUE NOT NULL,

                -- User password.
                password VARCHAR(255) NOT NULL,

                -- User role.
                -- If no role is supplied, admin is used.
                role VARCHAR(50) DEFAULT 'admin'
            )
            """
        )


        print("[APP] users table created/verified successfully")


        # ====================================================
        # INSERT DEFAULT ADMIN USER
        # ====================================================

        # INSERT IGNORE means:
        #
        # Try to insert the user.
        #
        # If the email already exists because of the UNIQUE
        # constraint, ignore that duplicate insert.
        #
        # This prevents the application from failing every time
        # it starts when admin@example.com already exists.
        cursor.execute(
            """
            INSERT IGNORE INTO users
            (email, password, role)
            VALUES (%s, %s, %s)
            """,
            (
                "admin@example.com",
                "password123",
                "admin"
            )
        )


        print("[APP] Default admin user checked/created")


        # Commit database changes.
        conn.commit()

        print("[APP] Users database initialization successful")


        # Close cursor after database work is complete.
        cursor.close()

        print("[APP] SQL cursor closed")


    finally:

        # finally runs whether the try block succeeds or fails.
        #
        # Close the MySQL connection so resources are released.
        conn.close()

        print("[APP] MySQL connection closed")

        print("=========================================================")
        print("")


# ============================================================
# 9. INITIALIZE DATABASE TABLES
# ============================================================

# These functions are called when this app.py file starts.
#
# First:
#     Create/check users table.
#
# Second:
#     Create/check suppliers table.
#
# So when Flask starts, both tables should be ready.
print("[APP] Starting database initialization...")

initialize_database()
print("[APP] Users initialization completed")

initialize_supplier()
print("[APP] Supplier initialization completed")

print("[APP] Database initialization finished")


# ============================================================
# 10. CREATE JWT TOKEN
# ============================================================

def create_access_token(email: str, role: str) -> str:
    # This function creates a JWT after successful login.
    #
    # email:
    #     The logged-in user's email.
    #
    # role:
    #     The user's role, for example "admin".
    #
    # -> str:
    #     Means the function is expected to return a string.


    print("[JWT] Creating access token for:", email)


    # JWT payload contains information that will be stored
    # inside the token.
    payload = {

        # "sub" = subject.
        #
        # Here we store the user's email as the subject.
        "sub": email,


        # Store user's role inside JWT.
        "role": role,


        # "exp" = expiration time.
        #
        # datetime.now(timezone.utc):
        #     Gets current UTC time.
        #
        # timedelta(minutes=...):
        #     Adds the configured number of minutes.
        #
        # The token becomes invalid after this time.
        "exp": datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    }


    print("[JWT] JWT payload prepared")


    # jwt.encode() converts the payload into a JWT string.
    #
    # SECRET_KEY:
    #     Used to digitally sign the token.
    #
    # algorithm:
    #     Tells JWT which signing algorithm to use.
    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


    print("[JWT] Access token created successfully")


    # Return the generated JWT to the login API.
    return token


# ============================================================
# 11. LOGIN API
# ============================================================

# @app.post() is a Flask route decorator.
#
# It means:
#
# When an HTTP POST request comes to:
#
#     /auth/login
#
# Flask executes the login() function.
@app.post("/auth/login")
def login():

    print("")
    print("=========================================================")
    print("[LOGIN API] REQUEST RECEIVED")
    print("[LOGIN API] Method:", request.method)
    print("[LOGIN API] Path:", request.path)
    print("=========================================================")


    # ========================================================
    # 11.1 READ JSON REQUEST
    # ========================================================

    # request.get_json(silent=True):
    #
    # Reads JSON sent by Angular.
    #
    # Example Angular payload:
    #
    # {
    #     "email": "admin@example.com",
    #     "password": "password123"
    # }
    #
    # If JSON is missing/invalid, silent=True returns None.
    #
    # "or {}" means:
    #
    # If the result is None, use an empty dictionary instead.
    payload = request.get_json(silent=True) or {}


    print("[LOGIN API] Request payload:")
    print(payload)


    # ========================================================
    # 11.2 READ EMAIL AND PASSWORD
    # ========================================================

    # Get email from JSON.
    email = payload.get("email")


    # Get password from JSON.
    password = payload.get("password")


    print("[LOGIN API] Email:", email)

    # Do NOT normally print passwords in a real application.
    #
    # We print only whether a password was received.
    print(
        "[LOGIN API] Password received:",
        bool(password)
    )


    # ========================================================
    # 11.3 VALIDATE REQUEST
    # ========================================================

    # If either email or password is missing,
    # reject the request.
    if not email or not password:

        print("[LOGIN API] ERROR: Email/password missing")

        # 400 = Bad Request.
        #
        # It means the client sent incomplete/invalid data.
        return jsonify({
            "detail": "Email and password are required"
        }), 400


    print("[LOGIN API] Request validation successful")


    # ========================================================
    # 11.4 CONNECT TO MYSQL
    # ========================================================

    print("[LOGIN API] Connecting to MySQL...")

    conn = get_connection()


    try:

        # dictionary=True means each database row comes back
        # as a dictionary.
        #
        # Example:
        #
        # {
        #     "email": "admin@example.com",
        #     "role": "admin"
        # }
        cursor = conn.cursor(dictionary=True)


        print("[LOGIN API] SQL cursor created")


        # ====================================================
        # 11.5 SEARCH FOR USER
        # ====================================================

        # SELECT reads data from the users table.
        #
        # WHERE checks conditions.
        #
        # %s is a parameter placeholder.
        #
        # The actual email/password values are supplied separately.
        #
        # This parameterized query is preferable to building SQL
        # using string concatenation.
        cursor.execute(
            """
            SELECT email, role
            FROM users
            WHERE email = %s
            AND password = %s
            """,
            (
                email,
                password
            )
        )


        print("[LOGIN API] User query executed")


        # fetchone() gets the first matching row.
        #
        # If a matching user exists:
        #
        # {
        #     "email": "admin@example.com",
        #     "role": "admin"
        # }
        #
        # If no matching user exists:
        #
        # None
        user = cursor.fetchone()


        print("[LOGIN API] User found:", bool(user))


        # ====================================================
        # 11.6 INVALID LOGIN
        # ====================================================

        # If user is None, email/password did not match.
        if not user:

            print("[LOGIN API] ERROR: Invalid email or password")

            # 401 = Unauthorized.
            return jsonify({
                "detail": "Invalid email or password"
            }), 401


        print("[LOGIN API] Login credentials are valid")
        print("[LOGIN API] Logged-in email:", user["email"])
        print("[LOGIN API] User role:", user["role"])


        # ====================================================
        # 11.7 GENERATE JWT
        # ====================================================

        # The credentials are valid.
        #
        # Now create a JWT containing:
        #     email
        #     role
        #     expiration time
        token = create_access_token(
            user["email"],
            user["role"]
        )


        # ====================================================
        # 11.8 SEND LOGIN RESPONSE
        # ====================================================

        # Return JSON to Angular.
        #
        # Example response:
        #
        # {
        #     "token": "eyJhbGciOi...",
        #     "user": {
        #         "email": "admin@example.com",
        #         "role": "admin"
        #     },
        #     "message": "Login successful"
        # }
        #
        # 200 = successful HTTP request.
        print("[LOGIN API] Login successful")
        print("[LOGIN API] Sending JWT token to Angular")


        return jsonify({

            # JWT token that Angular can store and later send
            # in the Authorization header.
            "token": token,


            # Basic logged-in user information.
            "user": {
                "email": user["email"],
                "role": user["role"]
            },


            # Human-readable message.
            "message": "Login successful"

        }), 200


    finally:

        # Close cursor after database work.
        cursor.close()

        print("[LOGIN API] SQL cursor closed")


        # Close MySQL connection.
        conn.close()

        print("[LOGIN API] MySQL connection closed")

        print("=========================================================")
        print("[LOGIN API] REQUEST PROCESSING FINISHED")
        print("=========================================================")
        print("")


# ============================================================
# 12. ROOT API
# ============================================================

# This is a very simple GET endpoint.
#
# When you open:
#
#     http://127.0.0.1:8000/
#
# Flask executes root().
#
# It is useful as a quick test to check whether the backend
# application is running.
@app.get("/")
def root():

    print("[ROOT API] Root endpoint called")


    return jsonify({
        "message": "WMS Nexus Authentication API is running"
    })


# ============================================================
# 13. RUN FLASK APPLICATION
# ============================================================

# This condition checks whether this file is being run directly.
#
# If you execute:
#
#     python app.py
#
# then __name__ becomes "__main__" and this code runs.
#
# If another Python file imports app.py, this block does not
# start another Flask server.
if __name__ == "__main__":

    print("")
    print("=========================================================")
    print("STARTING WMS NEXUS FLASK SERVER")
    print("URL: http://127.0.0.1:8000")
    print("=========================================================")


    # Start Flask's development server.
    app.run(

        # Flask listens only on the local computer.
        host="127.0.0.1",


        # Backend API port.
        port=8000,


        # debug=True enables Flask development/debug features.
        #
        # IMPORTANT:
        # Do not use debug=True in production.
        debug=True
    )


# ============================================================
# 14. BEGINNER SUMMARY
# ============================================================
#
# app.py is the MAIN ENTRY POINT of this backend.
#
# supplier.py:
#     Contains supplier-specific API logic.
#
# app.py:
#     Starts Flask and connects all major pieces together.
#
#
# IMPORTANT OBJECTS:
#
# app
#     -> Flask application.
#
# supplier_bp
#     -> Supplier Blueprint containing supplier routes.
#
# conn
#     -> MySQL database connection.
#
# cursor
#     -> Object used to execute SQL commands.
#
# payload
#     -> JSON data received from Angular.
#
# user
#     -> User record returned from MySQL.
#
# token
#     -> JWT created after successful login.
#
#
# IMPORTANT FUNCTIONS:
#
# get_connection()
#     -> Connect Python to MySQL.
#
# initialize_database()
#     -> Create users table and default admin user.
#
# initialize_supplier()
#     -> Create/verify suppliers table.
#
# create_access_token()
#     -> Create JWT after successful login.
#
# login()
#     -> Authenticate the user and return JWT.
#
# root()
#     -> Simple API to check whether Flask is running.
#
#
# IMPORTANT HTTP STATUS CODES:
#
# 200
#     Successful request.
#
# 201
#     Resource created successfully.
#
# 400
#     Bad request / missing required data.
#
# 401
#     Authentication failed.
#
# 500
#     Server/database/program error.
#
#
# LOGIN FLOW IN ONE LINE:
#
# Angular
#   -> POST /auth/login
#   -> Flask reads email/password
#   -> MySQL checks users table
#   -> User valid?
#   -> create_access_token()
#   -> JWT returned to Angular
#
#
# SUPPLIER FLOW IN ONE LINE:
#
# Angular
#   -> POST supplier API
#   -> JWT validation
#   -> Read JSON payload
#   -> Check supplierCode
#   -> Existing supplier?
#       YES -> UPDATE
#       NO  -> INSERT
#   -> Return JSON response
#
# ============================================================
