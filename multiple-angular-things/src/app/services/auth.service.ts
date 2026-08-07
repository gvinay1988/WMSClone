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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://127.0.0.1:8000';
  private readonly tokenKey = 'jwt_token';
  private readonly userKey = 'auth_user';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.setUser(response.user);
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.tokenKey, token);
    }
  }

  private setUser(user: LoginResponse['user']): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.tokenKey);
    }
  }

  private removeUser(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.userKey);
    }
  }

  getUser(): LoginResponse['user'] | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.localStorage.getItem(this.userKey);
    return value ? JSON.parse(value) : null;
  }

  getUserName(): string {
    return this.getUser()?.email ?? 'Admin';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
