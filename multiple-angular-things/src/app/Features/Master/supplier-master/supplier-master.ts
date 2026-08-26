import { Component, signal, OnInit, afterNextRender } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { Supplieservice } from '../../../services/MasterDataService/supplieservice';
import { ToastrService } from 'ngx-toastr';
 interface Supplier {
  supplierCode: string;
  supplierName: string;
  supplierType: string;
  contactPerson: string;
  email: string;
  mobile: string;
  city: string;
}

@Component({
  selector: 'app-supplier-master',
  standalone: true,
imports: [
  ReactiveFormsModule,
  FormsModule,
  TableModule,
  CommonModule,
  ButtonModule,
  TooltipModule
],
  templateUrl: './supplier-master.html',
  styleUrl: './supplier-master.scss'
})
export class SupplierMaster implements OnInit {

  supplierForm!: FormGroup;

  loading = signal(false);
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private supplierService: Supplieservice
  ) {

    afterNextRender(() => {
      this.fetchAllSuppliers();
    });

  }

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

      this.toastr.warning(
        'Please fill all required fields',
        'Validation'
      );

      return;
    }

    this.submitting.set(true);

    const supplierData = this.supplierForm.value;

    console.log('Supplier Data:', supplierData);

    this.supplierService.saveSupplierMasterData(supplierData).subscribe({

      next: (response) => {

        console.log(
          'Supplier saved successfully:',
          response
        );

        this.toastr.success(
          response.message || 'Supplier saved successfully',
          'Success'
        );

        this.supplierForm.reset();

        this.submitting.set(false);
      },

      error: (error) => {

        console.error(
          'Error saving supplier:',
          error
        );

        this.toastr.error(
          error?.error?.detail ||
          error?.error?.statusMsg ||
          'Failed to save supplier',
          'Error'
        );

        this.submitting.set(false);
      }

    });

  }
 
suppliers = signal<Supplier[]>([]);
rows = signal(10);
searchValue = '';
 fetchAllSuppliers() {

  this.loading.set(true);

  this.supplierService.findALLSuppliers({}).subscribe({

    next: (response) => {

      console.log('Fetch suppliers response:', response);

      if (response.statusCode === 200) {

        this.suppliers.set(response.supplierDetailsList || []);

      }

      this.loading.set(false);

    },

    error: (error) => {

      console.error('Fetch supplier error:', error);

      this.loading.set(false);

      this.toastr.error(
        error?.error?.statusMsg ||
        error?.error?.detail ||
        'Failed to fetch suppliers',
        'Error'
      );

    }

  });

}

  clearSupplier() {
    this.supplierForm.reset();
  }

}