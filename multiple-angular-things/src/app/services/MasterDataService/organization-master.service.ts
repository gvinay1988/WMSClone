import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface OrganizationRecord {
  id: string;
  organizationCode: string;
  organizationName: string;
  legalName: string;
  taxId: string;
  registrationNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface OrganizationResponse {
  statusCode: number;
  statusMsg: string;
  organizationList?: OrganizationRecord[];
}

@Injectable({ providedIn: 'root' })
export class OrganizationMasterService {
  constructor(private readonly httpService: HttpService) {}

  saveOrganization(organization: Partial<OrganizationRecord>): Observable<OrganizationResponse> {
    return this.httpService.restCall(
      this.request('organizationMaster/services/saveorUpdateOrganizationMaster', organization)
    ) as Observable<OrganizationResponse>;
  }

  findAllOrganizations(): Observable<OrganizationResponse> {
    return this.httpService.restCall(
      this.request('organizationMaster/services/fetchAllOrganizations', {})
    ) as Observable<OrganizationResponse>;
  }

  deleteOrganization(id: string): Observable<OrganizationResponse> {
    return this.httpService.restCall(
      this.request('organizationMaster/services/deleteOrganizationMaster', { id })
    ) as Observable<OrganizationResponse>;
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
