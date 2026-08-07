import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Employee, EmployeePayload } from '../models/employee';

const API_URL = 'http://127.0.0.1:8000/employees';

interface EmployeeApiResponse {
  employee: Employee;
  message: string;
  preview: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(API_URL);
  }

  create(payload: EmployeePayload): Observable<Employee> {
    return this.http.post<EmployeeApiResponse>(API_URL, payload).pipe(map((response) => response.employee));
  }

  update(id: string, payload: EmployeePayload): Observable<Employee> {
    return this.http.put<EmployeeApiResponse>(`${API_URL}/${id}`, payload).pipe(map((response) => response.employee));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}
