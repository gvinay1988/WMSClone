import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { TransporterMasterService, TransporterRecord } from '../../../services/MasterDataService/transporter-master.service';

@Component({
  selector: 'app-transporter',
  standalone: true,
  imports: [CommonmoduleimportModule, ButtonModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './transporter.html',
  styleUrl: './transporter.scss',
})
export class Transporter implements OnInit {
  transporterForm!: FormGroup;
  transporters: TransporterRecord[] = [];
  searchText = '';
  rows = 5;
  loading = false;
  saving = false;
  editing = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: TransporterMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.transporterForm = this.fb.group({
      id: [null],
      transporterCode: ['', [Validators.required, Validators.maxLength(20)]],
      transporterName: ['', [Validators.required, Validators.maxLength(100)]],
      contactPerson: ['', Validators.maxLength(100)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', Validators.maxLength(30)],
      city: ['', Validators.maxLength(100)],
      status: ['Active', Validators.required],
    });
    this.fetchTransporters();
  }

  get filteredTransporters(): TransporterRecord[] {
    const search = this.searchText.trim().toLowerCase();
    return search
      ? this.transporters.filter(item => [item.transporterCode, item.transporterName,
          item.contactPerson, item.email, item.phone, item.city, item.status]
          .some(value => String(value ?? '').toLowerCase().includes(search)))
      : this.transporters;
  }

  fetchTransporters(): void {
    this.loading = true;
    this.service.findAllTransporters().subscribe({
      next: response => {
        this.loading = false;
        this.transporters = response.statusCode === 200 ? response.transporterList || [] : [];
        this.cdRef.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to load transporters.', 'Error');
      },
    });
  }

  save(): void {
    if (this.transporterForm.invalid) {
      this.transporterForm.markAllAsTouched();
      this.toastr.warning('Please complete all required transporter fields.', 'Validation');
      return;
    }
    this.saving = true;
    this.service.saveTransporter(this.transporterForm.getRawValue()).subscribe({
      next: response => {
        this.saving = false;
        if (![200, 201].includes(response.statusCode)) {
          this.toastr.error(response.statusMsg || 'Failed to save transporter.', 'Error');
          return;
        }
        this.toastr.success(response.statusMsg, 'Success');
        this.clear();
        this.fetchTransporters();
      },
      error: error => {
        this.saving = false;
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to save transporter.', 'Error');
      },
    });
  }

  edit(transporter: TransporterRecord): void {
    this.editing = true;
    this.transporterForm.patchValue(transporter);
  }

  confirmDelete(transporter: TransporterRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Transporter', message: `Delete ${transporter.transporterName} (${transporter.transporterCode})?`,
      icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteTransporter(transporter),
    });
  }

  clear(): void {
    this.editing = false;
    this.transporterForm.reset({ id: null, transporterCode: '', transporterName: '', contactPerson: '',
      email: '', phone: '', city: '', status: 'Active' });
  }

  private deleteTransporter(transporter: TransporterRecord): void {
    this.service.deleteTransporter(transporter.id).subscribe({
      next: response => {
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to delete transporter.', 'Error');
          return;
        }
        this.toastr.success(response.statusMsg, 'Success');
        if (this.transporterForm.get('id')?.value === transporter.id) this.clear();
        this.fetchTransporters();
      },
      error: error => this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to delete transporter.', 'Error'),
    });
  }
}
