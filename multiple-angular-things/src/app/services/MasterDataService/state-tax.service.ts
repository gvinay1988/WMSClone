import { Injectable } from '@angular/core';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

@Injectable({
  providedIn: 'root',
})
export class StateTaxService {
  private readonly REST_TYPE_POST = 'POST';

  constructor(private httpService: HttpService) {}

  saveStateTax(entityData: object) {
    const httpReq: HttpReq = new HttpReq();
    httpReq.type = this.REST_TYPE_POST;
    httpReq.url = '/stateTax/services/saveorUpdateStateTax';
    httpReq.showLoader = true;
    httpReq.contentType = 'applicationJSON';
    httpReq.body = entityData;
    return this.httpService.restCall(httpReq);
  }

  findAllStateTaxes(entityData: object) {
    const httpReq: HttpReq = new HttpReq();
    httpReq.type = this.REST_TYPE_POST;
    httpReq.url = '/stateTax/services/fetchAllStateTaxes';
    httpReq.showLoader = true;
    httpReq.contentType = 'applicationJSON';
    httpReq.body = entityData;
    return this.httpService.restCall(httpReq);
  }

  deleteStateTax(entityData: object) {
    const httpReq: HttpReq = new HttpReq();
    httpReq.type = this.REST_TYPE_POST;
    httpReq.url = '/stateTax/services/deleteStateTax';
    httpReq.showLoader = true;
    httpReq.contentType = 'applicationJSON';
    httpReq.body = entityData;
    return this.httpService.restCall(httpReq);
  }
}
