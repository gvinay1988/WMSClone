import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import {
  ProductBySupplierService,
  ProductOption,
  SupplierOption,
} from '../../../services/MasterDataService/product-by-supplier.service';

@Component({
  selector: 'app-product-by-supplier',
  standalone: true,
  imports: [CommonmoduleimportModule, FormsModule],
  templateUrl: './product-by-supplier.html',
  styleUrl: './product-by-supplier.scss',
})
export class ProductBySupplier implements OnInit {
  suppliers: SupplierOption[] = [];
  products: ProductOption[] = [];
  selectedSupplier: SupplierOption | null = null;
  selectedProduct: ProductOption | null = null;
  selectedSupplierId = '';
  selectedProductId = '';
  loading = false;
  saving = false;

  constructor(
    private readonly service: ProductBySupplierService,
    private readonly toastr: ToastrService,
    private readonly cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOptions();
  }

  onSupplierChange(): void {
    this.selectedSupplier = this.suppliers.find(item => item.id === this.selectedSupplierId) || null;
    this.selectedProduct = null;
    this.selectedProductId = '';
  }

  onProductChange(): void {
    this.selectedProduct = this.products.find(item => item.id === this.selectedProductId) || null;
  }

  saveAssignment(): void {
    if (!this.selectedSupplier || !this.selectedProduct) {
      this.toastr.warning('Select both a supplier and a product.', 'Validation');
      return;
    }

    this.saving = true;
    this.service.saveSupplierProducts(this.selectedSupplier.id, [this.selectedProduct.id]).subscribe({
      next: response => {
        this.saving = false;
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to save product assignment.', 'Error');
          return;
        }
        this.toastr.success(response.statusMsg || 'Product assigned successfully.', 'Success');
        this.cdRef.markForCheck();
      },
      error: error => {
        this.saving = false;
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to save product assignment.', 'Error');
        this.cdRef.markForCheck();
      },
    });
  }

  private loadOptions(): void {
    this.loading = true;
    this.service.fetchOptions().subscribe({
      next: response => {
        this.loading = false;
        if (response.statusCode !== 200) {
          this.toastr.error(response.statusMsg || 'Failed to load options.', 'Error');
          return;
        }
        this.suppliers = response.suppliers || [];
        this.products = response.products || [];
        this.cdRef.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to load options.', 'Error');
        this.cdRef.markForCheck();
      },
    });
  }
}
