import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { VehicleMasterService, VehicleRecord } from '../../../services/MasterDataService/vehicle-master.service';

@Component({
  selector: 'app-vehicle-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ButtonModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './vehicle-master.html',
  styleUrl: './vehicle-master.scss',
})
export class VehicleMaster implements OnInit {
  vehicleForm!: FormGroup;
  vehicles: VehicleRecord[] = [];
  searchText = '';
  rows = 5;
  loading = false;
  saving = false;
  editing = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: VehicleMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.fetchVehicles();
  }

  createForm(): void {
    this.vehicleForm = this.fb.group({
      id: [null],
      vehicleCode: ['', [Validators.required, Validators.maxLength(20)]],
      vehicleName: ['', [Validators.required, Validators.maxLength(100)]],
      vehicleType: ['', [Validators.required, Validators.maxLength(50)]],
      registrationNumber: ['', [Validators.required, Validators.maxLength(30)]],
      capacity: [null, Validators.min(0)],
      status: ['Active', Validators.required],
    });
  }

  get filteredVehicles(): VehicleRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) return this.vehicles;
    return this.vehicles.filter(vehicle =>
      [vehicle.vehicleCode, vehicle.vehicleName, vehicle.vehicleType,
        vehicle.registrationNumber, vehicle.capacity, vehicle.status]
        .some(value => String(value ?? '').toLowerCase().includes(search)),
    );
  }

  fetchVehicles(): void {
    this.loading = true;
    this.service.findAllVehicles().subscribe({
      next: response => {
        this.loading = false;
        this.vehicles = response.statusCode === 200 && Array.isArray(response.vehicleList)
          ? response.vehicleList
          : [];
        if (response.statusCode !== 200) this.toastr.error(response.statusMsg || 'Failed to load vehicles.', 'Error');
        this.cdRef.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.vehicles = [];
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to load vehicles.', 'Error');
        this.cdRef.markForCheck();
      },
    });
  }

  save(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.toastr.warning('Please complete all required vehicle fields.', 'Validation');
      return;
    }

    this.saving = true;
    this.service.saveVehicle(this.vehicleForm.getRawValue()).subscribe({
      next: response => {
        this.saving = false;
        if (![200, 201].includes(response.statusCode)) {
          this.toastr.error(response.statusMsg || 'Failed to save vehicle.', 'Error');
          return;
        }
        this.toastr.success(response.statusMsg, 'Success');
        this.clear();
        this.fetchVehicles();
      },
      error: error => {
        this.saving = false;
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to save vehicle.', 'Error');
        this.cdRef.markForCheck();
      },
    });
  }

  edit(vehicle: VehicleRecord): void {
    this.editing = true;
    this.vehicleForm.patchValue(vehicle);
  }

  confirmDelete(vehicle: VehicleRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Vehicle',
      message: `Delete ${vehicle.vehicleName} (${vehicle.vehicleCode})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteVehicle(vehicle),
    });
  }

  clear(): void {
    this.editing = false;
    this.vehicleForm.reset({ id: null, vehicleCode: '', vehicleName: '', vehicleType: '',
      registrationNumber: '', capacity: null, status: 'Active' });
  }

  private deleteVehicle(vehicle: VehicleRecord): void {
    this.service.deleteVehicle(vehicle.id).subscribe({
      next: response => {
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to delete vehicle.', 'Error');
          return;
        }
        this.toastr.success(response.statusMsg, 'Success');
        if (this.vehicleForm.get('id')?.value === vehicle.id) this.clear();
        this.fetchVehicles();
      },
      error: error => this.toastr.error(
        error?.error?.statusMsg || error?.error?.detail || 'Failed to delete vehicle.', 'Error'),
    });
  }
}
