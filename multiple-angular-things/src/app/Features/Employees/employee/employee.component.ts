import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Employee, EmployeePayload } from '../../../models/employee';
import { EmployeeService } from '../../../services/employee.service';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss'
})
export class EmployeeComponent implements OnInit {
  readonly employees = signal<Employee[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly form = signal<EmployeePayload>({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    department: ''
  });
  readonly editingId = signal<string | null>(null);
  readonly feedbackMessage = signal('');
  readonly feedbackType = signal<'success' | 'error'>('success');

  constructor(private readonly employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService.getAll().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.isLoading.set(false);
      },
      error: () => {
        this.feedbackMessage.set('Unable to load employees right now.');
        this.feedbackType.set('error');
        this.isLoading.set(false);
      }
    });
  }

  submit(): void {
    this.isSaving.set(true);
    this.feedbackMessage.set('');
    const payload = this.form();
    const editingId = this.editingId();

    const request = editingId
      ? this.employeeService.update(editingId, payload)
      : this.employeeService.create(payload);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.loadEmployees();
        this.feedbackMessage.set(editingId ? 'Employee updated successfully.' : 'Employee created successfully.');
        this.feedbackType.set('success');
        this.isSaving.set(false);
      },
      error: () => {
        this.feedbackMessage.set('The request could not be completed.');
        this.feedbackType.set('error');
        this.isSaving.set(false);
      }
    });
  }

  edit(employee: Employee): void {
    this.editingId.set(employee.id);
    this.form.set({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      position: employee.position,
      department: employee.department
    });
  }

  deleteEmployee(id: string): void {
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.feedbackMessage.set('Employee deleted successfully.');
        this.feedbackType.set('success');
        this.loadEmployees();
      },
      error: () => {
        this.feedbackMessage.set('Unable to delete the employee.');
        this.feedbackType.set('error');
        this.loadEmployees();
      }
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.set({
      firstName: '',
      lastName: '',
      email: '',
      position: '',
      department: ''
    });
  }
}
