import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = 'http://127.0.0.1:8000';
  private readonly tokenKey = 'jwt_token';
  private readonly userKey = 'auth_user';

  constructor(private readonly http: HttpClient) {}

  // =========================
  // LOGIN
  // =========================
  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, payload)
      .pipe(
        tap((response) => {
          console.log('Login Response:', response);

          // Save JWT token in sessionStorage
          this.setToken(response.token);

          // Save user details in sessionStorage
          this.setUser(response.user);
        })
      );
  }

  // =========================
  // LOGOUT
  // =========================
  logout(): void {
    this.removeToken();
    this.removeUser();
  }

  // =========================
  // GET TOKEN
  // =========================
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(this.tokenKey);
  }

  // =========================
  // SET TOKEN
  // =========================
  private setToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(this.tokenKey, token);

    console.log(
      'Token stored in sessionStorage:',
      window.sessionStorage.getItem(this.tokenKey)
    );
  }

  // =========================
  // SET USER
  // =========================
  private setUser(user: LoginResponse['user']): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(
      this.userKey,
      JSON.stringify(user)
    );
  }

  // =========================
  // REMOVE TOKEN
  // =========================
  private removeToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(this.tokenKey);
  }

  // =========================
  // REMOVE USER
  // =========================
  private removeUser(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(this.userKey);
  }

  // =========================
  // GET USER
  // =========================
  getUser(): LoginResponse['user'] | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.sessionStorage.getItem(this.userKey);

    return value ? JSON.parse(value) : null;
  }

  // =========================
  // GET USER NAME
  // =========================
  getUserName(): string {
    return this.getUser()?.email ?? 'Admin';
  }

  // =========================
  // CHECK AUTHENTICATION
  // =========================
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}