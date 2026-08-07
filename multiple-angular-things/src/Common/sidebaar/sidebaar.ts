import { Component, Input } from '@angular/core';
import { AuthService } from '../../app/services/auth.service';

@Component({
  selector: 'app-sidebaar',
  standalone: true,
  imports: [],
  templateUrl: './sidebaar.html',
  styleUrl: './sidebaar.scss',
})
export class Sidebaar {

  constructor(private authService: AuthService) { }
  @Input()
  isOpen: boolean = true;

  logout(): void {
    this.authService.logout();
  }

}

