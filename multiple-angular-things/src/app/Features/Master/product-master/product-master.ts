import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  ProductMasterService,
  ProductRecord,
} from '../../../services/MasterDataService/product-master.service';

interface ProductFormControls {
  id: FormControl<string>;
  name: FormControl<string>;
  product: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<string>;
  hsnType: FormControl<string>;
  hsnCode: FormControl<string>;
  category1: FormControl<string>;
  category2: FormControl<string>;
  category3: FormControl<string>;
  configuration: FormControl<string>;
  dfsCode: FormControl<string>;
  type: FormControl<string>;
  productClass: FormControl<string>;
  productType: FormControl<string>;
  upcEan: FormControl<string>;
  warehouse: FormControl<string>;
  productImage: FormControl<string>;
  length: FormControl<number | null>;
  width: FormControl<number | null>;
  height: FormControl<number | null>;
  weight: FormControl<number | null>;
  mrp: FormControl<number | null>;
  sellingPrice: FormControl<number | null>;
  tax: FormControl<number | null>;
  baseUnit: FormControl<string>;
  salesUnit: FormControl<string>;
  purchaseUnit: FormControl<string>;
  minStock: FormControl<number | null>;
  maxStock: FormControl<number | null>;
  leadTime: FormControl<number | null>;
  instructions: FormControl<string>;
}

@Component({
  selector: 'app-product-master',
  standalone: true,
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './product-master.html',
  styleUrl: './product-master.scss',
})
export class ProductMaster implements OnInit {
  readonly categories = [
    { label: 'Category A', value: 'a' },
    { label: 'Category B', value: 'b' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Office Supplies', value: 'office-supplies' },
    { label: 'Furniture', value: 'furniture' },
    { label: 'Consumables', value: 'consumables' },
    { label: 'Raw Materials', value: 'raw-materials' },
  ];
  productForm: FormGroup<ProductFormControls>;
  products: ProductRecord[] = [];
  imagePreview: string | null = null;
  searchText = '';
  rows = 10;
  loading = false;
  submitting = false;
  editing = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly productService: ProductMasterService,
    private readonly confirmationService: ConfirmationService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.productForm = this.fb.group<ProductFormControls>({
      id: this.fb.nonNullable.control('', Validators.required),
      name: this.fb.nonNullable.control('', Validators.required),
      product: this.fb.nonNullable.control(''),
      description: this.fb.nonNullable.control(''),
      category: this.fb.nonNullable.control('', Validators.required),
      hsnType: this.fb.nonNullable.control(''),
      hsnCode: this.fb.nonNullable.control(''),
      category1: this.fb.nonNullable.control(''),
      category2: this.fb.nonNullable.control(''),
      category3: this.fb.nonNullable.control(''),
      configuration: this.fb.nonNullable.control(''),
      dfsCode: this.fb.nonNullable.control(''),
      type: this.fb.nonNullable.control(''),
      productClass: this.fb.nonNullable.control(''),
      productType: this.fb.nonNullable.control(''),
      upcEan: this.fb.nonNullable.control(''),
      warehouse: this.fb.nonNullable.control(''),
      productImage: this.fb.nonNullable.control('', Validators.required),
      length: this.fb.control<number | null>(null, Validators.min(0)),
      width: this.fb.control<number | null>(null, Validators.min(0)),
      height: this.fb.control<number | null>(null, Validators.min(0)),
      weight: this.fb.control<number | null>(null, Validators.min(0)),
      mrp: this.fb.control<number | null>(null, Validators.min(0)),
      sellingPrice: this.fb.control<number | null>(null, Validators.min(0)),
      tax: this.fb.control<number | null>(null, Validators.min(0)),
      baseUnit: this.fb.nonNullable.control(''),
      salesUnit: this.fb.nonNullable.control(''),
      purchaseUnit: this.fb.nonNullable.control(''),
      minStock: this.fb.control<number | null>(null, Validators.min(0)),
      maxStock: this.fb.control<number | null>(null, Validators.min(0)),
      leadTime: this.fb.control<number | null>(null, [
        Validators.min(0),
        control => control.value === null || Number.isInteger(control.value)
          ? null
          : { wholeNumber: true },
      ]),
      instructions: this.fb.nonNullable.control(''),
    });
  }

  ngOnInit(): void {
    this.fetchProducts();
  }

  save(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.toastr.warning('Please complete the required product fields and select a product image.', 'Validation');
      return;
    }

    this.submitting = true;
    this.productService.saveProduct(this.productForm.getRawValue()).subscribe({
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

  get filteredProducts(): ProductRecord[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.products;
    }

    return this.products.filter(product =>
      [
        product.id, product.name, product.product, product.description, product.category,
        product.hsnType, product.hsnCode, product.category1, product.category2,
        product.category3, product.configuration, product.dfsCode, product.type,
        product.productClass, product.productType, product.upcEan, product.warehouse,
        product.length, product.width, product.height, product.weight, product.mrp,
        product.sellingPrice, product.tax, product.baseUnit, product.salesUnit,
        product.purchaseUnit, product.minStock, product.maxStock, product.leadTime,
        product.instructions,
      ].some(value => String(value ?? '').toLowerCase().includes(search))
    );
  }

  edit(product: ProductRecord): void {
    try {
      this.productForm.reset({
        ...product,
        productImage: product.productImage || '',
        length: this.toFormNumber(product.length),
        width: this.toFormNumber(product.width),
        height: this.toFormNumber(product.height),
        weight: this.toFormNumber(product.weight),
        mrp: this.toFormNumber(product.mrp),
        sellingPrice: this.toFormNumber(product.sellingPrice),
        tax: this.toFormNumber(product.tax),
        minStock: this.toFormNumber(product.minStock),
        maxStock: this.toFormNumber(product.maxStock),
        leadTime: this.toFormNumber(product.leadTime),
      });
    } catch (error) {
      this.toastr.error(
        error instanceof Error
          ? `This product cannot be edited: ${error.message}`
          : 'This product contains invalid numeric data and cannot be edited.',
        'Error'
      );
      return;
    }
    this.imagePreview = product.productImage || null;
    this.editing = true;
    this.productForm.controls.id.disable();
  }

  confirmDelete(product: ProductRecord): void {
    this.confirmationService.confirm({
      header: 'Delete Product',
      message: `Delete ${product.name} (${product.id})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
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
    this.submitting = false;
  }

  private toFormNumber(value: number | string | null): number | null {
    if (value === null || value === '') {
      return null;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error('Invalid product number');
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
}
