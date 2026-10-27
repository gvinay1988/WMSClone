import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface ProductCategoryGroupRecord {
  id: string;
  groupName: string;
  category1: string[];
  category2: string[];
  category3: string[];
}

export interface ProductCategoryGroupResponse {
  statusCode: number;
  statusMsg: string;
  group?: ProductCategoryGroupRecord;
  groupList?: ProductCategoryGroupRecord[];
}

@Injectable({
  providedIn: 'root',
})
export class ProductCategoryGroupService {
  private readonly restTypePost = 'POST';

  constructor(private readonly httpService: HttpService) {}

  saveGroup(group: Partial<ProductCategoryGroupRecord>): Observable<ProductCategoryGroupResponse> {
    return this.httpService.restCall(
      this.createRequest('productCategoryGroup/services/saveorUpdateProductCategoryGroup', group)
    ) as Observable<ProductCategoryGroupResponse>;
  }

  findAllGroups(): Observable<ProductCategoryGroupResponse> {
    return this.httpService.restCall(
      this.createRequest('productCategoryGroup/services/fetchAllProductCategoryGroups', {})
    ) as Observable<ProductCategoryGroupResponse>;
  }

  deleteGroup(id: string): Observable<ProductCategoryGroupResponse> {
    return this.httpService.restCall(
      this.createRequest('productCategoryGroup/services/deleteProductCategoryGroup', { id })
    ) as Observable<ProductCategoryGroupResponse>;
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
