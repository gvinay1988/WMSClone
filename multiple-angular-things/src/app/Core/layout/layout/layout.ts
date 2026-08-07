import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebaar } from '../sidebaar/sidebaar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebaar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {
  readonly isSidebarOpen = signal(true);

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
