import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../services/auth.service';

@Component({ 
  selector: 'app-header',
  standalone: true,
  imports: [MenuModule, ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() toggle = new EventEmitter<void>();

  readonly items: MenuItem[] = [
    {
      label: 'Signed in as',
      icon: 'pi pi-user',
      disabled: true
    },
    {
      separator: true
    },
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => this.goToProfile()
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  get username(): string {
    return this.authService.getUserName();
  }

  onToggle(): void {
    this.toggle.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.router.navigate(['/dashboard']);
  }
}
