import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { StateTaxService } from '../../../services/MasterDataService/state-tax.service';

interface StateTaxRecord {
  id: string;
  stateCode: string;
  stateName: string;
  country: string;
  taxName: string;
  taxType: string;
  taxRate: number;
  status: string;
  description?: string;
}

@Component({
  selector: 'app-state-tax',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './state-tax.html',
  styleUrl: './state-tax.scss',
})
export class StateTax implements OnInit {
  stateTaxForm!: FormGroup;
  records: StateTaxRecord[] = [];
  filteredRecords: StateTaxRecord[] = [];
  rows = 10;
  searchText = '';
  loading = false;
  submitting = false;
  editing = false;
  readonly taxTypes = ['GST', 'VAT', 'Sales Tax', 'Other'];
  readonly statuses = ['Active', 'Inactive'];

  constructor(
    private fb: FormBuilder,
    private stateTaxService: StateTaxService,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.fetchStateTaxes();
  }

  private createForm(): void {
    this.stateTaxForm = this.fb.group({
      id: [null],
      stateCode: ['', [Validators.required, Validators.maxLength(20)]],
      stateName: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['', [Validators.required, Validators.maxLength(100)]],
      taxName: ['', [Validators.required, Validators.maxLength(100)]],
      taxType: ['GST', Validators.required],
      taxRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: ['Active', Validators.required],
      description: ['', Validators.maxLength(500)],
    });
  }

  save(): void {
    if (this.stateTaxForm.invalid) {
      this.stateTaxForm.markAllAsTouched();
      this.toastr.warning('Please complete the required fields and check the tax rate.', 'Validation');
      return;
    }

    this.submitting = true;
    this.stateTaxService.saveStateTax(this.stateTaxForm.getRawValue()).subscribe({
      next: (response: any) => {
        this.toastr.success(response?.statusMsg || 'State and tax saved successfully', 'Success');
        this.clear();
        this.fetchStateTaxes();
      },
      error: (error: any) => {
        this.submitting = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save state and tax',
          'Error'
        );
      },
    });
  }

  fetchStateTaxes(): void {
    this.loading = true;
    this.stateTaxService.findAllStateTaxes({}).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200 && Array.isArray(response.stateTaxList)) {
          this.records = response.stateTaxList;
          this.applyFilter();
        } else {
          this.records = [];
          this.filteredRecords = [];
          this.toastr.error(response?.statusMsg || 'Failed to load state and tax records', 'Error');
        }
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: (error: any) => {
        this.records = [];
        this.filteredRecords = [];
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load state and tax records',
          'Error'
        );
      },
    });
  }

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();
    this.filteredRecords = !search
      ? [...this.records]
      : this.records.filter(record =>
          [
            record.stateCode,
            record.stateName,
            record.country,
            record.taxName,
            record.taxType,
            record.taxRate,
            record.status,
          ].some(value => String(value ?? '').toLowerCase().includes(search))
        );
  }

  edit(record: StateTaxRecord): void {
    this.stateTaxForm.patchValue(record);
    this.editing = true;
  }

  confirmDelete(record: StateTaxRecord): void {
    this.confirmationService.confirm({
      header: 'Delete State & Tax',
      message: `Delete the tax record "${record.taxName}" for ${record.stateName}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(record),
    });
  }

  private delete(record: StateTaxRecord): void {
    this.stateTaxService.deleteStateTax({ id: record.id }).subscribe({
      next: (response: any) => {
        this.toastr.success(response?.statusMsg || 'State and tax deleted successfully', 'Success');
        this.fetchStateTaxes();
      },
      error: (error: any) => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete state and tax',
          'Error'
        );
      },
    });
  }

  clear(): void {
    this.stateTaxForm.reset({
      id: null,
      stateCode: '',
      stateName: '',
      country: '',
      taxName: '',
      taxType: 'GST',
      taxRate: 0,
      status: 'Active',
      description: '',
    });
    this.editing = false;
    this.submitting = false;
  }
}
