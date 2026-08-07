# MultipleAngularThings

This project contains an Angular frontend and a Python FastAPI backend for employee CRUD operations with JWT authentication.

## Start the backend

1. Open a terminal in the project root.
2. Create and activate a Python virtual environment if needed.
3. Install the backend dependencies:

```bash
pip install -r backend/requirements.txt
```

4. Start the API:

```bash
python backend/app.py
```

The backend will run at:

- http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health

## Start the Angular app

1. Install frontend dependencies:

```bash
npm install
```

2. Start the Angular development server:

```bash
npm start
```

3. Open the app in your browser:

- http://localhost:4200

## Login credentials

Use the following demo credentials for the login page:

- Email: admin@example.com
- Password: password123

## Build the Angular app

To create a production build:

```bash
npm run build
```

## SQL Server connection

The backend is prepared for SQL Server through pyodbc. To use SQL Server instead of the in-memory fallback, set this environment variable before starting the API:

```bash
set SQL_SERVER_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=YOUR_SERVER;Database=YOUR_DB;UID=YOUR_USER;PWD=YOUR_PASSWORD;Encrypt=yes;TrustServerCertificate=no;
```

If the variable is not set, the API uses in-memory sample data.
