import { Component } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-delete-pop-up',
  imports: [DialogModule],
  templateUrl: './delete-pop-up.html',
  styleUrl: './delete-pop-up.scss',
})
export class DeletePopUp {
visible = false;

openDeleteDialog() {
  this.visible = true;
}

confirmDelete() {
  // Your delete API call will come here

  this.visible = false;
}

cancelDelete() {
  this.visible = false;
}
}