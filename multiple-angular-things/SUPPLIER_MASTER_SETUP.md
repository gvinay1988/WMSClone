# Supplier Master Setup - Complete Guide

## Overview
This document provides a complete setup guide for the Supplier Master feature with JWT authentication and database integration.

## Architecture

### Backend (Python/Flask)
- **File**: `backend/supplier.py`
- **API Endpoint**: `http://127.0.0.1:8000`
- **Database**: MySQL (with SQLite fallback)
- **Authentication**: JWT Bearer Token

### Frontend (Angular)
- **Component**: `src/app/Features/Master/supplier-master/`
- **Service**: `src/app/services/MasterDataService/supplieservice.ts`
- **Auth Interceptor**: Automatically adds JWT token to all requests

---

## Database Schema

### Suppliers Table
```sql
CREATE TABLE IF NOT EXISTS suppliers (
    id CHAR(36) PRIMARY KEY,
    supplierCode VARCHAR(100) NOT NULL UNIQUE,
    supplierName VARCHAR(255) NOT NULL,
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
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

---

## Backend API Endpoints

All endpoints require JWT authentication (Bearer token in Authorization header).

### 1. Get All Suppliers
```
GET http://127.0.0.1:8000/suppliers
Authorization: Bearer {token}

Response: Array of suppliers
```

### 2. Create Supplier
```
POST http://127.0.0.1:8000/suppliers
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "supplierCode": "SUP001",
  "supplierName": "Supplier Name",
  "supplierType": "Type",
  "contactPerson": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "mobile": "9876543210",
  "gstNumber": "27AABCU9603R1Z0",
  "panNumber": "AABCU9603R",
  "address": "123 Main St",
  "city": "City Name",
  "pinCode": "123456"
}

Response: { id, message, supplierCode, supplierName }
Status: 201
```

### 3. Get Single Supplier
```
GET http://127.0.0.1:8000/suppliers/{supplier_id}
Authorization: Bearer {token}

Response: Supplier object
```

### 4. Update Supplier
```
PUT http://127.0.0.1:8000/suppliers/{supplier_id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body: Same as Create (all fields)
Response: { message, id }
```

### 5. Delete Supplier
```
DELETE http://127.0.0.1:8000/suppliers/{supplier_id}
Authorization: Bearer {token}

Response: { message }
```

---

## Frontend Setup

### 1. Supplier Service
**File**: `src/app/services/MasterDataService/supplieservice.ts`

Methods available:
- `saveSupplier(supplier: Supplier)` - Create new supplier
- `getAllSuppliers()` - Fetch all suppliers
- `getSupplierById(id: string)` - Fetch single supplier
- `updateSupplier(id: string, supplier: Supplier)` - Update supplier
- `deleteSupplier(id: string)` - Delete supplier

### 2. Supplier Master Component
**File**: `src/app/Features/Master/supplier-master/supplier-master.ts`

Features:
- Reactive form with validation
- Save/Clear buttons
- Suppliers list with PrimeNG table
- Delete functionality with confirmation
- Toast notifications for success/error messages
- Loading states

### 3. Authentication Flow

#### Login
1. User logs in with email/password
2. Backend returns JWT token
3. Token is stored in localStorage
4. Auth interceptor automatically adds token to all subsequent requests

#### Token Usage
- All supplier API calls automatically include the Authorization header with Bearer token
- If token is invalid/expired, backend returns 401 error
- Token is managed by `auth.service.ts`

---

## Environment Configuration

### Backend Environment Variables (Optional)
```bash
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Database Configuration
USE_MYSQL=true
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=employee_db

# SQLite (fallback)
SQLITE_DB_PATH=./suppliers.sqlite3
```

### Frontend Environment
**File**: `src/app/Environment/environment.ts`
- Currently configured for production API: `https://dev.fruisce.in/wms/`
- Supplier service uses: `http://127.0.0.1:8000`

---

## Running the Application

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Flask app
python app.py

# Run Supplier app (separate terminal)
python supplier.py
```

The supplier backend will be available at: `http://127.0.0.1:8000`

### 2. Frontend Setup
```bash
# In the Angular project root
ng serve

# Open browser at: http://127.0.0.1:4200
```

### 3. Login
- Email: `admin@example.com`
- Password: `password123`

### 4. Navigate to Supplier Master
- After login, navigate to the Supplier Master page
- Use the form to create suppliers
- View all suppliers in the table below the form

---

## Complete Data Flow

```
User Fill Form
    ↓
Click "Save Supplier"
    ↓
Component validates form
    ↓
Calls supplierService.saveSupplier()
    ↓
HTTP POST to /suppliers
    ↓
Auth interceptor adds Bearer token
    ↓
Backend receives request with JWT validation
    ↓
Backend validates JWT token
    ↓
If valid: Insert into database, return 201
If invalid: Return 401 error
    ↓
Frontend receives response
    ↓
Show Toast notification (Success/Error)
    ↓
Clear form / Show error message
    ↓
Reload suppliers list
```

---

## Error Handling

### Common Errors

#### 1. 401 Unauthorized
- **Cause**: Missing or invalid JWT token
- **Solution**: Login again to get a new token

#### 2. 400 Bad Request
- **Cause**: Missing required fields (supplierCode, supplierName)
- **Solution**: Fill all required fields marked with *

#### 3. 500 Internal Server Error
- **Cause**: Database error
- **Solution**: Check backend logs for details

#### 4. CORS Error
- **Cause**: Frontend and backend origins mismatch
- **Solution**: Ensure backend CORS is configured for your frontend URL

---

## Testing the API with Curl

### 1. Login
```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Response:
# {"token":"eyJ0eXAiOiJKV1QiLCJhbGc...","user":{"email":"admin@example.com","role":"admin"},"message":"Login successful"}
```

### 2. Create Supplier
```bash
curl -X POST http://127.0.0.1:8000/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "supplierCode":"SUP001",
    "supplierName":"Test Supplier",
    "email":"supplier@example.com",
    "mobile":"9876543210"
  }'
```

### 3. Get All Suppliers
```bash
curl -X GET http://127.0.0.1:8000/suppliers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Delete Supplier
```bash
curl -X DELETE http://127.0.0.1:8000/suppliers/SUPPLIER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### Issue: Login works but Supplier API returns 401
- **Check**: Token is being stored in localStorage
- **Check**: Auth interceptor is configured in app.config.ts
- **Check**: Token format is: `Bearer {token}`
- **Check**: Token hasn't expired

### Issue: Form submission fails silently
- **Check**: Console for errors (F12)
- **Check**: Network tab to see API response
- **Check**: All required fields are filled

### Issue: Database error when saving
- **Check**: MySQL is running (if using MySQL)
- **Check**: Database credentials in environment variables
- **Check**: Supplier table exists and schema is correct

### Issue: PrimeNG components not displaying
- **Check**: PrimeNG is installed: `npm install primeng primeicons`
- **Check**: Angular animations module is provided
- **Check**: Import statements are correct in component

---

## Customization

### Change API Endpoint
Edit `src/app/services/MasterDataService/supplieservice.ts`:
```typescript
private apiUrl = 'http://127.0.0.1:8000';  // Change this
```

### Add New Fields
1. Add field to database schema
2. Update form in component:
   ```typescript
   this.supplierForm = this.fb.group({
     // ... existing fields
     newField: ['']  // Add here
   });
   ```
3. Add input to HTML template
4. Update Supplier interface in service

### Change Table Columns
Edit `src/app/Features/Master/supplier-master/supplier-master.html`
- Modify the table template columns
- Add/remove headers in `<ng-template pTemplate="header">`
- Add/remove columns in `<ng-template pTemplate="body">`

---

## Summary of Files Modified/Created

1. **Backend**
   - `backend/supplier.py` - Complete API with JWT authentication

2. **Frontend - Service**
   - `src/app/services/MasterDataService/supplieservice.ts` - Updated with CRUD methods

3. **Frontend - Component**
   - `src/app/Features/Master/supplier-master/supplier-master.ts` - Updated with full functionality
   - `src/app/Features/Master/supplier-master/supplier-master.html` - Updated with form and table

4. **Configuration (Already Set)**
   - `src/app/interceptors/auth.interceptor.ts` - JWT token injection
   - `src/app/app.config.ts` - Interceptor registration

---

## Next Steps

1. ✅ Complete supplier.py with JWT endpoints
2. ✅ Update Angular supplier service
3. ✅ Update supplier-master component
4. ✅ Test the complete flow

Ready to use! Start the backend and frontend, login, and navigate to Supplier Master.

---

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console (F12) for errors
3. Check backend logs for API errors
4. Verify JWT token in localStorage (F12 → Application → Local Storage)
5. Test API endpoints using curl commands provided above
