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
  hsnCode: FormControl<string>;
  category1: FormControl<string>;
  category2: FormControl<string>;
  category3: FormControl<string>;
  productImage: FormControl<string>;
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
      hsnCode: this.fb.nonNullable.control(''),
      category1: this.fb.nonNullable.control(''),
      category2: this.fb.nonNullable.control(''),
      category3: this.fb.nonNullable.control(''),
      productImage: this.fb.nonNullable.control('', Validators.required),
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
        product.hsnCode, product.category1, product.category2, product.category3,
      ].some(value => String(value ?? '').toLowerCase().includes(search))
    );
  }

  edit(product: ProductRecord): void {
    this.productForm.reset({
      ...product,
      productImage: product.productImage || '',
    });
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
