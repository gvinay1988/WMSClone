import { Injectable } from '@angular/core';
import { HttpReq } from '../../Entities/app.entity';
import { HttpService } from '../../Features/Auth/http-service';

@Injectable({
  providedIn: 'root',
})
export class ParameterService {
  private readonly restTypePost = 'POST';

  saveCountryParameterData(entityData: any) {
    return this.createRequest('parameter/service/saveCountryDetails', entityData);
  }

  findALLCountryList() {
    return this.createRequest('parameter/service/getCountryDetails', {});
  }

  saveCategoryParameterData(entityData: any) {
    return this.createRequest('parameter/service/saveCategoryDetails', entityData);
  }

  findCategoryList(categoryNumber: number) {
    return this.createRequest('parameter/service/getCategoryDetails', { categoryNumber });
  }

  getApplicationBranding() {
    return this.createRequest('parameter/service/getApplicationBranding', {});
  }

  saveApplicationBranding(settings: { dashboardText: string; headerImage: string | null }) {
    return this.createRequest('parameter/service/saveApplicationBranding', settings);
  }

  private createRequest(url: string, body: object) {
    const httpReq = new HttpReq();
    httpReq.type = this.restTypePost;
    httpReq.url = url;
    httpReq.showLoader = true;
    httpReq.contentType = 'applicationJSON';
    httpReq.body = body;
    return this.httpService.restCall(httpReq);
  }

  constructor(private readonly httpService: HttpService) {}
}
