import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

export interface WarehouseRecord {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface WarehouseResponse {
  statusCode: number;
  statusMsg: string;
  warehouseList?: WarehouseRecord[];
}

@Injectable({ providedIn: 'root' })
export class WarehouseMasterService {
  constructor(private readonly httpService: HttpService) {}

  saveWarehouse(warehouse: Partial<WarehouseRecord>): Observable<WarehouseResponse> {
    return this.httpService.restCall(
      this.request('warehouseMaster/services/saveorUpdateWarehouseMaster', warehouse)
    ) as Observable<WarehouseResponse>;
  }

  findAllWarehouses(): Observable<WarehouseResponse> {
    return this.httpService.restCall(
      this.request('warehouseMaster/services/fetchAllWarehouses', {})
    ) as Observable<WarehouseResponse>;
  }

  deleteWarehouse(id: string): Observable<WarehouseResponse> {
    return this.httpService.restCall(
      this.request('warehouseMaster/services/deleteWarehouseMaster', { id })
    ) as Observable<WarehouseResponse>;
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
