import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:4301', 'http://127.0.0.1:4301', 'http://localhost:3000']}})

SECRET_KEY = os.getenv('JWT_SECRET', 'dev-secret-key')
ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '60'))


def get_connection():
    use_mysql = os.getenv('USE_MYSQL', 'true').lower() == 'true'
    if use_mysql:
        try:
            conn = mysql.connector.connect(
                host=os.getenv('MYSQL_HOST', '127.0.0.1'),
                port=int(os.getenv('MYSQL_PORT', '3306')),
                user=os.getenv('MYSQL_USER', 'root'),
                password=os.getenv('MYSQL_PASSWORD', 'gvinay123'),
                database=os.getenv('MYSQL_DATABASE', 'employee_db'),
                autocommit=True,
            )
            conn.ping(reconnect=True)
            return conn, 'mysql'
        except Exception as exc:  # pragma: no cover - runtime dependency
            print(f'MySQL unavailable, falling back to SQLite: {exc}')

    db_path = os.getenv('SQLITE_DB_PATH', os.path.join(os.path.dirname(__file__), 'employees.sqlite3'))
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn, 'sqlite'


def initialize_database() -> None:
    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor()
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'admin'
                )
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS employees (
                    id CHAR(36) PRIMARY KEY,
                    firstName VARCHAR(255) NOT NULL,
                    lastName VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    position VARCHAR(255) NOT NULL,
                    department VARCHAR(255) NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                '''
            )
            cursor.execute(
                'INSERT IGNORE INTO users (email, password, role) VALUES (%s, %s, %s)',
                ('admin@example.com', 'password123', 'admin'),
            )
            conn.commit()
        else:
            cursor = conn.cursor()
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'admin'
                )
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS employees (
                    id TEXT PRIMARY KEY,
                    firstName TEXT NOT NULL,
                    lastName TEXT NOT NULL,
                    email TEXT NOT NULL,
                    position TEXT NOT NULL,
                    department TEXT NOT NULL,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
                '''
            )
            cursor.execute(
                'INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)',
                ('admin@example.com', 'password123', 'admin'),
            )
            conn.commit()
    finally:
        conn.close()


initialize_database()


def create_access_token(email: str, role: str) -> str:
    payload = {
        'sub': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError('Token expired') from exc
    except jwt.PyJWTError as exc:
        raise ValueError('Invalid token') from exc


def get_current_user() -> str:
    authorization = request.headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        raise ValueError('Missing bearer token')

    token = authorization.split(' ', 1)[1]
    payload = decode_access_token(token)
    return payload['sub']


@app.get('/')
def root():
    return jsonify({'message': 'Backend ready'})


@app.post('/auth/login')
def login():
    payload = request.get_json(silent=True) or {}
    email = payload.get('email')
    password = payload.get('password')

    if not email or not password:
        return jsonify({'detail': 'Email and password are required'}), 400

    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT email, role FROM users WHERE email = %s AND password = %s', (email, password))
            user = cursor.fetchone()
        else:
            cursor = conn.cursor()
            cursor.execute('SELECT email, role FROM users WHERE email = ? AND password = ?', (email, password))
            row = cursor.fetchone()
            user = {'email': row[0], 'role': row[1]} if row else None

        if not user:
            return jsonify({'detail': 'Invalid email or password'}), 401

        token = create_access_token(user['email'], user['role'])
        return jsonify({
            'token': token,
            'user': {'email': user['email'], 'role': user['role']},
            'message': 'Login successful',
        })
    finally:
        conn.close()


@app.get('/employees')
def list_employees():
    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({'detail': str(exc)}), 401

    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT id, firstName, lastName, email, position, department FROM employees ORDER BY createdAt DESC')
            rows = cursor.fetchall()
        else:
            cursor = conn.cursor()
            cursor.execute('SELECT id, firstName, lastName, email, position, department FROM employees ORDER BY createdAt DESC')
            rows = cursor.fetchall()
            rows = [
                {'id': row[0], 'firstName': row[1], 'lastName': row[2], 'email': row[3], 'position': row[4], 'department': row[5]}
                for row in rows
            ]

        return jsonify([
            {
                'id': row['id'],
                'firstName': row['firstName'],
                'lastName': row['lastName'],
                'email': row['email'],
                'position': row['position'],
                'department': row['department'],
            }
            for row in rows
        ])
    finally:
        conn.close()


@app.post('/employees')
def create_employee():
    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({'detail': str(exc)}), 401

    payload = request.get_json(silent=True) or {}
    employee_id = str(uuid.uuid4())
    preview = {
        'firstName': payload.get('firstName', ''),
        'lastName': payload.get('lastName', ''),
        'email': payload.get('email', ''),
        'position': payload.get('position', ''),
        'department': payload.get('department', ''),
    }

    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO employees (id, firstName, lastName, email, position, department) VALUES (%s, %s, %s, %s, %s, %s)',
                (employee_id, payload.get('firstName', ''), payload.get('lastName', ''), payload.get('email', ''), payload.get('position', ''), payload.get('department', '')),
            )
        else:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO employees (id, firstName, lastName, email, position, department) VALUES (?, ?, ?, ?, ?, ?)',
                (employee_id, payload.get('firstName', ''), payload.get('lastName', ''), payload.get('email', ''), payload.get('position', ''), payload.get('department', '')),
            )
        conn.commit()

        return jsonify({
            'employee': {
                'id': employee_id,
                'firstName': payload.get('firstName', ''),
                'lastName': payload.get('lastName', ''),
                'email': payload.get('email', ''),
                'position': payload.get('position', ''),
                'department': payload.get('department', ''),
            },
            'message': 'Employee created successfully',
            'preview': preview,
        }), 201
    finally:
        conn.close()


@app.put('/employees/<employee_id>')
def update_employee(employee_id):
    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({'detail': str(exc)}), 401

    payload = request.get_json(silent=True) or {}
    preview = {
        'firstName': payload.get('firstName', ''),
        'lastName': payload.get('lastName', ''),
        'email': payload.get('email', ''),
        'position': payload.get('position', ''),
        'department': payload.get('department', ''),
    }

    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE employees SET firstName = %s, lastName = %s, email = %s, position = %s, department = %s WHERE id = %s',
                (payload.get('firstName', ''), payload.get('lastName', ''), payload.get('email', ''), payload.get('position', ''), payload.get('department', ''), employee_id),
            )
        else:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE employees SET firstName = ?, lastName = ?, email = ?, position = ?, department = ? WHERE id = ?',
                (payload.get('firstName', ''), payload.get('lastName', ''), payload.get('email', ''), payload.get('position', ''), payload.get('department', ''), employee_id),
            )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'detail': 'Employee not found'}), 404

        return jsonify({
            'employee': {
                'id': employee_id,
                'firstName': payload.get('firstName', ''),
                'lastName': payload.get('lastName', ''),
                'email': payload.get('email', ''),
                'position': payload.get('position', ''),
                'department': payload.get('department', ''),
            },
            'message': 'Employee updated successfully',
            'preview': preview,
        })
    finally:
        conn.close()


@app.delete('/employees/<employee_id>')
def delete_employee(employee_id):
    try:
        get_current_user()
    except ValueError as exc:
        return jsonify({'detail': str(exc)}), 401

    conn, db_type = get_connection()
    try:
        if db_type == 'mysql':
            cursor = conn.cursor()
            cursor.execute('DELETE FROM employees WHERE id = %s', (employee_id,))
        else:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM employees WHERE id = ?', (employee_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'detail': 'Employee not found'}), 404

        return jsonify({'message': 'Employee deleted successfully', 'deletedId': employee_id})
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000, debug=True)
