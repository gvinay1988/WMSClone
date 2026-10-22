import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface ProductRecord {
  id: string;
  name: string;
  product: string;
  description: string;
  category: string;
  hsnCode: string;
  category1: string;
  category2: string;
  category3: string;
  productImage: string;
}

export interface ProductMasterResponse {
  statusCode: number;
  statusMsg: string;
  productList?: ProductRecord[];
}

export type ProductSavePayload = Pick<ProductRecord, 'id' | 'name' | 'category'>
  & Partial<ProductRecord>;

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
