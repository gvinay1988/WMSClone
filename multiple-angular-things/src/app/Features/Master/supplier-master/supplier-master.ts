import { Component, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Supplieservice } from '../../../services/MasterDataService/supplieservice';

@Component({
  selector: 'app-supplier-master',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TableModule,
    CommonModule,
    ButtonModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './supplier-master.html',
  styleUrl: './supplier-master.scss',
})
export class SupplierMaster implements OnInit {
  supplierForm!: FormGroup;
 /*  suppliers = signal<Supplier[]>([]); */
  loading = signal(false);
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private supplierService: Supplieservice,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.createSupplierForm();
   
  }

  createSupplierForm() {
    this.supplierForm = this.fb.group({
      supplierCode: ['', Validators.required],
      supplierName: ['', Validators.required], 
      supplierType: [''],
      contactPerson: [''],
      email: [''],
      phone: [''],
      mobile: [''],
      gstNumber: [''],
      panNumber: [''],
      address: [''],
      city: [''],
      pinCode: ['']
    });
  }

  

  saveSupplier() {
  if (this.supplierForm.invalid) {
    this.supplierForm.markAllAsTouched();
    return;
  }

  this.submitting.set(true);

  const supplierData = this.supplierForm.value;

  console.log('Supplier Data:', supplierData);

  this.supplierService.saveSupplierMasterData(supplierData).subscribe({
    next: (response) => {
      console.log('Supplier saved successfully:', response);

      this.supplierForm.reset();
      this.submitting.set(false);
    },
    error: (error) => {
      console.error('Error saving supplier:', error);
      this.submitting.set(false);
    }
  });
}
  clearSupplier() {
    this.supplierForm.reset();
  }
}
