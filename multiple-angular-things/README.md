# MultipleAngularThings

This project contains an Angular frontend and a Python Flask API backed by MySQL.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the application architecture and request flow.

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

The backend runs at `http://127.0.0.1:8000`. Its status endpoint is `http://127.0.0.1:8000/`.

## Product master API

The product master endpoints require the bearer token returned by `/auth/login`:

- `POST /productMaster/services/saveorUpdateProductMaster` creates a product or updates the product matching its `id`.
- `POST /productMaster/services/fetchAllProducts` returns the product list.
- `POST /productMaster/services/deleteProductMaster` deletes the product matching the submitted `id`.

The product table is created automatically when the backend starts.

## Start the Angular app

1. Install frontend dependencies:

```bash
npm install
```

2. Start the Angular development server:

```bash
npm start
```

3. Open `http://localhost:4200` in your browser.

## Login credentials

Use the local demo credentials configured by the backend:

- Email: `admin@example.com`
- Password: `password123`

## Build the Angular app

```bash
npm run build
```

## MySQL connection

The backend defaults to a local MySQL database named `employee_db`. Configure the connection with these environment variables before starting the API:

```powershell
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
$env:MYSQL_USER = "your_user"
$env:MYSQL_PASSWORD = "your_password"
$env:MYSQL_DATABASE = "employee_db"
python backend/app.py
```

## Server-side rendering

The Angular app can also be served through its Node.js/Express SSR server on port `4000` by default. The Flask API remains a separate service.
