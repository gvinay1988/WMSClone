import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagInputModule } from 'ngx-chips';

import { CommonmoduleimportModule } from '../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ParameterService } from '../../services/MasterDataService/parameter-service';
import { ToastrService } from 'ngx-toastr';
import { DeleteServiceAPI } from '../../services/DeleteService/delete-service-api';
import {
  ApplicationBranding,
  ApplicationBrandingService,
} from '../../services/MasterDataService/application-branding.service';

type CategoryNumber = 1 | 2 | 3;
type ParameterType = 'country' | 'category1' | 'category2' | 'category3';
type TagValue = string | Record<string, unknown>;

interface ParameterEntry {
  id: number;
  countryName?: string;
  categoryName?: string;
}

@Component({
  selector: 'app-parameter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommonmoduleimportModule,
    TagInputModule
  ],
  templateUrl: './parameter.html',
  styleUrl: './parameter.scss'
})
export class Parameter implements OnInit {

  @Input() title = 'Parameters';
  @Input() collapsed = false;

  countryList: ParameterEntry[] = [];
  categoryLists: Record<CategoryNumber, ParameterEntry[]> = { 1: [], 2: [], 3: [] };
  deleteInfo = false;
  dashboardText = '';
  headerImage: string | null = null;
  brandingSaving = false;
  private readonly maxBrandImageSize = 2 * 1024 * 1024;
  private readonly acceptedBrandImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  private selectedParameter: { item: ParameterEntry; type: ParameterType } | null = null;

  constructor(
    private readonly parameterService: ParameterService,
    private readonly deleteService: DeleteServiceAPI,
    private readonly brandingService: ApplicationBrandingService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.findAllCountryList();
    this.findAllCategoryLists();
    this.brandingService.load();
    this.brandingService.branding$.subscribe(settings => {
      this.dashboardText = settings.dashboardText;
      this.headerImage = settings.headerImage;
      this.cdr.markForCheck();
    });
  }

  togglePanel(): void {
    this.collapsed = !this.collapsed;
  }

  onBrandImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!this.acceptedBrandImageTypes.includes(file.type)) {
      this.toastr.error('Choose a PNG, JPEG, WEBP, or GIF image.');
      input.value = '';
      return;
    }
    if (file.size > this.maxBrandImageSize) {
      this.toastr.error('Header image must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.headerImage = reader.result;
      } else {
        this.toastr.error('Could not read the selected image.');
      }
    };
    reader.onerror = () => this.toastr.error('Could not read the selected image.');
    reader.readAsDataURL(file);
  }

  saveApplicationBranding(): void {
    const settings: ApplicationBranding = {
      dashboardText: this.dashboardText.trim(),
      headerImage: this.headerImage,
    };
    this.brandingSaving = true;
    this.brandingService.save(settings).subscribe({
      next: response => {
        if (response.statusCode === 200) {
          this.toastr.success(response.statusMsg);
        } else {
          this.toastr.error(response.statusMsg || 'Could not save dashboard branding.');
        }
        this.brandingSaving = false;
      },
      error: error => {
        this.toastr.error(error?.error?.statusMsg || 'Could not save dashboard branding.');
        this.brandingSaving = false;
      },
    });
  }

  saveParameter(event: TagValue, typeName: ParameterType): void {
    switch (typeName) {
      case 'country': {
        const countryName = typeof event === 'string'
          ? event
          : typeof event['countryName'] === 'string' ? event['countryName'] : '';
        this.parameterService.saveCountryParameterData({ countryName }).subscribe({
          next: (response: any) => {
            if (response?.statusCode === 200) {
              this.toastr.success(response.statusMsg);
              this.findAllCountryList();
            } else {
              this.toastr.error(response?.statusMsg || 'Could not save country.');
              this.findAllCountryList();
            }
          },
          error: (error: any) => {
            this.toastr.error(error?.error?.statusMsg || 'Could not save country.');
            this.findAllCountryList();
          },
        });
        break;
      }
      case 'category1':
      case 'category2':
      case 'category3': {
        const categoryNumber = Number(typeName.slice(-1)) as CategoryNumber;
        const categoryName = typeof event === 'string'
          ? event
          : typeof event['categoryName'] === 'string' ? event['categoryName'] : '';
        this.parameterService.saveCategoryParameterData({
          categoryNumber,
          categoryName,
        }).subscribe({
          next: (response: any) => {
            if (response?.statusCode === 200) {
              this.toastr.success(response.statusMsg);
            } else {
              this.toastr.error(response?.statusMsg || 'Could not save category.');
            }
            this.findCategoryList(categoryNumber);
          },
          error: (error: any) => {
            this.toastr.error(error?.error?.statusMsg || 'Could not save category.');
            this.findCategoryList(categoryNumber);
          },
        });
        break;
      }
    }
  }

  findAllCountryList(): void {
    this.parameterService.findALLCountryList().subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.countryList = response.countryParameterData;
          this.cdr.detectChanges();
        } else {
          this.toastr.error(response?.statusMsg || 'Could not load countries.');
        }
      },
      error: (error: any) => {
        this.toastr.error(error?.error?.statusMsg || 'Could not load countries.');
      },
    });
  }

  private findAllCategoryLists(): void {
    ([1, 2, 3] as CategoryNumber[]).forEach(categoryNumber => {
      this.findCategoryList(categoryNumber);
    });
  }

  private findCategoryList(categoryNumber: CategoryNumber): void {
    this.parameterService.findCategoryList(categoryNumber).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.categoryLists[categoryNumber] = response.categoryParameterData;
          this.cdr.detectChanges();
        } else {
          this.toastr.error(response?.statusMsg || `Could not load Category ${categoryNumber}.`);
        }
      },
      error: (error: any) => {
        this.toastr.error(error?.error?.statusMsg || `Could not load Category ${categoryNumber}.`);
      },
    });
  }

  openDeletePopup(item: TagValue, type: ParameterType): void {
    const itemId = typeof item === 'string' ? undefined : item['id'];
    if (typeof itemId !== 'number') {
      this.toastr.error('This parameter has not been saved yet.');
      this.reloadParameters(type);
      return;
    }

    this.selectedParameter = { item: { id: itemId }, type };
    this.deleteInfo = true;
  }

  cancelDelete(): void {
    if (this.selectedParameter) {
      this.reloadParameters(this.selectedParameter.type);
      this.selectedParameter = null;
    }
    this.deleteInfo = false;
  }

  deleteParameter(): void {
    if (!this.selectedParameter) {
      return;
    }

    const { item, type } = this.selectedParameter;
    const deleteRequest = type === 'country'
      ? this.deleteService.deleteCountryData({ id: item.id })
      : this.deleteService.deleteCategoryData({ id: item.id });

    deleteRequest.subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.toastr.success(response.statusMsg);
        } else {
          this.toastr.error(response?.statusMsg || 'Could not delete parameter.');
        }
        this.reloadParameters(type);
        this.selectedParameter = null;
        this.deleteInfo = false;
      },
      error: (error: any) => {
        this.toastr.error(error?.error?.statusMsg || 'Could not delete parameter.');
        this.reloadParameters(type);
        this.selectedParameter = null;
        this.deleteInfo = false;
      },
    });
  }

  private reloadParameters(type: ParameterType): void {
    if (type === 'country') {
      this.findAllCountryList();
      return;
    }
    this.findCategoryList(Number(type.slice(-1)) as CategoryNumber);
  }
}