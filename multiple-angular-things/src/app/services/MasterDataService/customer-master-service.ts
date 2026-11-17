import { Injectable } from '@angular/core';
import { HttpReq } from '../../Entities/app.entity';
import { Observable } from 'rxjs';
import { HttpService } from '../../Features/Auth/http-service';


interface CustomerMasterResponse {
  statusCode: number;
  statusMsg: string;
  data: any[];
  customers?: any[];
}

@Injectable({
  providedIn: 'root',
})
export class CustomerMasterService {
  private readonly restTypePost = 'POST';
  
    constructor(private readonly httpService: HttpService) {}
    saveCustomerMaster(customer:any) {
      const request = this.createRequest('customerMaster/services/customerMaster', customer);
      return this.httpService.restCall(request);
    }
    findAllCustomer() {
      const request = this.createRequest('customerMaster/services/customerMaster/findAllCustomer', {});
      return this.httpService.restCall(request) as Observable<CustomerMasterResponse>;
    }
    deleteCustomer(id: string) {
      const request = this.createRequest('customerMaster/services/deleteCustomerMaster', { id });
      return this.httpService.restCall(request);
    }
    private createRequest(url: string, body: object): HttpReq {
      const request = new HttpReq();
      request.type = this.restTypePost;
      request.url = url;
      request.showLoader = true;
      request.contentType = 'applicationJSON';
      request .body = body;
      return request;
    }
}