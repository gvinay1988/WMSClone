import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DeletePopUp } from '../../../Common/delete-pop-up/delete-pop-up';




@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    InputTextModule,
    TranslatePipe,
    ReactiveFormsModule,
    SelectModule,
    DialogModule,
    DeletePopUp

  ],
  exports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    InputTextModule,
    TranslatePipe,
    ReactiveFormsModule,
    SelectModule,
    DialogModule,
    DeletePopUp

  ],
})
export class CommonmoduleimportModule { }
