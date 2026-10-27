import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ParameterService } from '../../../services/MasterDataService/parameter-service';
import {
  ProductCategoryGroupRecord,
  ProductCategoryGroupService,
} from '../../../services/MasterDataService/product-category-group.service';

interface ParameterCategory {
  id: number;
  categoryName: string;
}

@Component({
  selector: 'app-product-category-group',
  standalone: true,
  imports: [CommonmoduleimportModule],
  templateUrl: './product-category-group.html',
  styleUrl: './product-category-group.scss',
})
export class ProductCategoryGroup implements OnInit {
  groupForm: FormGroup;
  category1Options: ParameterCategory[] = [];
  category2Options: ParameterCategory[] = [];
  category3Options: ParameterCategory[] = [];
  groups: ProductCategoryGroupRecord[] = [];
  rows = 5;
  editingGroupId: string | null = null;
  saving = false;
  private readonly updatingGroupIds = new Set<string>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly parameterService: ParameterService,
    private readonly productCategoryGroupService: ProductCategoryGroupService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef,
  ) {
    this.groupForm = this.fb.group({
      groupName: ['', [Validators.required, Validators.maxLength(100)]],
      category1: [[] as string[]],
      category2: [[] as string[]],
      category3: [[] as string[]],
    });
  }

  ngOnInit(): void {
    this.loadCategories(1);
    this.loadCategories(2);
    this.loadCategories(3);
    this.loadGroups();
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      this.toastr.warning('Enter a product category group name.', 'Validation');
      return;
    }

    const formValue = this.groupForm.getRawValue();
    const group: Partial<ProductCategoryGroupRecord> = {
      ...(this.editingGroupId ? { id: this.editingGroupId } : {}),
      groupName: formValue.groupName.trim(),
      category1: [...formValue.category1],
      category2: [...formValue.category2],
      category3: [...formValue.category3],
    };
    this.saving = true;
    this.productCategoryGroupService.saveGroup(group).subscribe({
      next: response => {
        if (![200, 201].includes(response?.statusCode) || !response.group) {
          this.toastr.error(response?.statusMsg || 'Failed to save product category group.', 'Error');
          this.saving = false;
          this.cdRef.markForCheck();
          return;
        }

        const savedGroup = response.group;
        const existingIndex = this.groups.findIndex(item => item.id === savedGroup.id);
        this.groups = existingIndex >= 0
          ? this.groups.map(item => item.id === savedGroup.id ? savedGroup : item)
          : [...this.groups, savedGroup];
        this.toastr.success(response.statusMsg, 'Success');
        this.clearForm();
        this.saving = false;
        this.cdRef.markForCheck();
      },
      error: error => {
        this.saving = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save product category group.',
          'Error',
        );
        this.cdRef.markForCheck();
      },
    });
  }

  editGroup(group: ProductCategoryGroupRecord): void {
    this.editingGroupId = group.id;
    this.groupForm.patchValue({
      groupName: group.groupName,
      category1: [...group.category1],
      category2: [...group.category2],
      category3: [...group.category3],
    });
  }

  removeGroup(groupId: string): void {
    this.productCategoryGroupService.deleteGroup(groupId).subscribe({
      next: response => {
        if (response?.statusCode !== 200) {
          this.toastr.error(response?.statusMsg || 'Failed to delete product category group.', 'Error');
          return;
        }
        this.groups = this.groups.filter(group => group.id !== groupId);
        if (this.editingGroupId === groupId) {
          this.clearForm();
        }
        this.toastr.success(response.statusMsg, 'Success');
        this.cdRef.markForCheck();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete product category group.',
          'Error',
        );
      },
    });
  }

  removeGroupCategory(
    group: ProductCategoryGroupRecord,
    categoryNumber: 1 | 2 | 3,
    categoryName: string,
  ): void {
    const categoryKey = `category${categoryNumber}` as 'category1' | 'category2' | 'category3';
    const updatedGroup = {
      ...group,
      [categoryKey]: group[categoryKey].filter(category => category !== categoryName),
    };
    if (this.updatingGroupIds.has(group.id)) {
      return;
    }

    this.updatingGroupIds.add(group.id);
    this.productCategoryGroupService.saveGroup(updatedGroup).subscribe({
      next: response => {
        this.updatingGroupIds.delete(group.id);
        if (response?.statusCode !== 200 || !response.group) {
          this.toastr.error(response?.statusMsg || 'Failed to update product category group.', 'Error');
          this.cdRef.markForCheck();
          return;
        }
        this.groups = this.groups.map(item => item.id === group.id ? response.group! : item);
        if (this.editingGroupId === group.id) {
          this.groupForm.patchValue({ [categoryKey]: [...response.group[categoryKey]] });
        }
        this.toastr.success(response.statusMsg, 'Updated');
        this.cdRef.markForCheck();
      },
      error: error => {
        this.updatingGroupIds.delete(group.id);
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to update product category group.',
          'Error',
        );
        this.cdRef.markForCheck();
      },
    });
  }

  clearForm(): void {
    this.groupForm.reset({
      groupName: '',
      category1: [],
      category2: [],
      category3: [],
    });
    this.editingGroupId = null;
  }

  private loadGroups(): void {
    this.productCategoryGroupService.findAllGroups().subscribe({
      next: response => {
        if (response?.statusCode !== 200 || !Array.isArray(response.groupList)) {
          this.toastr.error(response?.statusMsg || 'Failed to load product category groups.', 'Error');
          return;
        }
        this.groups = response.groupList;
        this.cdRef.markForCheck();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load product category groups.',
          'Error',
        );
      },
    });
  }

  private loadCategories(categoryNumber: 1 | 2 | 3): void {
    this.parameterService.findCategoryList(categoryNumber).subscribe({
      next: response => {
        if (response?.statusCode !== 200 || !Array.isArray(response.categoryParameterData)) {
          this.toastr.error(
            response?.statusMsg || `Could not load Parameter Category ${categoryNumber}.`,
            'Error',
          );
          return;
        }

        const categories = response.categoryParameterData as ParameterCategory[];
        if (categoryNumber === 1) {
          this.category1Options = categories;
        } else if (categoryNumber === 2) {
          this.category2Options = categories;
        } else {
          this.category3Options = categories;
        }
        this.cdRef.markForCheck();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail
            || `Could not load Parameter Category ${categoryNumber}.`,
          'Error',
        );
      },
    });
  }
}
