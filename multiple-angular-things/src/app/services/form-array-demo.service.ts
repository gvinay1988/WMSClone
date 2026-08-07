import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormArrayDemoResponse {
  message: string;
  received: unknown;
}

@Injectable({ providedIn: 'root' })
export class FormArrayDemoService {
  private readonly apiUrl = 'http://127.0.0.1:8000/form-array-demo';

  constructor(private readonly http: HttpClient) {}

  submitDemo(payload: Record<string, unknown>): Observable<FormArrayDemoResponse> {
    return this.http.post<FormArrayDemoResponse>(this.apiUrl, payload);
  }
}
