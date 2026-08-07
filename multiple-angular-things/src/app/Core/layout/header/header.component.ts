import { Component, Output, EventEmitter, Input } from '@angular/core';
import { MenuItem } from 'primeng/api'; // Assuming PrimeNG MenuItem for the menu items

@Component({
  selector: 'app-header', // Matches the usage in layout.html: <app-header>
  templateUrl: './header.html',
  styleUrls: ['./header.component.scss'] // Assuming a corresponding SCSS file for styling
})
export class HeaderComponent {
  // Emits an event when the menu toggle button is clicked,
  // allowing the parent component (layout) to handle sidebar visibility.
  @Output() toggle = new EventEmitter<void>();

  // Input property to display the current user's name.
  // Can be provided by the parent component.
  @Input() username: string = 'Guest';

  // Array of MenuItem objects for the PrimeNG p-menu component.
  items: MenuItem[] = [];

  constructor() {
    // Initialize menu items for the user dropdown.
    this.items = [
      { label: 'Profile', icon: 'pi pi-user' },
      { label: 'Settings', icon: 'pi pi-cog' },
      { separator: true },
      { label: 'Logout', icon: 'pi pi-sign-out' }
    ];
  }

  // Method to emit the toggle event when the menu button is clicked.
  onToggle(): void {
    this.toggle.emit();
  }
}