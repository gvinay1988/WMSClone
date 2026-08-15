import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MenuModule, ButtonModule, CommonModule,RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  username = 'Vinay';
  isDropdownOpen = false;

  @Output() toggle = new EventEmitter<void>();

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  profile(): void {
    console.log('Profile');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onToggle(): void {
    this.toggle.emit();
  }
}
