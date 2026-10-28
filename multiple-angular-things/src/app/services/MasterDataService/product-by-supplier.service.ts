import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface SupplierOption {
  id: string;
  supplierCode: string;
  supplierName: string;
  city?: string | null;
  supplierType?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  product?: string | null;
  description?: string | null;
  category?: string | null;
  hsnCode?: string | null;
}

export interface ProductBySupplierOptionsResponse {
  statusCode: number;
  statusMsg: string;
  suppliers: SupplierOption[];
  products: ProductOption[];
}

export interface SupplierProductsResponse {
  statusCode: number;
  statusMsg: string;
  productIds: string[];
}

export interface ProductBySupplierMutationResponse {
  statusCode: number;
  statusMsg: string;
}

@Injectable({ providedIn: 'root' })
export class ProductBySupplierService {
  constructor(private readonly httpService: HttpService) {}

  fetchOptions(): Observable<ProductBySupplierOptionsResponse> {
    return this.httpService.restCall(this.request('productBySupplier/services/fetchOptions', {})) as Observable<ProductBySupplierOptionsResponse>;
  }

  fetchSupplierProducts(supplierId: string): Observable<SupplierProductsResponse> {
    return this.httpService.restCall(this.request('productBySupplier/services/fetchSupplierProducts', { supplierId })) as Observable<SupplierProductsResponse>;
  }

  saveSupplierProducts(supplierId: string, productIds: string[]): Observable<ProductBySupplierMutationResponse> {
    return this.httpService.restCall(this.request('productBySupplier/services/saveSupplierProducts', { supplierId, productIds })) as Observable<ProductBySupplierMutationResponse>;
  }

  private request(url: string, body: object): HttpReq {
    const request = new HttpReq();
    request.type = 'POST';
    request.url = url;
    request.showLoader = true;
    request.contentType = 'applicationJSON';
    request.body = body;
    return request;
  }
}
