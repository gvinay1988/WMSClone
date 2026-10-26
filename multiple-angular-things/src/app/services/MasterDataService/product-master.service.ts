import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface ProductRecord {
  id: string;
  name: string;
  product: string;
  description: string;
  category: string | null;
  hsnType: string;
  hsnCode: string;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  configuration: string;
  dfsCode: string;
  type: string;
  productClass: string;
  productType: string;
  upcEan: string;
  warehouse: string;
  productImage: string | null;
  length: number | string | null;
  width: number | string | null;
  height: number | string | null;
  weight: number | string | null;
  mrp: number | string | null;
  sellingPrice: number | string | null;
  tax: number | string | null;
  baseUnit: string;
  salesUnit: string;
  purchaseUnit: string;
  minStock: number | string | null;
  maxStock: number | string | null;
  leadTime: number | string | null;
  instructions: string;
}

export interface ProductMasterResponse {
  statusCode: number;
  statusMsg: string;
  productList?: ProductRecord[];
}

export interface ProductExcelImportFailure {
  row: number;
  productId?: string;
  reason: string;
}

export interface ProductExcelUploadResponse {
  statusCode: number;
  statusMsg: string;
  importedCount: number;
  failureCount: number;
  failures: ProductExcelImportFailure[];
}

type ProductNumericField =
  | 'length'
  | 'width'
  | 'height'
  | 'weight'
  | 'mrp'
  | 'sellingPrice'
  | 'tax'
  | 'minStock'
  | 'maxStock'
  | 'leadTime';

export type ProductSavePayload = Omit<ProductRecord, ProductNumericField>
  & { [Field in ProductNumericField]: number | null };

interface ProductMutationResponse {
  statusCode: number;
  statusMsg: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductMasterService {
  private readonly restTypePost = 'POST';

  constructor(private readonly httpService: HttpService) {}

  saveProduct(product: ProductSavePayload) {
    return this.httpService.restCall(
      this.createRequest('productMaster/services/saveorUpdateProductMaster', product)
    ) as Observable<ProductMutationResponse>;
  }

  findAllProducts() {
    return this.httpService.restCall(
      this.createRequest('productMaster/services/fetchAllProducts', {})
    ) as Observable<ProductMasterResponse>;
  }

  deleteProduct(id: string) {
    return this.httpService.restCall(
      this.createRequest('productMaster/services/deleteProductMaster', { id })
    ) as Observable<ProductMutationResponse>;
  }

  uploadProductsExcel(file: File): Observable<ProductExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const request = new HttpReq();
    request.type = this.restTypePost;
    request.url = 'productMaster/services/uploadProductsExcel';
    request.showLoader = true;
    request.contentType = 'multipart/form-data';
    request.body = formData;
    return this.httpService.restCall(request) as Observable<ProductExcelUploadResponse>;
  }

  private createRequest(url: string, body: object): HttpReq {
    const request = new HttpReq();
    request.type = this.restTypePost;
    request.url = url;
    request.showLoader = true;
    request.contentType = 'applicationJSON';
    request.body = body;
    return request;
  }
}
