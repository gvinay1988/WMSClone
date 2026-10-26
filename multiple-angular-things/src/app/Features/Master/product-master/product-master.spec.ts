import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import {
  ProductMasterService,
  ProductRecord,
} from '../../../services/MasterDataService/product-master.service';
import { ExcelService } from '../../../services/MasterDataService/excel-service';
import { ProductMaster } from './product-master';

function createProductRecord(): ProductRecord {
  return {
    id: 'SKU-1',
    name: 'Product 1',
    product: 'Product',
    description: '',
    category: 'electronics',
    hsnType: 'GST',
    hsnCode: '1234',
    category1: 'hardware',
    category2: '',
    category3: '',
    configuration: 'standard',
    dfsCode: 'DFS-1',
    type: 'stock',
    productClass: 'class',
    productType: 'type',
    upcEan: '123456',
    warehouse: 'main',
    productImage: null,
    length: 10,
    width: 20,
    height: 30,
    weight: 2,
    mrp: 100,
    sellingPrice: 90,
    tax: 5,
    baseUnit: 'each',
    salesUnit: 'each',
    purchaseUnit: 'box',
    minStock: 1,
    maxStock: 50,
    leadTime: 2,
    instructions: 'Handle with care',
  };
}

describe('ProductMaster', () => {
  let component: ProductMaster;
  let fixture: ComponentFixture<ProductMaster>;
  let productService: jasmine.SpyObj<ProductMasterService>;

  beforeEach(async () => {
    productService = jasmine.createSpyObj<ProductMasterService>(
      'ProductMasterService',
      ['findAllProducts', 'saveProduct', 'deleteProduct']
    );
    productService.findAllProducts.and.returnValue(
      of({ statusCode: 200, statusMsg: 'Products fetched successfully', productList: [] })
    );

    await TestBed.configureTestingModule({
      imports: [ProductMaster],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductMasterService, useValue: productService },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductMaster);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the product list', () => {
    expect(component).toBeTruthy();
    expect(productService.findAllProducts).toHaveBeenCalled();
  });

  it('should expose a reactive control for every product field', () => {
    expect(Object.keys(component.productForm.controls)).toEqual([
      'id', 'name', 'product', 'description', 'category', 'hsnCode',
      'category1', 'category2', 'category3', 'productImage',
    ]);
  });

  it('exports every product field with headers accepted by the Excel upload parser', async () => {
    const excelService = TestBed.inject(ExcelService);
    const exportSpy = spyOn(excelService, 'exportAsExcelFileWithHeaderColors')
      .and.returnValue(Promise.resolve());
    component.products = [createProductRecord()];

    await component.exportAsXLSX();

    const [rows, fileName] = exportSpy.calls.mostRecent().args;
    expect(fileName).toBe('Product-Master');
    expect(Object.keys(rows[0])).toEqual([
      'S.No', 'Product ID', 'Product Name', 'Product', 'Description', 'Category',
      'HSN Type', 'HSN Code', 'Category 1', 'Category 2', 'Category 3',
      'Configuration', 'DFS Code', 'Type', 'Product Class', 'Product Type',
      'UPC/EAN', 'Warehouse', 'Product Image', 'Length', 'Width', 'Height',
      'Weight', 'MRP', 'Selling Price', 'Tax', 'Base Unit', 'Sales Unit',
      'Purchase Unit', 'Min Stock', 'Max Stock', 'Lead Time', 'Instructions',
    ]);
    expect(rows[0]['HSN Type']).toBe('GST');
    expect(rows[0]['Selling Price']).toBe(90);
    expect(rows[0].Instructions).toBe('Handle with care');
  });

  it('should show the image in the third table column and edit from the product ID', () => {
    const product = { ...createProductRecord(), productImage: 'data:image/png;base64,aW1hZ2U=' };
    component.products = [product];
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers.length).toBe(12);
    expect(headers[0].textContent).toContain('S.No');
    expect(headers[1].textContent).toContain('Product ID');
    expect(headers[2].textContent).toContain('Product Name');
    expect(headers[3].textContent).toContain('Image');
    const serialNumber = fixture.nativeElement.querySelector('.product-serial-number') as HTMLButtonElement;
    expect(serialNumber).toBeTruthy();
    spyOn(component, 'edit');
    serialNumber.click();
    expect(component.edit).toHaveBeenCalledWith(product);
    expect(fixture.nativeElement.querySelector('.pi-pencil')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.product-table-image')).toBeTruthy();
  });

  it('should require only product ID and name', () => {
    expect(component.productForm.invalid).toBeTrue();
    const saveButton = fixture.nativeElement.querySelector('.actions button[type="submit"]') as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();
    component.productForm.patchValue({
      id: 'SKU-1',
      name: 'Product 1',
    });
    fixture.detectChanges();
    expect(component.productForm.valid).toBeTrue();
    expect(component.canSaveProduct).toBeTrue();
    expect(saveButton.disabled).toBeFalse();
    component.productForm.controls.id.setValue(' ');
    expect(component.canSaveProduct).toBeFalse();
  });

  it('should submit blank optional categories and image as null', () => {
    productService.saveProduct.and.returnValue(
      of({ statusCode: 201, statusMsg: 'Product saved successfully' })
    );
    component.productForm.patchValue({ id: 'SKU-1', name: 'Product 1' });

    component.save();

    const payload = productService.saveProduct.calls.mostRecent().args[0];
    expect(payload.category).toBeNull();
    expect(payload.category1).toBeNull();
    expect(payload.category2).toBeNull();
    expect(payload.category3).toBeNull();
    expect(payload.productImage).toBeNull();
  });

  it('should allow saving without a product image', () => {
    component.productForm.controls.productImage.setValue('data:image/png;base64,aW1hZ2U=');
    component.imagePreview = 'data:image/png;base64,aW1hZ2U=';
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#productImageFile') as HTMLInputElement;
    Object.defineProperty(input, 'value', { writable: true, value: 'C:\\fakepath\\product.png' });
    const removeButton = fixture.nativeElement.querySelector('.remove-image-button') as HTMLButtonElement;
    expect(removeButton).toBeTruthy();
    removeButton.click();
    fixture.detectChanges();

    expect(component.productForm.controls.productImage.value).toBe('');
    expect(component.productForm.controls.productImage.valid).toBeTrue();
    expect(component.imagePreview).toBeNull();
    expect(input.value).toBe('');
    expect(fixture.nativeElement.querySelector('.remove-image-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.preview .placeholder')).toBeTruthy();
  });
});
