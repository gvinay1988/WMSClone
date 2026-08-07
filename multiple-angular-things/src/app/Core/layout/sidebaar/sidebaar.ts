import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

interface SidebarItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-sidebaar',
  standalone: true,
  imports: [CommonModule, DrawerModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebaar.html',
  styleUrl: './sidebaar.scss'
})
export class Sidebaar {
  @Input() isOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();

  readonly items: SidebarItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', path: '/dashboard' },
    { label: 'Employees', icon: 'pi pi-users', path: '/employees' },
    { label: 'Products', icon: 'pi pi-box', path: '/products' },
    { label: 'Orders', icon: 'pi pi-shopping-cart', path: '/orders' },
    { label: 'Inventory', icon: 'pi pi-warehouse', path: '/inventory' },
    { label: 'Reports', icon: 'pi pi-chart-line', path: '/reports' },
    { label: 'Settings', icon: 'pi pi-cog', path: '/settings' }
  ];
}
