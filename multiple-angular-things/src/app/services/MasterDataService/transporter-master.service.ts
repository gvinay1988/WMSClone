import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface TransporterRecord {
  id: string; transporterCode: string; transporterName: string; contactPerson: string;
  email: string; phone: string; city: string; status: 'Active' | 'Inactive';
}
export interface TransporterResponse { statusCode: number; statusMsg: string; transporterList?: TransporterRecord[]; }

@Injectable({ providedIn: 'root' })
export class TransporterMasterService {
  constructor(private readonly httpService: HttpService) {}
  saveTransporter(transporter: Partial<TransporterRecord>): Observable<TransporterResponse> {
    return this.httpService.restCall(this.request('transporterMaster/services/saveorUpdateTransporterMaster', transporter)) as Observable<TransporterResponse>;
  }
  findAllTransporters(): Observable<TransporterResponse> {
    return this.httpService.restCall(this.request('transporterMaster/services/fetchAllTransporters', {})) as Observable<TransporterResponse>;
  }
  deleteTransporter(id: string): Observable<TransporterResponse> {
    return this.httpService.restCall(this.request('transporterMaster/services/deleteTransporterMaster', { id })) as Observable<TransporterResponse>;
  }
  private request(url: string, body: object): HttpReq {
    const request = new HttpReq(); request.type = 'POST'; request.url = url; request.showLoader = true;
    request.contentType = 'applicationJSON'; request.body = body; return request;
  }
}
