import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../services/MasterDataService/user-service';
import { Constants } from '../../../Constant/constantFiles';
import { CommonmoduleimportModule } from '../../commonSharedService/commonmoduleimport/commonmoduleimport-module';

@Component({
  selector: 'app-user-configuration',
  imports: [CommonmoduleimportModule],
  templateUrl: './user-configuration.html',
  styleUrl: './user-configuration.scss'
})
export class UserConfiguration {

  // ---------------------------------------------------------
  // FORM
  // ---------------------------------------------------------

  userConfigForm!: FormGroup;

  // ---------------------------------------------------------
  // GENERAL
  // ---------------------------------------------------------

  direction = 'ltr';

  configPermissionsList: string[] = [
    'View',
    'Update'
  ];

  role = 'ROLE_SUPER_ADMIN';

  userIDName = '';

  isReadMode = false;

  showImage = true;

  showTooltip = false;

  // ---------------------------------------------------------
  // IMAGE
  // ---------------------------------------------------------

  imagePreview: string | null = null;

  selectedImage: File | null = null;

  // ---------------------------------------------------------
  // PASSWORD VALIDATION
  // ---------------------------------------------------------

  totalLength = 8;

  minLower = 1;

  minNumbers = 1;

  minSpecial = 1;

  minUpper = 0;

  // ---------------------------------------------------------
  // USER DATA
  // ---------------------------------------------------------

  userConfigurations: any[] = [];

  filteredUserConfigurations: any[] = [];

  users: any[] = [];

  countries: any[] = [];

  roles: any[] = [];

  statuss: string[] = [
    'Active',
    'Inactive'
  ];

  // ---------------------------------------------------------
  // PAGINATION / SEARCH
  // ---------------------------------------------------------

  itemsPerPage = 10;

  rows = 10;

  pageSize = 10;

  searchText = '';

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

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  deleteInfo: any = null;

  // ---------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------

  constants = new Constants();

  // ---------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdRef: ChangeDetectorRef
  ) {}

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------

  ngOnInit(): void {

    this.createForm();

    this.fetchUserConfiguration();

  }

  // ---------------------------------------------------------
  // CREATE FORM
  // ---------------------------------------------------------

  createForm(): void {

    this.userConfigForm = this.fb.group({

      firstName: [
        '',
        Validators.required
      ],

      lastName: [
        '',
        Validators.required
      ],

      userID: [''],

      userIDName: [''],

      password: [''],

      createdBy: [''],

      rolesList: [null],

      businessUnit: [''],

      usersCreationLimit: [0],

      concurrentLogins: [1],

      address: [''],

      country: [null],

      state: [''],

      city: [''],

      email: [''],

      phoneNumber: [''],

      pin: [''],

      status: ['Active'],

      // Image file
      userImage: [null]

    });

  }

  // ---------------------------------------------------------
  // SAVE USERf
  // ---------------------------------------------------------

save(): void {

  if (this.userConfigForm.invalid) {
    this.userConfigForm.markAllAsTouched();

    this.toastr.warning(
      'Please fill all required fields',
      'Validation'
    );

    return;
  }

  // Create FormData directly from the form
  const formData = new FormData();

  // Add all form fields
  Object.keys(this.userConfigForm.controls).forEach(
    (controlName: string) => {

      // Image will be added separately as File
      if (controlName === 'userImage') {
        return;
      }

      const value =
        this.userConfigForm.get(controlName)?.value;

      // Add every normal field
      if (value !== null && value !== undefined) {

        formData.append(
          controlName,
          String(value)
        );

      } else {

        // Send empty value instead of skipping field
        formData.append(
          controlName,
          ''
        );

      }

    }
  );

  // Add image to the SAME FormData
  if (this.selectedImage) {

    formData.append(
      'userImage',
      this.selectedImage,
      this.selectedImage.name
    );

  }

  // Optional: check exactly what is going to API
  formData.forEach((value, key) => {
    console.log(
      key,
      value instanceof File
        ? value.name
        : value
    );
  });

  // Direct API call
  this.userService.saveUserConfiguration(formData)
    .subscribe({

      next: (response: any) => {

        console.log(
          'Save response:',
          response
        );

        if (
          response?.statusCode === 200 ||
          response?.statusCode === 201
        ) {

          this.toastr.success(
            response?.statusMsg ||
            'User configuration saved successfully',
            'Success'
          );

          // Refresh table
          this.fetchUserConfiguration();

          // Clear form
          this.clear();

        } else {

          this.toastr.error(
            response?.statusMsg ||
            'Failed to save user configuration',
            'Error'
          );

        }

      },

      error: (error: any) => {

        console.error(
          'Save user configuration error:',
          error
        );

        this.toastr.error(
          error?.error?.statusMsg ||
          error?.error?.detail ||
          error?.message ||
          'Failed to save user configuration',
          'Error'
        );

      }

    });

}

  // ---------------------------------------------------------
  // IMAGE SELECT
  // ---------------------------------------------------------

  onImageSelected(event: Event): void {

  const input =
    event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];

  // Validate image
  if (!file.type.startsWith('image/')) {

    this.toastr.warning(
      'Please select a valid image file',
      'Invalid Image'
    );

    input.value = '';

    return;
  }

  // Keep selected file
  this.selectedImage = file;

  // Also keep it in Reactive Form
  this.userConfigForm
    .get('userImage')
    ?.setValue(file);

  // Preview
  const reader = new FileReader();

  reader.onload = () => {

    this.imagePreview =
      reader.result as string;

  };

  reader.readAsDataURL(file);

}

  // ---------------------------------------------------------
  // DELETE SELECTED IMAGE
  // ---------------------------------------------------------

  deleteImage(): void {

  this.imagePreview = null;

  this.selectedImage = null;

  this.userConfigForm
    .get('userImage')
    ?.setValue(null);

}

  // ---------------------------------------------------------
  // FETCH USERS
  // ---------------------------------------------------------

  fetchUserConfiguration(): void {

    this.userService.findUserConfiguration({}).subscribe({
        next: (response: any) => {
          if (response?.statusCode === 200) {
            this.userConfigurations = Array.isArray(response.userConfigurationList)
                ? response.userConfigurationList
                : [];
            this.filteredUserConfigurations =
              [
                ...this.userConfigurations
              ];
            this.cdRef.detectChanges();

         

          } else {

            this.userConfigurations = [];

            this.filteredUserConfigurations = [];

            this.toastr.error(
              response?.statusMsg ||
              'Failed to fetch user configurations',
              'Error'
            );

          }

        },

        error: (error: any) => {

          console.error(
            'Fetch user configuration error:',
            error
          );

          this.userConfigurations = [];

          this.filteredUserConfigurations = [];

          this.toastr.error(

            error?.error?.statusMsg ||
            error?.error?.detail ||
            error?.message ||
            'Failed to fetch user configurations',

            'Error'

          );

        }

      });

  }

  // ---------------------------------------------------------
  // SEARCH USERS
  // ---------------------------------------------------------

  searchUsers(): void {

    const search =
      this.searchText
        .toLowerCase()
        .trim();

    if (!search) {

      this.filteredUserConfigurations =
        [
          ...this.userConfigurations
        ];

      return;

    }

    this.filteredUserConfigurations =
      this.userConfigurations.filter(
        (user: any) => {

          return [

            user.userID,

            user.userIDName,

            user.firstName,

            user.lastName,

            user.email,

            user.phoneNumber,

            user.city,

            user.state,

            user.status

          ].some(

            value =>
              String(value ?? '')
                .toLowerCase()
                .includes(search)

          );

        }
      );

  }

  // ---------------------------------------------------------
  // SEARCH - GENERIC
  // ---------------------------------------------------------

  onSearch(): void {

    const search =
      this.searchText
        .toLowerCase()
        .trim();

    if (!search) {

      this.filteredUserConfigurations =
        [
          ...this.userConfigurations
        ];

      return;

    }

    this.filteredUserConfigurations =
      this.userConfigurations.filter(
        (user: any) =>

          Object.values(user).some(
            (value: any) =>

              value !== null &&
              value !== undefined &&
              String(value)
                .toLowerCase()
                .includes(search)

          )

      );

  }

  // ---------------------------------------------------------
  // CLEAR FORM
  // ---------------------------------------------------------

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

      status: 'Active',

      userImage: null

    });

    // Reset image
    this.imagePreview = null;

    this.selectedImage = null;

    // Reset state
    this.isReadMode = false;

    this.userIDName = '';

  }

  // ---------------------------------------------------------
  // EDIT USER
  // ---------------------------------------------------------

  edit(user: any): void {

   

    this.userConfigForm.patchValue({

      firstName:
        user.firstName || '',

      lastName:
        user.lastName || '',

      userID:
        user.userID || '',

      userIDName:
        user.userIDName || '',

      password:
        user.password || '',

      createdBy:
        user.createdBy || '',

      rolesList:
        user.rolesList?.length > 0
          ? user.rolesList[0].roleName
          : null,

      businessUnit:
        user.businessUnit || '',
      usersCreationLimit:
        user.usersCreationLimit || 0,
      concurrentLogins:
        user.concurrentLogins || 1,
      address:
        user.address || '',
      country:
        user.country || null,
      state:
        user.state || '',

      city:
        user.city || '',

      email:
        user.email || '',

      phoneNumber:
        user.phoneNumber || '',

      pin:
        user.pin || '',

      status:
        user.status || 'Active',

      userImage: null

    });

    // Clear new image selection
    this.selectedImage = null;

    this.imagePreview = null;

    this.userIDName =
      user.userIDName || '';

    this.isReadMode = true;

  }

  // ---------------------------------------------------------
  // DELETE USER
  // ---------------------------------------------------------

  delete(user: any): void {

    this.deleteInfo = {

      userID:
        user.userID,

      userIDName:
        user.userIDName

    };

  }

  // ---------------------------------------------------------
  // OPEN DELETE POPUP
  // ---------------------------------------------------------

  openDeletePopup(user: any): void {

    this.deleteInfo = user;

  }

  // ---------------------------------------------------------
  // DELETE CONFIRMATION
  // ---------------------------------------------------------

  getConfirmation(event: any): void {

   
  }

  // ---------------------------------------------------------
  // VALIDATION ERROR
  // ---------------------------------------------------------

  shouldShowErrors(
    controlName: string,
    form: FormGroup
  ): boolean {

    const control =
      form.get(controlName);

    return !!(
      control &&
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );

  }

  // ---------------------------------------------------------
  // VALIDATION SUCCESS
  // ---------------------------------------------------------

  shouldShowSuccess(
    controlName: string
  ): boolean {

    const control =
      this.userConfigForm.get(
        controlName
      );

    return !!(

      control &&
      control.valid &&
      (
        control.touched ||
        control.dirty
      )

    );

  }

  // ---------------------------------------------------------
  // PASSWORD VALIDATION
  // ---------------------------------------------------------

  isValid(type: string): boolean {

    const password =
      this.userConfigForm
        .get('password')
        ?.value || '';

    if (!password) {

      return false;

    }

    switch (type) {

      case 'totalLength':

        return (
          password.length >=
          this.totalLength
        );

      case 'lower':

        return (
          (
            password.match(
              /[a-z]/g
            ) || []
          ).length >=
          this.minLower
        );

      case 'number':

        return (
          (
            password.match(
              /[0-9]/g
            ) || []
          ).length >=
          this.minNumbers
        );

      case 'special':

        return (
          (
            password.match(
              /[^A-Za-z0-9]/g
            ) || []
          ).length >=
          this.minSpecial
        );

      case 'upper':

        return (
          (
            password.match(
              /[A-Z]/g
            ) || []
          ).length >=
          this.minUpper
        );

      default:

        return false;

    }

  }

  // ---------------------------------------------------------
  // FOCUS EVENTS
  // ---------------------------------------------------------

  onFocusForElement(
    element: string
  ): void {

  

  }

  onFocusOutForElement(): void {

   
  }

  onFocusOutForElementWithoutValidation(): void {

   
  }

  // ---------------------------------------------------------
  // SET USER NAME
  // ---------------------------------------------------------

  setName(): void {

    const firstName =
      this.userConfigForm
        .get('firstName')
        ?.value || '';

    const lastName =
      this.userConfigForm
        .get('lastName')
        ?.value || '';

    const userIDName =
      `${firstName}${lastName}`
        .replace(/\s/g, '');

    this.userConfigForm
      .get('userIDName')
      ?.setValue(userIDName);

  }

  // ---------------------------------------------------------
  // PAGE SIZE
  // ---------------------------------------------------------

  onPageSizeChange(): void {

    // PrimeNG automatically
    // updates table rows.

  }

  // ---------------------------------------------------------
  // PAGE CHANGE
  // ---------------------------------------------------------

  onPageChange(event: any): void {

  

  }

  // ---------------------------------------------------------
  // ROWS CHANGE
  // ---------------------------------------------------------

  onRowsChange(event: any): void {

    if (event?.target) {

      this.itemsPerPage =
        Number(
          event.target.value
        );

    } else if (event?.rows) {

      this.itemsPerPage =
        event.rows;

    }

  }

}