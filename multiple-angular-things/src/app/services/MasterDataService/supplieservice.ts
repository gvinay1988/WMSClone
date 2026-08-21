import { Injectable } from '@angular/core';
import { HttpService } from '../../Features/Auth/http-service';
import { HttpReq } from '../../Entities/app.entity';


@Injectable({
  providedIn: 'root',
})
export class Supplieservice {

  REST_TYPE_GET: any = 'GET';
  REST_TYPE_POST: any = 'POST';
  REST_TYPE_PUT: any = 'PUT';
  REST_TYPE_DELETE: any = 'DELETE';

  constructor(private httpService: HttpService) { } 
saveSupplierMasterData(entityData: any) {
  const httpReq: HttpReq = new HttpReq();
  httpReq.type = this.REST_TYPE_POST;
  httpReq.url = 'supplier/services/saveorUpdateSupplierMaster';
  httpReq.showLoader = true;
  httpReq.contentType = 'applicationJSON';
  httpReq.body = entityData;
  return this.httpService.restCall(httpReq);
}
 
}






