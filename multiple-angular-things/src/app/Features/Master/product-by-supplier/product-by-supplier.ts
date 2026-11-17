
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ProductBySupplierService, ProductOption, SupplierOption } from '../../../services/MasterDataService/product-by-supplier.service';
import { ProductMasterService } from '../../../services/MasterDataService/product-master.service';
import { Supplieservice } from '../../../services/MasterDataService/supplieservice';

@Component({
  selector: 'app-product-by-supplier',
  standalone: true,
  imports: [CommonmoduleimportModule, ReactiveFormsModule],
  templateUrl: './product-by-supplier.html',
  styleUrl: './product-by-supplier.scss',
})
export class ProductBySupplier implements OnInit {


  loading = false;
  saving = false;
  productBySupplierForm!: FormGroup;

  constructor(
    private service: ProductBySupplierService,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    private productService: ProductMasterService,
    private supplierService: Supplieservice
  ) { }

  ngOnInit(): void {
    this.createProductBySupplierForm();
    this.fetchProducts();
    this.fetchAllSuppliers();
  }
  createProductBySupplierForm(): void {
    this.productBySupplierForm = this.fb.group({
      supplierId: ['', Validators.required],
      supplierName: [''],
      supplierCode: [''],
      supplierType: [''],
      productId: [''],
      productName: [''],
      category: [''],
      hsnCode: ['']
    });
  }
  suppliersList: any[] = [];
  fetchAllSuppliers() {
    this.supplierService.findALLSuppliers({}).subscribe({
      next: (response: any) => {
        if (response?.statusCode === 200) {
          this.suppliersList = Array.isArray(response.supplierDetailsList) ? response.supplierDetailsList : [];
          this.cdRef.detectChanges();
        } else {
          this.toastr.error(response?.statusMsg || 'Failed to load suppliers', 'Error');
        }
      },
      error: (error) => {
        this.toastr.error(error?.error?.statusMsg || error?.error?.detail || 'Failed to load suppliers', 'Error');
      }
    });
  }
  productsList: any[] = [];
  fetchProducts(): void {
    this.loading = true;
    this.productService.findAllProducts().subscribe({
      next: response => {
        if (response.statusCode === 200 && response.productList) {
          this.productsList = response.productList || [];
          console.log('Fetched products:', this.productsList);
          this.loading = false;
          this.cdRef.detectChanges();
        }
      },
      error: error => {
        this.loading = false;
        this.toastr.error(
          error?.error?.statusMsg || error?.error?.detail || 'Failed to load products',
          'Error'
        );
        this.cdRef.detectChanges();
      },
    });
  }



  onSupplierChange(): void {
    const id = this.productBySupplierForm.get('supplierId')?.value;
    const selectedSupplier = this.suppliersList.find(s => String(s.id) === String(id));
    if (selectedSupplier) {
      this.productBySupplierForm.patchValue({
        supplierName: selectedSupplier.supplierName,
        supplierCode: selectedSupplier.supplierCode,
        supplierType: selectedSupplier.supplierType,
        supplierId: selectedSupplier.supplierId
      });
    }
  }

  onProductChange(): void {
    const productID = this.productBySupplierForm.get('productId')?.value;
    const selectedProduct = this.productsList.find(p => p.id === productID);
    if (selectedProduct) {
      this.productBySupplierForm.patchValue({
        productName: selectedProduct.name,
        category: selectedProduct.category,
        hsnCode: selectedProduct.hsnCode
      });
    }
  }
  selectedProducts: any[] = [];

  addProduct(): void {
    const f = this.productBySupplierForm.value;

    if (!f.productId) {
      this.toastr.warning('Please select a product.', 'Warning');
      return;
    }

    const alreadyAdded = this.selectedProducts.some(
      p => String(p.productId) === String(f.productId)
    );
    if (alreadyAdded) {
      this.toastr.warning('This product is already added.', 'Warning');
      return;
    }

    this.selectedProducts.push({
      productId: f.productId,
      productName: f.productName,
      category: f.category,
      hsnCode: f.hsnCode
    });

    // clear only the product fields, keep the supplier
    this.productBySupplierForm.patchValue({
      productId: '',
      productName: '',
      category: '',
      hsnCode: ''
    });
  }

  removeProduct(index: number): void {
    this.selectedProducts.splice(index, 1);
  }

  saveAssignment(): void {
    this.addProduct();
    if (this.productBySupplierForm.get('supplierId')?.invalid) {
      this.productBySupplierForm.get('supplierId')?.markAsTouched();
      return;
    }
    if (this.selectedProducts.length === 0) {
      this.toastr.warning('Add at least one product.', 'Warning');
      return;
    }

    this.saving = true;
    // Ensure the last selected product is added before saving
    const f = this.productBySupplierForm.value;

    const payload = {
      supplierId: f.supplierId,
      supplierName: f.supplierName,
      supplierCode: f.supplierCode,
      supplierType: f.supplierType,
      products: this.selectedProducts
    };

    this.service.saveSupplierProducts(payload).subscribe({
      next: res => {
        this.saving = false;
        if (res.statusCode === 200) {
          this.toastr.success(res.statusMsg || 'Products assigned successfully.', 'Success');
          this.selectedProducts = [];
          this.productBySupplierForm.reset({
            supplierId: '', supplierName: '', supplierCode: '', supplierType: '',
            productId: '', productName: '', category: '', hsnCode: ''
          });
        } else {
          this.toastr.error(res.statusMsg || 'Failed to save.', 'Error');
        }
        this.cdRef.markForCheck();
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.statusMsg || err?.error?.detail || 'Failed to save.', 'Error');
        this.cdRef.markForCheck();
      }
    });
  }
}