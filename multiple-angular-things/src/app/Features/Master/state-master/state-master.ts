import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ParameterService } from '../../../services/MasterDataService/parameter-service';
import {
  StateMasterService,
  StateRecord,
} from '../../../services/MasterDataService/state-master.service';
import { ExcelService } from '../../../services/MasterDataService/excel-service';

interface CountryOption {
  countryName: string;
}

interface StateImportFailure {
  row: number;
  stateCode?: string;
  stateName?: string;
  reason: string;
}

@Component({
  selector: 'app-state-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule, NgSelectModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './state-master.html',
  styleUrl: './state-master.scss',
})
export class StateMaster implements OnInit {
  stateForm!: FormGroup;
  states: StateRecord[] = [];
  countries: CountryOption[] = [];
  failures: StateImportFailure[] = [];
  rows = 10;
  searchText = '';
  loading = false;
  submitting = false;
  importing = false;
  editing = false;
  replaceExisting = false;
  readonly statuses: StateRecord['status'][] = ['Active', 'Inactive'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly stateMasterService: StateMasterService,
    private readonly parameterService: ParameterService,
    private readonly excelService: ExcelService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.fetchCountries();
    this.fetchStates();
  }

  private createForm(): void {
    this.stateForm = this.fb.group({
      id: [null],
      stateCode: ['', [Validators.required, Validators.maxLength(20)]],
      stateName: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['', [Validators.required, Validators.maxLength(100)]],
      capital: ['', [Validators.required, Validators.maxLength(100)]],
      status: ['Active', Validators.required],
    });
  }
collapsed = false;

toggleCollapse(): void {
  this.collapsed = !this.collapsed;
}
 fetchCountries() {
    this.parameterService.findALLCountryList().subscribe({
      next: response => {
        if (response?.statusCode === 200 && response.countryParameterData) {
          console.log('Country list fetched successfully:', response.countryParameterData);
          this.countries = response.countryParameterData;
        } else {
          this.countries = [];
          this.toastr.error(response?.statusMsg || 'Failed to load countries', 'Error');
        }
        this.cdRef.detectChanges();
      },
      error: error => {
        this.countries = [];
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load countries',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }

  save(): void {
    if (this.stateForm.invalid) {
      this.stateForm.markAllAsTouched();
      this.toastr.warning('Please complete all required state fields.', 'Validation');
      return;
    }

    this.submitting = true;
    this.stateMasterService.saveState(this.stateForm.getRawValue()).subscribe({
      next: response => {
        this.toastr.success(
          response?.statusMsg || (this.editing ? 'State updated successfully' : 'State saved successfully'),
          'Success'
        );
        this.clear();
        this.fetchStates();
      },
      error: error => {
        this.submitting = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save state',
          'Error'
        );
      },
    });
  }

  fetchStates(): void {
    this.loading = true;
    this.stateMasterService.findAllStates().subscribe({
      next: response => {
        this.states = response.statusCode === 200 && Array.isArray(response.stateList)
          ? response.stateList
          : [];
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to load states', 'Error');
        }
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: error => {
        this.states = [];
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load states',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }

  get filteredStates(): StateRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.states;
    }

    return this.states.filter(state =>
      [state.stateCode, state.stateName, state.country, state.capital, state.status]
        .some(value => String(value ?? '').toLowerCase().includes(search))
    );
  }

  edit(state: StateRecord): void {
    this.stateForm.patchValue(state);
    this.editing = true;
    this.collapsed = false;
  }

  confirmDelete(state: StateRecord): void {
    this.confirmationService.confirm({
      header: 'Delete State',
      message: `Delete ${state.stateName} (${state.stateCode})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(state),
    });
  }

  private delete(state: StateRecord): void {
    this.stateMasterService.deleteState(state.id).subscribe({
      next: response => {
        this.toastr.success(response?.statusMsg || 'State deleted successfully', 'Success');
        if (this.stateForm.get('id')?.value === state.id) {
          this.clear();
        }
        this.fetchStates();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete state',
          'Error'
        );
      },
    });
  }

  exportAsXLSX(): void {
    const exportRows = this.states.map(({ id, ...state }) => state);
    void this.excelService.exportAsExcelFile(exportRows, 'State-Master', []);
  }

  async importStates(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }

    this.importing = true;
    this.failures = [];
    try {
      const rows = await this.excelService.generateJsonUsingExcel(event);
      if (!rows.length) {
        this.toastr.warning('The selected workbook has no state rows.', 'Import');
        return;
      }

      for (const [index, row] of rows.entries()) {
        const imported = this.mapImportRow(row);
        if (typeof imported === 'string') {
          this.failures.push({ row: index + 2, reason: imported });
          continue;
        }

        const existing = this.states.find(state =>
          state.stateCode.toLowerCase() === imported.stateCode.toLowerCase()
          && state.country.toLowerCase() === imported.country.toLowerCase()
        );
        if (existing && !this.replaceExisting) {
          this.failures.push({
            row: index + 2,
            stateCode: imported.stateCode,
            stateName: imported.stateName,
            reason: 'State code already exists for this country; enable update matching records to replace it.',
          });
          continue;
        }

        try {
          await firstValueFrom(this.stateMasterService.saveState({
            ...imported,
            ...(existing ? { id: existing.id } : {}),
          }));
        } catch (error: any) {
          this.failures.push({
            row: index + 2,
            stateCode: imported.stateCode,
            stateName: imported.stateName,
            reason: error?.error?.statusMsg || error?.error?.detail || 'Failed to save state.',
          });
        }
      }

      if (this.failures.length) {
        this.toastr.warning(
          `Import finished with ${this.failures.length} failed row(s). Download the failure log for details.`,
          'Import'
        );
      } else {
        this.toastr.success('States imported successfully.', 'Import');
      }
      this.fetchStates();
    } catch (error) {
      this.toastr.error(
        error instanceof Error ? error.message : 'Could not read the selected workbook.',
        'Import'
      );
    } finally {
      this.importing = false;
      input.value = '';
      this.cdRef.detectChanges();
    }
  }

  downloadFailureLog(): void {
    if (!this.failures.length) {
      return;
    }
    void this.excelService.exportAsExcelFile(this.failures, 'State-Master-Import-Failures', []);
  }

  private mapImportRow(row: Record<string, unknown>): Omit<StateRecord, 'id'> | string {
    const values = new Map(
      Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[\s_-]/g, ''), value])
    );
    const read = (key: string): string => String(values.get(key) ?? '').trim();
    const stateCode = read('statecode');
    const stateName = read('statename');
    const country = read('country');
    const capital = read('capital');
    const rawStatus = read('status') || 'Active';
    const countryKnown = this.countries.some(
      option => option.countryName.toLowerCase() === country.toLowerCase()
    );

    if (!stateCode || !stateName || !country || !capital) {
      return 'Required columns are State Code, State Name, Country, and Capital.';
    }
    if (stateCode.length > 20 || stateName.length > 100 || country.length > 100 || capital.length > 100) {
      return 'One or more values exceed the allowed field length.';
    }
    if (!countryKnown) {
      return `Country "${country}" is not available in Parameter countries.`;
    }
    if (!this.statuses.includes(rawStatus as StateRecord['status'])) {
      return 'Status must be Active or Inactive.';
    }

    return {
      stateCode,
      stateName,
      country,
      capital,
      status: rawStatus as StateRecord['status'],
    };
  }

  clear(): void {
    this.stateForm.reset({
      id: null,
      stateCode: '',
      stateName: '',
      country: '',
      capital: '',
      status: 'Active',
    });
    this.editing = false;
    this.submitting = false;
  }
}
