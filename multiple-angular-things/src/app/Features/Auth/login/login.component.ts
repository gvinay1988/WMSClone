import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  readonly email = signal('admin@example.com');
  readonly password = signal('password123');
  readonly rememberMe = signal(false);
  readonly isSubmitting = signal(false);
  readonly loginError = signal('');

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  onSubmit(): void {
    this.isSubmitting.set(true);
    this.loginError.set('');

    this.authService.login({ email: this.email(), password: this.password() }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loginError.set('Invalid email or password.');
        this.isSubmitting.set(false);
      }
    });
  }
}
