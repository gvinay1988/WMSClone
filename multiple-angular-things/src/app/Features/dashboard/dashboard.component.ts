import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';


interface DashboardCard {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, RippleModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly cards: DashboardCard[] = [
    {
      title: 'Warehouse Dashboard',
      description: 'Monitor inbound shipments, storage capacity, and dock performance in real time.',
      icon: 'pi pi-box'
    },
    {
      title: 'Inventory Dashboard',
      description: 'Track inventory levels, stock health, and replenishment alerts at a glance.',
      icon: 'pi pi-chart-bar'
    }
  ];
}
