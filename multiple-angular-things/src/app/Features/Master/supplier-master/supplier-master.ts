import { Component, ElementRef, OnInit, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Supplieservice } from '../../../services/MasterDataService/supplieservice';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-supplier-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ButtonModule, ConfirmDialogModule, TabsModule],
  providers: [ConfirmationService],
  templateUrl: './supplier-master.html',
  styleUrl: './supplier-master.scss'
})
export class SupplierMaster implements OnInit {
  @ViewChild('supplierImageInput') supplierImageInput?: ElementRef<HTMLInputElement>;

  supplierForm!: FormGroup;
  loading = signal(false);
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  rows = 5;
  suppliers: any[] = [];
  filteredUserConfigurations: any[] = [];
  searchValue = '';
  activeTab = 'details';
  supplierFieldsExpanded = true;
  isEditingSupplier = false;
  supplierImagePreview: string | null = null;
  readonly supplierDemoImage = '/supplier-demo/supplier-001.svg';
  private readonly maxSupplierImageSize = 2 * 1024 * 1024;
  private readonly acceptedSupplierImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef,
    private supplierService: Supplieservice,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.createSupplierForm();
    this.isEditingSupplier = false;
    this.supplierImagePreview = null;
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
      pinCode: [''],
      supplierImage: [null]
    });
  }

  saveSupplier(supplierImageInput: HTMLInputElement) {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields', 'Validation');
      return;
    }

    this.submitting.set(true);

    this.supplierService.saveSupplierMasterData(this.supplierForm.getRawValue()).subscribe({
      next: (response: any) => {
        const message = this.isEditingSupplier ? 'Supplier updated successfully' : 'Supplier saved successfully';
        this.toastr.success(response?.message || message, 'Success');
        this.clearSupplier(supplierImageInput);
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

  clearSupplier(supplierImageInput: HTMLInputElement) {
    this.supplierForm.reset();
    supplierImageInput.value = '';
    this.supplierImagePreview = null;
    this.isEditingSupplier = false;
  }

  editSupplier(supplier: any): void {
    this.isEditingSupplier = true;
    this.supplierFieldsExpanded = true;
    this.activeTab = 'details';
    if (this.supplierImageInput) {
      this.supplierImageInput.nativeElement.value = '';
    }
    this.supplierImagePreview = supplier.supplierImage || this.getSupplierDemoImage(supplier.supplierCode);
    this.supplierForm.patchValue({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      supplierType: supplier.supplierType || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      mobile: supplier.mobile || '',
      gstNumber: supplier.gstNumber || '',
      panNumber: supplier.panNumber || '',
      address: supplier.address || '',
      city: supplier.city || '',
      pinCode: supplier.pinCode || '',
      supplierImage: supplier.supplierImage || null
    });
    this.cdRef.detectChanges();
  }

  getSupplierDemoImage(supplierCode: string | null | undefined): string {
    const match = /^SUP-(\d{3})$/.exec(supplierCode || '');
    const imageNumber = match ? Number(match[1]) : 1;
    const safeImageNumber = imageNumber >= 1 && imageNumber <= 10 ? imageNumber : 1;
    return `/supplier-demo/supplier-${String(safeImageNumber).padStart(3, '0')}.svg`;
  }

  onSupplierImageSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!this.acceptedSupplierImageTypes.includes(file.type)) {
      this.toastr.warning('Choose a PNG, JPEG, WEBP, or GIF image.', 'Validation');
      input.value = '';
      return;
    }
    if (file.size > this.maxSupplierImageSize) {
      this.toastr.warning('Supplier image must be 2 MB or smaller.', 'Validation');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.toastr.error('Unable to read the selected supplier image.', 'Error');
        return;
      }

      this.supplierForm.patchValue({ supplierImage: reader.result });
      this.supplierImagePreview = reader.result;
      this.cdRef.markForCheck();
    };
    reader.onerror = () => {
      this.toastr.error('Unable to read the selected supplier image.', 'Error');
      this.cdRef.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  toggleSupplierFields(): void {
    this.supplierFieldsExpanded = !this.supplierFieldsExpanded;
  }

  confirmDelete(supplier: any): void {
    this.confirmationService.confirm({
      header: 'Delete Supplier',
      message: `Delete ${supplier.supplierName} (${supplier.supplierCode})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSupplier(supplier),
    });
  }

  private deleteSupplier(supplier: any): void {
    this.supplierService.deleteSupplier(supplier.id).subscribe({
      next: (response: any) => {
        this.toastr.success(response?.statusMsg || response?.message || 'Supplier deleted successfully', 'Success');
        this.fetchAllSuppliers();
      },
      error: (error: any) => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete supplier',
          'Error'
        );
      },
    });
  }
}