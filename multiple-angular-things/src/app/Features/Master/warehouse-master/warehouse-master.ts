import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  WarehouseMasterService,
  WarehouseRecord,
} from '../../../services/MasterDataService/warehouse-master.service';

type WarehouseFieldKey = Exclude<keyof WarehouseRecord, 'id'>;

@Component({
  selector: 'app-warehouse-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './warehouse-master.html',
  styleUrl: './warehouse-master.scss',
})
export class WarehouseMaster implements OnInit {
  readonly fields: { key: WarehouseFieldKey; label: string; required: boolean; maxLength: number }[] = [
    { key: 'warehouseCode', label: 'Warehouse Code', required: true, maxLength: 30 },
    { key: 'warehouseName', label: 'Warehouse Name', required: true, maxLength: 100 },
    { key: 'warehouseType', label: 'Warehouse Type', required: false, maxLength: 50 },
    { key: 'contactPerson', label: 'Contact Person', required: false, maxLength: 100 },
    { key: 'email', label: 'Email', required: false, maxLength: 100 },
    { key: 'phone', label: 'Phone', required: false, maxLength: 30 },
    { key: 'address', label: 'Address', required: false, maxLength: 255 },
    { key: 'city', label: 'City', required: false, maxLength: 100 },
    { key: 'state', label: 'State', required: false, maxLength: 100 },
    { key: 'postalCode', label: 'Postal Code', required: false, maxLength: 20 },
  ];
  warehouseForm: FormGroup;
  warehouses: WarehouseRecord[] = [];
  rows = 5;
  searchText = '';
  loading = false;
  submitting = false;
  editing = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly warehouseService: WarehouseMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.warehouseForm = this.fb.group({
      id: [null],
      warehouseCode: ['', [Validators.required, Validators.maxLength(30)]],
      warehouseName: ['', [Validators.required, Validators.maxLength(100)]],
      warehouseType: ['', Validators.maxLength(50)],
      contactPerson: ['', Validators.maxLength(100)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', Validators.maxLength(30)],
      address: ['', Validators.maxLength(255)],
      city: ['', Validators.maxLength(100)],
      state: ['', Validators.maxLength(100)],
      postalCode: ['', Validators.maxLength(20)],
    });
  }

  ngOnInit(): void {
    this.fetchWarehouses();
  }

  get filteredWarehouses(): WarehouseRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.warehouses;
    }
    return this.warehouses.filter(warehouse =>
      this.fields.some(field => String(warehouse[field.key] ?? '').toLowerCase().includes(search))
    );
  }

  save(): void {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      this.toastr.warning('Enter a warehouse code and name and correct any invalid fields.', 'Validation');
      return;
    }

    this.submitting = true;
    this.warehouseService.saveWarehouse(this.warehouseForm.getRawValue()).subscribe({
      next: response => {
        this.toastr.success(
          response.statusMsg || (this.editing ? 'Warehouse updated successfully' : 'Warehouse saved successfully'),
          'Success'
        );
        this.clear();
        this.fetchWarehouses();
      },
      error: error => {
        this.submitting = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save warehouse',
          'Error'
        );
      },
    });
  }

  fetchWarehouses(): void {
    this.loading = true;
    this.warehouseService.findAllWarehouses().subscribe({
      next: response => {
        this.warehouses = response.statusCode === 200 && Array.isArray(response.warehouseList)
          ? response.warehouseList
          : [];
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to load warehouses', 'Error');
        }
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: error => {
        this.warehouses = [];
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load warehouses',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }

  edit(warehouse: WarehouseRecord): void {
    this.warehouseForm.patchValue(warehouse);
    this.editing = true;
  }

  confirmDelete(warehouse: WarehouseRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Warehouse',
      message: `Delete ${warehouse.warehouseName} (${warehouse.warehouseCode})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(warehouse),
    });
  }

  clear(): void {
    this.warehouseForm.reset({
      id: null,
      warehouseCode: '',
      warehouseName: '',
      warehouseType: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
    });
    this.editing = false;
    this.submitting = false;
  }

  private delete(warehouse: WarehouseRecord): void {
    this.warehouseService.deleteWarehouse(warehouse.id).subscribe({
      next: response => {
        this.toastr.success(response.statusMsg || 'Warehouse deleted successfully', 'Success');
        if (this.warehouseForm.get('id')?.value === warehouse.id) {
          this.clear();
        }
        this.fetchWarehouses();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete warehouse',
          'Error'
        );
      },
    });
  }
}
