import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  ProductMasterService,
  ProductExcelImportFailure,
  ProductExcelUploadPayload,
  ProductRecord,
  ProductSavePayload,
} from '../../../services/MasterDataService/product-master.service';
import { ExcelService } from '../../../services/MasterDataService/excel-service';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_FIELDS,
  PRODUCT_DETAIL_FIELDS,
  PRODUCT_TABLE_COLUMNS,
  ProductFormControls,
  ProductTableFieldKey,
} from './product-master.config';

@Component({
  selector: 'app-product-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule, TabsModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './product-master.html',
  styleUrl: './product-master.scss',
})
export class ProductMaster implements OnInit {
  readonly categories = PRODUCT_CATEGORIES;
  readonly detailFields = PRODUCT_DETAIL_FIELDS;
  readonly categoryFields = PRODUCT_CATEGORY_FIELDS;
  readonly tableColumns = PRODUCT_TABLE_COLUMNS;
  productForm: FormGroup<ProductFormControls>;
  products: ProductRecord[] = [];
  imagePreview: string | null = null;
  searchText = '';
  rows = 10;
  productFieldsExpanded = true;
  loading = false;
  submitting = false;
  importing = false;
  editing = false;
  importFailures: ProductExcelImportFailure[] = [];
  private editingProduct: ProductRecord | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly productService: ProductMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly excelService: ExcelService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.productForm = this.fb.group<ProductFormControls>({
      id: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
      name: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
      productIDName: this.fb.nonNullable.control(''),
      description: this.fb.nonNullable.control(''),
      category: this.fb.nonNullable.control(''),
      hsnCode: this.fb.nonNullable.control(''),
      category1: this.fb.nonNullable.control(''),
      category2: this.fb.nonNullable.control(''),
      category3: this.fb.nonNullable.control(''),
      productImage: this.fb.nonNullable.control(''),
    });
  }

  ngOnInit(): void {
    this.fetchProducts();
  }

  toggleProductFields(): void {
    this.productFieldsExpanded = !this.productFieldsExpanded;
  }

  get canSaveProduct(): boolean {
    return Boolean(
      this.productForm.controls.id.value.trim()
      && this.productForm.controls.name.value.trim()
    );
  }
 

  save(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.toastr.warning('Product ID and Product Name are required.', 'Validation');
      return;
    }

    let payload: ProductSavePayload;
    try {
      payload = this.createSavePayload();
    } catch (error) {
      this.toastr.error(
        error instanceof Error ? error.message : 'Unable to prepare the product for saving.',
        'Error'
      );
      return;
    }

    this.submitting = true;
    this.productService.saveProduct(payload).subscribe({
      next: response => {
        this.toastr.success(
          response.statusMsg || (this.editing ? 'Product updated successfully' : 'Product saved successfully'),
          'Success'
        );
        this.clear();
        this.fetchProducts();
      },
      error: error => {
        this.submitting = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to save product',
          'Error'
        );
      },
    });
  }

  fetchProducts(): void {
    this.loading = true;
    this.productService.findAllProducts().subscribe({
      next: response => {
        this.products = response.statusCode === 200 && Array.isArray(response.productList)
          ? response.productList
          : [];
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to load products', 'Error');
        }
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: error => {
        this.products = [];
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load products',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }

onInputChange(fieldKey: keyof ProductFormControls, value: string): void {
  const updatedValue = value.trimStart();
  this.productForm.controls[fieldKey].setValue(updatedValue);
  if (fieldKey === 'id' || fieldKey === 'name') {
    const productId = this.productForm.controls.id.value.trim();
    const productName = this.productForm.controls.name.value.trim();
    this.productForm.controls.productIDName.setValue(
      productId && productName ? `${productId}:${productName}` : ''
    );
  }
}
  get filteredProducts(): ProductRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.products;
    }


    return this.products.filter(product =>
      [
        product.id, product.name, product.productIDName, product.description, product.category,
        product.hsnCode, product.category1, product.category2, product.category3,
      ].some(value => String(value ?? '').toLowerCase().includes(search))
    );
  }

  getProductCellValue(product: ProductRecord, field: ProductTableFieldKey): string {
    const value = product[field];
    return value === null || value === undefined || value === ''
      ? '-'
      : String(value);
  }

  getProductImage(product: ProductRecord, field: ProductTableFieldKey): string | null {
    const value = product[field];
    return typeof value === 'string' && value ? value : null;
  }

  edit(product: ProductRecord): void {
    this.productForm.reset({
      id: product.id,
      name: product.name,
      productIDName: product.productIDName || '',
      description: product.description || '',
      category: product.category || '',
      hsnCode: product.hsnCode || '',
      category1: product.category1 || '',
      category2: product.category2 || '',
      category3: product.category3 || '',
      productImage: product.productImage || '',
    });
    this.imagePreview = product.productImage || null;
    this.editing = true;
    this.editingProduct = product;
    this.productForm.controls.id.disable();
  }

  confirmDelete(product: ProductRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Product',
      message: 'Are you sure want to delete?',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'btn btn-sm product-confirm-yes',
      rejectButtonStyleClass: 'btn btn-sm product-confirm-no',
      accept: () => this.delete(product),
    });
  }

  private delete(product: ProductRecord): void {
    this.productService.deleteProduct(product.id).subscribe({
      next: response => {
        this.toastr.success(response.statusMsg || 'Product deleted successfully', 'Success');
        if (this.productForm.controls.id.value === product.id) {
          this.clear();
        }
        this.fetchProducts();
      },
      error: error => {
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to delete product',
          'Error'
        );
      },
    });
  }

  clear(): void {
    this.productForm.controls.id.enable();
    this.productForm.reset();
    this.imagePreview = null;
    this.editing = false;
    this.editingProduct = null;
    this.submitting = false;
  }

  private createSavePayload(): ProductSavePayload {
    const savedProduct = this.editingProduct;
    return {
      ...this.productForm.getRawValue(),
      category: this.productForm.controls.category.value.trim() || null,
      category1: this.productForm.controls.category1.value.trim() || null,
      category2: this.productForm.controls.category2.value.trim() || null,
      category3: this.productForm.controls.category3.value.trim() || null,
      productImage: this.productForm.controls.productImage.value || null,
      hsnType: savedProduct?.hsnType ?? '',
      configuration: savedProduct?.configuration ?? '',
      dfsCode: savedProduct?.dfsCode ?? '',
      type: savedProduct?.type ?? '',
      productClass: savedProduct?.productClass ?? '',
      productType: savedProduct?.productType ?? '',
      upcEan: savedProduct?.upcEan ?? '',
      warehouse: savedProduct?.warehouse ?? '',
      length: this.toSaveNumber(savedProduct?.length),
      width: this.toSaveNumber(savedProduct?.width),
      height: this.toSaveNumber(savedProduct?.height),
      weight: this.toSaveNumber(savedProduct?.weight),
      mrp: this.toSaveNumber(savedProduct?.mrp),
      sellingPrice: this.toSaveNumber(savedProduct?.sellingPrice),
      tax: this.toSaveNumber(savedProduct?.tax),
      baseUnit: savedProduct?.baseUnit ?? '',
      salesUnit: savedProduct?.salesUnit ?? '',
      purchaseUnit: savedProduct?.purchaseUnit ?? '',
      minStock: this.toSaveNumber(savedProduct?.minStock),
      maxStock: this.toSaveNumber(savedProduct?.maxStock),
      leadTime: this.toSaveNumber(savedProduct?.leadTime),
      instructions: savedProduct?.instructions ?? '',
    };
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const response = error.error as { statusMsg?: unknown; detail?: unknown } | null;
      if (typeof response?.statusMsg === 'string') {
        return response.statusMsg;
      }
      if (typeof response?.detail === 'string') {
        return response.detail;
      }
    }
    return error instanceof Error ? error.message : fallback;
  }

  private toSaveNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error('Cannot save this product because it contains invalid numeric data.');
    }
    return number;
  }

  onFileChange(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];
    if (!file) {
      this.productForm.controls.productImage.setValue('');
      this.imagePreview = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Choose a valid image file.', 'Validation');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === 'string' ? reader.result : '';
      this.productForm.controls.productImage.setValue(image);
      this.imagePreview = image || null;
    };
    reader.onerror = () => {
      this.toastr.error('Unable to read the selected image.', 'Error');
    };
    reader.readAsDataURL(file);
  }

  removeImage(input: HTMLInputElement): void {
    input.value = '';
    this.productForm.controls.productImage.setValue('');
    this.productForm.controls.productImage.markAsDirty();
    this.productForm.controls.productImage.markAsTouched();
    this.productForm.controls.productImage.updateValueAndValidity();
    this.imagePreview = null;
  }
}
