import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
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
  ProductRecord,
  ProductSavePayload,
} from '../../../services/MasterDataService/product-master.service';
import { ExcelService } from '../../../services/MasterDataService/excel-service';
import { Constants } from '../../../../Constant/constantFiles';

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
  imports: [CommonmoduleimportModule, ConfirmDialogModule, ButtonModule, TabsModule],
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
      product: this.fb.nonNullable.control(''),
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


  exportAsXLSX() {
    const data = this.exportTypeMethod(this.products);
    this.excelService.exportAsExcelFile(data, 'Product Data');
  }

  exportTypeMethod(data: any[]) {
    const arr: any[] = [];
    if (data && data.length > 0) {
      data.forEach(k => {
        arr.push({
          'Product ID': k.id ?? null,
          'Name': k.name ?? null,
          'Product': k.product ?? null,
          'Type': k.type ?? null,
          'Product Type': k.productType ?? null,
          'Category': k.category ?? null,
          'Base Unit': k.baseUnit ?? null,
          'Purchase Unit': k.purchaseUnit ?? null,
          'Sales Unit': k.salesUnit ?? null,
          'Selling Price': k.sellingPrice ?? null,
          'MRP': k.mrp ?? null,
          'Tax': k.tax ?? null,
          'HSN Code': k.hsnCode ?? null,
          'HSN Type': k.hsnType ?? null,
          'DFS Code': k.dfsCode ?? null,
          'UPC/EAN': k.upcEan ?? null,
          'Warehouse': k.warehouse ?? null,
          'Min Stock': k.minStock ?? null,
          'Max Stock': k.maxStock ?? null,
          'Weight': k.weight ?? null,
          'Length': k.length ?? null,
          'Width': k.width ?? null,
          'Height': k.height ?? null,
          'Configuration': k.configuration ?? null,
          'Description': k.description ?? null,
          'Instructions': k.instructions ?? null
        });
      });
    }

    return arr;
  }
 globalPayload: any;
replaceExisting: boolean = false;
failureRecords: any[] = [];
missingParams: string = '';
isShowOrHideError: boolean = false;

private setting = {
  element: {
    dynamicDownload: null as unknown as HTMLElement
  }
};

importProducts = async (event: any) => {
  if (event.target.files && event.target.files[0]) {
    this.isShowOrHideError = false;
    this.missingParams = '';
    this.failureRecords = [];

    await this.excelService.generateJsonUsingExcel(event);

    setTimeout(() => {
      let jsonData = this.excelService.getJsonData();

      if (jsonData && jsonData.length > 0) {
        event.target.value = '';
        jsonData = this.convertProductExcelHeaders(jsonData);

        const missingParamsArray = this.mandatoryCheck(jsonData);

        if (missingParamsArray.length > 1) {
          this.failureRecords = missingParamsArray;
          this.missingParams = missingParamsArray.join(', ');
          this.toastr.error('Please download log file to fill mandatory fields');
          this.fetchProducts();
          return;
        }

     const reqData = this.excelService.generateInnerObjs(
  jsonData,
  Constants.PRODUCT_INNER_OBJS
);
       

        const objects = reqData.map((obj: any) => ({
          ...obj,
          length: obj.length !== undefined ? Number(obj.length) : null,
          width: obj.width !== undefined ? Number(obj.width) : null,
          height: obj.height !== undefined ? Number(obj.height) : null,
        }));

        this.globalPayload = {
          objects,
          replacement: this.replaceExisting
        };
        this.productService.uploadProductsExcel(this.globalPayload).subscribe({
          next: (res: any) => {
            const productDataMap = res?.data?.productDataMap;

            if (res?.status === '0' && productDataMap) {
              const failures = productDataMap.failureList || [];
              const duplicates = productDataMap.duplicateList || [];
              const successes = productDataMap.successList || [];

              this.failureRecords = [...failures, ...duplicates];

              if (failures.length > 0 && successes.length > 0) {
                this.toastr.error('Partially failed in uploading. Please download the log for reasons.');
              } else if (failures.length > 0) {
                this.toastr.error('Failed in uploading. Please download the log for reasons.');
              } else if (duplicates.length > 0) {
                this.toastr.error('Duplicates present in the Excel. Please download the log file.');
              } else {
                this.toastr.success('Uploaded successfully');
                this.failureRecords = [];
              }

              this.fetchProducts();
            } else {
              this.toastr.error('Failed in uploading');
            this.fetchProducts();
            }
          },
          error: (error: any) => {
            console.error('Product Excel upload error:', error);
            this.toastr.error('Failed in uploading');
          }
        });
      } else {
        event.target.value = '';
        this.toastr.error('The Excel file contains no data.');
      }
    }, 500);
  }
};

convertProductExcelHeaders(jsonData: any[]) {
  const productHeaderMap: Record<string, string> = {
    'Product ID': 'id',
    'Name': 'name',
    'Product': 'product',
    'Type': 'type',
    'Product Type': 'productType',
    'Category': 'category',
    'Base Unit': 'baseUnit',
    'Purchase Unit': 'purchaseUnit',
    'Sales Unit': 'salesUnit',
    'Selling Price': 'sellingPrice',
    'MRP': 'mrp',
    'Tax': 'tax',
    'HSN Code': 'hsnCode',
    'HSN Type': 'hsnType',
    'DFS Code': 'dfsCode',
    'UPC/EAN': 'upcEan',
    'Warehouse': 'warehouse',
    'Min Stock': 'minStock',
    'Max Stock': 'maxStock',
    'Weight': 'weight',
    'Length': 'length',
    'Width': 'width',
    'Height': 'height',
    'Configuration': 'configuration',
    'Description': 'description',
    'Instructions': 'instructions'
  };

  return jsonData.map((record: any) => {
    const newObj: any = {};
    Object.keys(record).forEach((key: string) => {
      newObj[productHeaderMap[key] || key] = record[key];
    });
    return newObj;
  });
}

mandatoryCheck(data: any[]) {
  const missingParamsArray = [
    'Please refer below to enter mandatory fields for each row in the Excel sheet:\n'
  ];

  if (data?.length > 0) {
    data.forEach((record: any, index: number) => {
      const requiredParams = Constants.UPLOAD_MANDAT_FIELDS[record.type] || [];
      const missingParams = requiredParams.filter(
        (param: string) => !record[param]
      );

      if (missingParams.length > 0) {
        missingParamsArray.push(
          `Row No. ${index + 1} - ${missingParams.join(', ')}\n`
        );
      }
    });
  }

  return missingParamsArray;
}

openImportConfirm() {
  this.replaceExisting = false;
 // this.ngxSmartModalService.getModal('importConfirmPopup').open();
}

getFile() {
  
    document.getElementById('upfile')?.click();
 
}

dyanmicDownloadByHtmlTag(arg: { fileName: string; text: string }) {
  if (!this.setting.element.dynamicDownload) {
    this.setting.element.dynamicDownload = document.createElement('a');
  }

  const element = this.setting.element.dynamicDownload;
  const fileType = arg.fileName.includes('.json') ? 'text/json' : 'text/plain';

  element.setAttribute(
    'href',
    `data:${fileType};charset=utf-8,${encodeURIComponent(arg.text)}`
  );
  element.setAttribute('download', arg.fileName);
  element.dispatchEvent(new MouseEvent('click'));
}

downloadLogFile() {
  if (this.missingParams) {
    this.dyanmicDownloadByHtmlTag({
      fileName: 'Product Mandatory Fields Missing.txt',
      text: 'Please add missing fields:\n' + this.missingParams.replace(/,/g, '\n')
    });
  } else if (this.failureRecords?.length) {
    this.dyanmicDownloadByHtmlTag({
      fileName: 'Product Upload Error Reasons.txt',
      text: 'Please check the errors:\n' + this.failureRecords
        .map((record: any) =>
          typeof record === 'string' ? record : JSON.stringify(record)
        )
        .join('\n')
    });
  }
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
      id: product.id,
      name: product.name,
      product: product.product || '',
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
