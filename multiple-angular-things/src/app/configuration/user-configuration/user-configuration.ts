import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../services/MasterDataService/user-service';
import { Constants } from '../../../Constant/constantFiles';
import { CommonmoduleimportModule } from '../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-user-configuration',
  imports: [CommonmoduleimportModule, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService],
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

  constructor(private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdRef: ChangeDetectorRef
  ) { }



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
      concurrentLogins: [1],
      address: [''],
      country: [null],
      state: [''],
      city: [''],
      email: [''],
      phoneNumber: [''],
      pin: [''],
      status: ['Active'],
      userImage: [null]
    });
  }

  save(): void {
    this.userService.saveUserConfiguration(this.userConfigForm.value)
      .subscribe({
        next: (response: any) => {
          this.toastr.success(response?.statusMsg || 'Saved successfully', 'Success');
          this.fetchUserConfiguration();
          this.clear();
          this.deleteImage();          // <-- clears imagePreview & selectedImage only after successful save
        },
        error: (error: any) => {
          this.toastr.error(error?.error?.statusMsg || 'Failed to save', 'Error');
        }
      });
  }
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------
  // IMAGE SELECT
  // ---------------------------------------------------------
imageDeleted = false;
onImageSelected(event: any): void {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  this.imageDeleted = false;
  this.selectedImage = file;

  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = reader.result as string;
    this.imagePreview = dataUrl;                 // full data URL, for the <img> preview
    const base64Only = dataUrl.split(',')[1];    // strip the "data:image/...;base64," prefix
    this.userConfigForm.get('userImage')?.setValue(base64Only);
  };

  reader.readAsDataURL(file);
}
getImageSrc(base64: string | null): string | null {
  if (!base64) {
    return null;
  }
  // if it's already a full data URL (e.g. from imagePreview during edit), leave it alone
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:image/jpeg;base64,${base64}`;
}
deleteImage(): void {
  this.imagePreview = null;
  this.selectedImage = null;
  this.imageDeleted = true;
  this.userConfigForm.get('userImage')?.setValue(null);
}
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
    this.userConfigForm.reset()
    this.imagePreview = null;
    this.selectedImage = null;
    this.isReadMode = false;
    this.userIDName = '';
  }
  delete(user: any): void {
    this.deleteInfo = {userID:user.userID,userIDName:user.userIDName};
  }

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
  onFocusForElement(
    element: string
  ): void {

  }
  onFocusOutForElement(): void {
  }
  onFocusOutForElementWithoutValidation(): void {
  }

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

  

  
  openDeletePopup(user: any): void {
    this.confirmationService.confirm({
      header: 'Delete User',
      message: `Are you sure you want to delete?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteUser(user)
    });
  }
 editUser(user: any): void {

  // Patch all form fields (form control keeps raw base64 userImage, no prefix)
  this.userConfigForm.patchValue(user);

  // Set image preview from backend — needs the data: prefix to actually render
  if (user.userImage) {
    this.imagePreview = this.getImageSrc(user.userImage);
    this.showImage = true;
  } else {
    this.imagePreview = null;
    this.showImage = true;
  }

  // Clear selected file because this is an existing image
  this.selectedImage = null;

  console.log('Edited User:', user);
  console.log('Image Preview:', this.imagePreview);
}
deleteUser(user: any): void {
  const payload = {
    id: user.id
  };
  this.userService.deleteUserConfiguration(payload)
    .subscribe({
      next: (response: any) => {
        this.toastr.success(
          response?.statusMsg || 'User deleted successfully',
          'Success'
        );
        this.fetchUserConfiguration();
      },
      error: (error: any) => {
        this.toastr.error(
          error?.error?.statusMsg || 'Failed to delete user',
          'Error'
        );
      }
    });
}
}