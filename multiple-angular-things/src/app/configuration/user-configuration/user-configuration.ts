import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { UserService } from '../../services/MasterDataService/user-service';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Constants } from '../../../Constant/constantFiles';
import { signal } from '@angular/core';
import { CommonmoduleimportModule } from '../../commonSharedService/commonmoduleimport/commonmoduleimport-module';


@Component({
  selector: 'app-user-configuration',
  imports: [CommonmoduleimportModule],
  templateUrl: './user-configuration.html',
  styleUrl: './user-configuration.scss',
})
export class UserConfiguration {


  userConfigForm!: FormGroup;
  direction = 'ltr';
  configPermissionsList: string[] = [
    'View',
    'Update'
  ];
 

userConfigurations: any[] = [];

filteredUserConfigurations : any
  role = 'ROLE_SUPER_ADMIN';
  userIDName = '';
  isReadMode = false;
  showImage = true;
  imageHidden = false;
  showTooltip = false;
  totalLength = 8;
  minLower = 1;
  minNumbers = 1;
  minSpecial = 1;
  minUpper = 0;

  statuss: string[] = [
    'Active',
    'Inactive'
  ];
  users: any[] = [];

  itemsPerPage = 10;
  deleteInfo: any = null;
  constants = new Constants();

  countries: any[] = [];
  roles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {

    this.countries = this.constants.countries;
    this.roles = this.constants.roles;

  }
  ngOnInit(): void {
    this.createForm();
    this.fetchUserConfiguration();
  }
  createForm(): void {

    this.userConfigForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      userID: [''],
      userIDName: [''],
      password: [''],
      createdBy: [''],
      rolesList: [null],
      businessUnit: [''],
      usersCreationLimit: [0],
      concurrentLogins: [],
      address: [''],
      country: [null],
      state: [''],
      city: [''],
      email: [''],
      phoneNumber: [''],
      pin: [''],
      status: ['Active']
    });
  }

  save() {
    const formValue = this.userConfigForm.value;
    console.log('Saving user:', formValue)
    this.userService.saveUserConfiguration(formValue).subscribe({
      next: (response) => {
        console.log(response);
        this.clear();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }


pageSize: number = 10;

fetchUserConfiguration() {
  this.userService.findUserConfiguration({}).subscribe({
    next: (response: any) => {
      console.log('User configuration response:', response);

      if (response.statusCode === 200) {
        this.userConfigurations = response.userConfigurationList || [];

        console.log('User configurations:', this.userConfigurations);
      }
    },

    error: (error) => {
      console.error('Fetch user configuration error:', error);
    }
  });
}
  onSearch() {
    const search = this.searchText
      .toLowerCase()
      .trim();
  }

  onPageSizeChange() { 
    // PrimeNG automatically updates the table rows.
  }
  clear(): void {

    this.userConfigForm.reset({

      firstName: '',
      lastName: '',
      userID: '',
      userIDName: '',
      password: '',
      createdBy: '',
      rolesList: null,
      businessUnit: '',
      usersCreationLimit: 0,
      concurrentLogins: 1,

      address: '',
      country: null,
      state: '',
      city: '',

      email: '',
      phoneNumber: '',
      pin: '',

      status: 'Active'

    });

    this.isReadMode = false;
    this.userIDName = '';

    this.imageHidden = false;

  }

  // ---------------------------------------------------------
  // EDIT USER
  // ---------------------------------------------------------

  edit(user: any): void {
    console.log('Editing user:', user);
    this.userConfigForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      userID: user.userID || '',
      userIDName: user.userIDName || '',
      password: user.password || '',
      createdBy: user.createdBy || '',
      rolesList:
        user.rolesList?.length > 0
          ? user.rolesList[0].roleName
          : null,
      businessUnit: user.businessUnit || '',
      usersCreationLimit:
        user.usersCreationLimit || 0,
      concurrentLogins:
        user.concurrentLogins || 1,
      address: user.address || '',
      country: user.country || null,
      state: user.state || '',
      city: user.city || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      pin: user.pin || '',
      status: user.status || 'Active'
    });
    this.userIDName = user.userIDName || '';
    this.isReadMode = true;
  }
  delete(user: any): void {
    this.deleteInfo = user;
    console.log('Delete user:', user);

  }

  // ---------------------------------------------------------
  // DELETE CONFIRMATION
  // ---------------------------------------------------------

  getConfirmation(event: any): void {

    if (!event) {
      return;
    }
    console.log('Delete confirmed:', this.deleteInfo);
  }

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  shouldShowErrors(
    controlName: string,
    form: FormGroup
  ): boolean {

    const control = form.get(controlName);

    return !!(
      control &&
      control.invalid &&
      (control.touched || control.dirty)
    );

  }

  shouldShowSuccess(controlName: string): boolean {

    const control = this.userConfigForm.get(controlName);

    return !!(
      control &&
      control.valid &&
      (control.touched || control.dirty)
    );

  }

  // ---------------------------------------------------------
  // PASSWORD VALIDATION
  // ---------------------------------------------------------

  isValid(type: string): boolean {

    const password =
      this.userConfigForm.get('password')?.value || '';

    if (!password) {
      return false;
    }

    switch (type) {

      case 'totalLength':

        return password.length >= this.totalLength;

      case 'lower':

        return (
          (password.match(/[a-z]/g) || []).length
          >= this.minLower
        );

      case 'number':

        return (
          (password.match(/[0-9]/g) || []).length
          >= this.minNumbers
        );

      case 'special':

        return (
          (password.match(/[^A-Za-z0-9]/g) || []).length
          >= this.minSpecial
        );

      case 'upper':

        return (
          (password.match(/[A-Z]/g) || []).length
          >= this.minUpper
        );

      default:

        return false;

    }

  }

  // ---------------------------------------------------------
  // FOCUS EVENTS
  // ---------------------------------------------------------

  onFocusForElement(element: string): void {

    console.log('Focus:', element);

  }

  onFocusOutForElement(): void {

    console.log('Focus out');

  }

  onFocusOutForElementWithoutValidation(): void {

    console.log('Focus out');

  }

  // ---------------------------------------------------------
  // SET NAME
  // ---------------------------------------------------------

  setName(): void {
    const firstName =
      this.userConfigForm.get('firstName')?.value || '';
    const lastName =
      this.userConfigForm.get('lastName')?.value || '';
    const userIDName =
      `${firstName}${lastName}`.replace(/\s/g, '');
    this.userConfigForm
      .get('userIDName')
      ?.setValue(userIDName);
  }

  uploadImagesAndFiles(
    event: any,
    fieldName: string,
    imageId: string
  ): void {
  }
  deleteImage(imageId: string): void {

  }
  onPageChange(event: any): void {
    console.log('Page changed:', event);
  }
  onRowsChange(event: any): void {
    if (event?.target) {
      this.itemsPerPage =
        Number(event.target.value);
    } else if (event?.rows) {
      this.itemsPerPage =
        event.rows;
    }
  }






  searchText: string = '';

 

  pageSizeOptions = [
    {
      label: '5',
      value: 5
    },
    {
      label: '10',
      value: 10
    },
    {
      label: '25',
      value: 25
    },
    {
      label: '50',
      value: 50
    },
    {
      label: '100',
      value: 100
    }
  ];

}