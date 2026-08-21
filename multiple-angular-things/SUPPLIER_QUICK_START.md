# Supplier Master - Quick Start

## Step 1: Start Backend

```bash
cd backend
python supplier.py
```

Server will run at: `http://127.0.0.1:8000`

## Step 2: Start Frontend

```bash
ng serve
```

Frontend will run at: `http://127.0.0.1:4200`

## Step 3: Login

Navigate to login page and enter:
- **Email**: `admin@example.com`
- **Password**: `password123`

## Step 4: Use Supplier Master

After login:
1. Click on Supplier Master menu
2. Fill in supplier details (Code and Name are required)
3. Click "Save Supplier"
4. View all suppliers in the table below
5. Delete suppliers using the delete button

## Key Features

✅ JWT Authentication - All requests include Bearer token automatically
✅ Form Validation - Required fields marked with *
✅ Real-time Feedback - Toast notifications for success/error
✅ Supplier List - View all suppliers with pagination
✅ Delete Functionality - Remove suppliers with confirmation
✅ Database Persistence - Data saved to MySQL/SQLite

## API Endpoints

- `POST /suppliers` - Create supplier
- `GET /suppliers` - Get all suppliers
- `GET /suppliers/{id}` - Get supplier by ID
- `PUT /suppliers/{id}` - Update supplier
- `DELETE /suppliers/{id}` - Delete supplier

All endpoints require: `Authorization: Bearer {jwt_token}`

## Database Schema

Suppliers table with fields:
- supplierCode (required, unique)
- supplierName (required)
- supplierType
- contactPerson
- email
- phone
- mobile
- gstNumber
- panNumber
- address
- city
- pinCode

## Troubleshooting

### 401 Error
Login again to refresh token

### 400 Error
Fill all required fields (Code and Name)

### Can't connect to backend
Ensure Flask is running on port 8000

### Can't login
Check email/password: `admin@example.com` / `password123`

## Full Documentation

See `SUPPLIER_MASTER_SETUP.md` for complete documentation including:
- Architecture overview
- Environment configuration
- Complete data flow
- Error handling
- Testing with curl
- Customization guide
