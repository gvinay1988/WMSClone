export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
}

export interface EmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
}
