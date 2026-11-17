import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  OrganizationMasterService,
  OrganizationRecord,
} from '../../../services/MasterDataService/organization-master.service';

type OrganizationFieldKey = Exclude<keyof OrganizationRecord, 'id'>;

@Component({
  selector: 'app-organization-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './organization-master.html',
  styleUrl: './organization-master.scss',
})
export class OrganizationMaster implements OnInit {
  readonly fields: { key: OrganizationFieldKey; label: string; required: boolean; maxLength: number }[] = [
    { key: 'organizationCode', label: 'Organization Code', required: true, maxLength: 30 },
    { key: 'organizationName', label: 'Organization Name', required: true, maxLength: 100 },
    { key: 'legalName', label: 'Legal Name', required: false, maxLength: 150 },
    { key: 'taxId', label: 'Tax ID', required: false, maxLength: 50 },
    { key: 'registrationNumber', label: 'Registration Number', required: false, maxLength: 50 },
    { key: 'email', label: 'Email', required: false, maxLength: 100 },
    { key: 'phone', label: 'Phone', required: false, maxLength: 30 },
    { key: 'address', label: 'Address', required: false, maxLength: 255 },
    { key: 'city', label: 'City', required: false, maxLength: 100 },
    { key: 'country', label: 'Country', required: false, maxLength: 100 },
  ];
  organizationForm: FormGroup;
  organizations: OrganizationRecord[] = [];
  rows = 5;
  searchText = '';
  loading = false;
  submitting = false;
  editing = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly organizationService: OrganizationMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.organizationForm = this.fb.group({
      id: [null],
      organizationCode: ['', [Validators.required, Validators.maxLength(30)]],
      organizationName: ['', [Validators.required, Validators.maxLength(100)]],
      legalName: ['', Validators.maxLength(150)],
      taxId: ['', Validators.maxLength(50)],
      registrationNumber: ['', Validators.maxLength(50)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', Validators.maxLength(30)],
      address: ['', Validators.maxLength(255)],
      city: ['', Validators.maxLength(100)],
      country: ['', Validators.maxLength(100)],
    });
  }

  ngOnInit(): void {
    this.fetchOrganizations();
  }

  get filteredOrganizations(): OrganizationRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.organizations;
    }
    return this.organizations.filter(organization =>
      this.fields.some(field =>
        String(organization[field.key] ?? '').toLowerCase().includes(search)
      )
    );
  }

  save(): void {
    if (this.organizationForm.invalid) {
      this.organizationForm.markAllAsTouched();
      this.toastr.warning('Enter an organization code and name and correct any invalid fields.', 'Validation');
      return;
    }

    this.submitting = true;
    this.organizationService.saveOrganization(this.organizationForm.getRawValue()).subscribe({
      next: response => {
        this.toastr.success(
          response.statusMsg || (this.editing ? 'Organization updated successfully' : 'Organization saved successfully'),
          'Success'
        );
        this.clear();
        this.fetchOrganizations();
      },
      error: error => {
        this.submitting = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save organization',
          'Error'
        );
      },
    });
  }

  fetchOrganizations(): void {
    this.loading = true;
    this.organizationService.findAllOrganizations().subscribe({
      next: response => {
        this.organizations = response.statusCode === 200 && Array.isArray(response.organizationList)
          ? response.organizationList
          : [];
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to load organizations', 'Error');
        }
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: error => {
        this.organizations = [];
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load organizations',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }

  edit(organization: OrganizationRecord): void {
    this.organizationForm.patchValue(organization);
    this.editing = true;
  }

  confirmDelete(organization: OrganizationRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Organization',
      message: `Delete ${organization.organizationName} (${organization.organizationCode})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(organization),
    });
  }

  clear(): void {
    this.organizationForm.reset({
      id: null,
      organizationCode: '',
      organizationName: '',
      legalName: '',
      taxId: '',
      registrationNumber: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
    });
    this.editing = false;
    this.submitting = false;
  }

  private delete(organization: OrganizationRecord): void {
    this.organizationService.deleteOrganization(organization.id).subscribe({
      next: response => {
        this.toastr.success(response.statusMsg || 'Organization deleted successfully', 'Success');
        if (this.organizationForm.get('id')?.value === organization.id) {
          this.clear();
        }
        this.fetchOrganizations();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete organization',
          'Error'
        );
      },
    });
  }
}
