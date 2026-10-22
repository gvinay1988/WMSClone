import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ProductMasterService } from '../../../services/MasterDataService/product-master.service';
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
      'id', 'name', 'product', 'description', 'category', 'hsnCode', 'category1',
      'category2', 'category3', 'productImage',
    ]);
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
