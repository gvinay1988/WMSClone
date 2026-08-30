import { Injectable } from '@angular/core';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  
 REST_TYPE_GET: any = 'GET';
  REST_TYPE_POST: any = 'POST';
  REST_TYPE_PUT: any = 'PUT';
  REST_TYPE_DELETE: any = 'DELETE';

  constructor(private httpService: HttpService) { } 
saveUserConfiguration(entityData: any) {
  const httpReq: HttpReq = new HttpReq();
  httpReq.type = this.REST_TYPE_POST;
  httpReq.url = '/userConfiguration/services/saveorUpdateUserConfiguration';
  httpReq.showLoader = true;
  httpReq.contentType = 'applicationJSON';
  httpReq.body = entityData;
  return this.httpService.restCall(httpReq);
}
findUserConfiguration(entityData: any) {
  const httpReq: HttpReq = new HttpReq();
  httpReq.type = this.REST_TYPE_POST; 
  httpReq.url = '/userConfiguration/services/fetchAllUserConfigurations';
  httpReq.showLoader = true;
  httpReq.contentType = 'applicationJSON';
   httpReq.body = entityData;
  return this.httpService.restCall(httpReq); 
}
 
}