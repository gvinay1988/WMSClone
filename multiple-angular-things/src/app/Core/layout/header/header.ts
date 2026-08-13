import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({ 
  selector: 'app-header',
  standalone: true,
  imports: [MenuModule, ButtonModule,CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  username = 'Vinay';

isDropdownOpen = false;

toggleDropdown() {
  this.isDropdownOpen = !this.isDropdownOpen;
}

profile() {
  console.log('Profile');
}

logout() {
  console.log('Logout');
}
}