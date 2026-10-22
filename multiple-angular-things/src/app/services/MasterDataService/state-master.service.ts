import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface StateRecord {
  id: string;
  stateCode: string;
  stateName: string;
  country: string;
  capital: string;
  status: 'Active' | 'Inactive';
}

interface StateMasterResponse {
  statusCode: number;
  statusMsg: string;
  stateList?: StateRecord[];
}

@Injectable({
  providedIn: 'root',
})
export class StateMasterService {
  private readonly restTypePost = 'POST';

  constructor(private readonly httpService: HttpService) {}

  saveState(state: Partial<StateRecord>) {
    const request = this.createRequest('stateMaster/services/saveorUpdateStateMaster', state);
    return this.httpService.restCall(request);
  }

  findAllStates() {
    const request = this.createRequest('stateMaster/services/fetchAllStates', {});
    return this.httpService.restCall(request) as Observable<StateMasterResponse>;
  }

  deleteState(id: string) {
    const request = this.createRequest('stateMaster/services/deleteStateMaster', { id });
    return this.httpService.restCall(request);
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
