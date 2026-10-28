import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface VehicleRecord {
  id: string;
  vehicleCode: string;
  vehicleName: string;
  vehicleType: string;
  registrationNumber: string;
  capacity: number | null;
  status: 'Active' | 'Inactive';
}

export interface VehicleResponse {
  statusCode: number;
  statusMsg: string;
  vehicleList?: VehicleRecord[];
}

@Injectable({ providedIn: 'root' })
export class VehicleMasterService {
  constructor(private readonly httpService: HttpService) {}

  saveVehicle(vehicle: Partial<VehicleRecord>): Observable<VehicleResponse> {
    return this.httpService.restCall(this.request('vehicleMaster/services/saveorUpdateVehicleMaster', vehicle)) as Observable<VehicleResponse>;
  }

  findAllVehicles(): Observable<VehicleResponse> {
    return this.httpService.restCall(this.request('vehicleMaster/services/fetchAllVehicles', {})) as Observable<VehicleResponse>;
  }

  deleteVehicle(id: string): Observable<VehicleResponse> {
    return this.httpService.restCall(this.request('vehicleMaster/services/deleteVehicleMaster', { id })) as Observable<VehicleResponse>;
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
