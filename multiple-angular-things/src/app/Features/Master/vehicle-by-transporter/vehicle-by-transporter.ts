import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  TransporterMasterService,
  TransporterRecord,
} from '../../../services/MasterDataService/transporter-master.service';
import {
  VehicleMasterService,
  VehicleRecord,
} from '../../../services/MasterDataService/vehicle-master.service';

@Component({
  selector: 'app-vehicle-by-transporter',
  standalone: true,
  imports: [CommonmoduleimportModule],
  templateUrl: './vehicle-by-transporter.html',
  styleUrl: './vehicle-by-transporter.scss',
})
export class VehicleByTransporter implements OnInit {
  transporterForm!: FormGroup;
  transportersList: TransporterRecord[] = [];
  vehicleList: VehicleRecord[] = [];
  loadingTransporters = false;
  loadingVehicles = false;
  rows = 5;

  constructor(
    private readonly fb: FormBuilder,
    private readonly transporterService: TransporterMasterService,
    private readonly vehicleMasterService: VehicleMasterService,
    private readonly toastr: ToastrService,
  ) {
   
  }

  ngOnInit(): void {
    this.createTransporterForm();
    this.fetchTransporters();
    this.fetchVehicles();
  }
  createTransporterForm(): void {
    this.transporterForm = this.fb.group({
      transporterId: [null, Validators.required],
      transporterCode: [{ value: '', disabled: true }],
      transporterName: [{ value: '', disabled: true }],
    });
  }

  fetchTransporters(): void {
    this.transporterService.findAllTransporters().subscribe({
      next: response => {
        if (response.statusCode === 200) {
          this.transportersList = response.transporterList ?? [];
        } else {
          this.transportersList = [];
          this.toastr.error(response.statusMsg || 'Failed to load transporters.', 'Error');
        }
      },
      error: error => {
        this.transportersList = [];
        this.toastr.error('Failed to load transporters.', 'Error');
      },
    });
  }

  fetchVehicles(): void {
    this.vehicleMasterService.findAllVehicles().subscribe({
      next: response => {
        if (response.statusCode === 200) {
          this.vehicleList = response.vehicleList ?? [];
        } else {
          this.vehicleList = [];
          this.toastr.error(response.statusMsg || 'Failed to load vehicles.', 'Error');
        }
      },
      error: error => {
      
      },
    });
  }
saving = false;
  onTransporterChange(): void {
    const transporterId = this.transporterForm.get('transporterId')?.value;
    const transporter = this.transportersList.find(item => item.id === transporterId);
    this.transporterForm.patchValue({
      transporterCode: transporter?.transporterCode ?? '',
      transporterName: transporter?.transporterName ?? '',
    });
  }

  onSave() {
    console.log("Saving selected vehicles for transporter:", this.transporterForm.value);
    this.saving = true;
    const selectedVehicles = this.vehicleList.filter(vehicle => vehicle);
    console.log("Selected vehicles:", selectedVehicles);
  
}
}