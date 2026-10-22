import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import {
  ProductMasterService,
  ProductRecord,
} from '../../../services/MasterDataService/product-master.service';
import { ProductMaster } from './product-master';

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
      'id', 'name', 'product', 'description', 'category', 'hsnType', 'hsnCode',
      'category1', 'category2', 'category3', 'configuration', 'dfsCode', 'type',
      'productClass', 'productType', 'upcEan', 'warehouse', 'productImage',
      'length', 'width', 'height', 'weight', 'mrp', 'sellingPrice', 'tax',
      'baseUnit', 'salesUnit', 'purchaseUnit', 'minStock', 'maxStock', 'leadTime',
      'instructions',
    ]);
  });

  it('should show the image in the third table column and edit from the product ID', () => {
    const product: ProductRecord = {
      id: 'SKU-1',
      name: 'Product 1',
      product: 'Product',
      description: '',
      category: 'electronics',
      hsnType: '',
      hsnCode: '',
      category1: '',
      category2: '',
      category3: '',
      configuration: '',
      dfsCode: '',
      type: '',
      productClass: '',
      productType: '',
      upcEan: '',
      warehouse: '',
      productImage: 'data:image/png;base64,aW1hZ2U=',
      length: null,
      width: null,
      height: null,
      weight: null,
      mrp: null,
      sellingPrice: null,
      tax: null,
      baseUnit: '',
      salesUnit: '',
      purchaseUnit: '',
      minStock: null,
      maxStock: null,
      leadTime: null,
      instructions: '',
    };
    component.products = [product];
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers.length).toBe(33);
    expect(headers[0].textContent).toContain('Product ID');
    expect(headers[1].textContent).toContain('Product Name');
    expect(headers[2].textContent).toContain('Image');
    const productId = fixture.nativeElement.querySelector('.product-name-link') as HTMLButtonElement;
    expect(productId).toBeTruthy();
    spyOn(component, 'edit');
    productId.click();
    expect(component.edit).toHaveBeenCalledWith(product);
    expect(fixture.nativeElement.querySelector('.pi-pencil')).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-table-image')).toBeTruthy();
  });

  it('should require product ID, name, category, and image', () => {
    expect(component.productForm.invalid).toBeTrue();
    component.productForm.patchValue({
      id: 'SKU-1',
      name: 'Product 1',
      category: 'a',
      productImage: 'data:image/png;base64,aW1hZ2U=',
    });
    expect(component.productForm.valid).toBeTrue();
  });
});
