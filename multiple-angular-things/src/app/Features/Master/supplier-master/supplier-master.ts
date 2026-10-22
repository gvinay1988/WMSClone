import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Supplieservice } from '../../../services/MasterDataService/supplieservice';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';

@Component({
  selector: 'app-supplier-master',
  standalone: true,
  imports: [CommonmoduleimportModule],
  templateUrl: './supplier-master.html',
  styleUrl: './supplier-master.scss'
})
export class SupplierMaster implements OnInit {
  supplierForm!: FormGroup;
  loading = signal(false);
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  rows = 5;
  suppliers: any[] = [];
  filteredUserConfigurations: any[] = [];
  searchValue = '';

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef,
    private supplierService: Supplieservice
  ) {}

  ngOnInit() {
    this.createSupplierForm();
    this.fetchAllSuppliers();
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
      this.toastr.warning('Please fill all required fields', 'Validation');
      return;
    }

    this.submitting.set(true);

    this.supplierService.saveSupplierMasterData(this.supplierForm.getRawValue()).subscribe({
      next: (response: any) => {
        this.toastr.success(response?.message || 'Supplier saved successfully', 'Success');
        this.supplierForm.reset();
        this.fetchAllSuppliers();
        this.submitting.set(false);
      },
      error: (error) => {
        this.toastr.error(error?.error?.detail || error?.error?.statusMsg || 'Failed to save supplier', 'Error');
        this.submitting.set(false);
      }
    });
  }

  fetchAllSuppliers() {
    this.loading.set(true);

    this.supplierService.findALLSuppliers({}).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.suppliers = Array.isArray(response.supplierDetailsList)
            ? response.supplierDetailsList
            : [];
        } else {
          this.suppliers = [];
        }

        this.filteredUserConfigurations = [...this.suppliers];
        this.loading.set(false);
        this.cdRef.detectChanges();
      },
      error: (error) => {
        this.suppliers = [];
        this.filteredUserConfigurations = [];
        this.loading.set(false);
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to fetch suppliers', 'Error');
      }
    });
  }

  clearSupplier() {
    this.supplierForm.reset();
  }
}