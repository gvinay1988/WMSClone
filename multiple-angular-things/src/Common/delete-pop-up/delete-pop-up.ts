import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-delete-pop-up',
  imports: [DialogModule],
  templateUrl: './delete-pop-up.html',
  styleUrl: './delete-pop-up.scss',
})
export class DeletePopUp {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onConfirm = new EventEmitter<void>();

  cancelDelete(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirmDelete(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onConfirm.emit();
  }
}