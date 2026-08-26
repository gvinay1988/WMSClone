import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-serverrpage',
  imports: [],
  templateUrl: './serverrpage.html',
  styleUrl: './serverrpage.scss',
})
export class Serverrpage {

  constructor(private router: Router) {}

  goToLogin(): void {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('auth_user');

    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
