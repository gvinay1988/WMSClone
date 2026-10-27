import { of } from 'rxjs';
import { HttpService } from '../../Features/Auth/http-service';
import { ProductMasterService } from './product-master.service';

describe('ProductMasterService', () => {
  let httpService: jasmine.SpyObj<HttpService>;
  let service: ProductMasterService;

  beforeEach(() => {
    httpService = jasmine.createSpyObj<HttpService>('HttpService', ['restCall']);
    httpService.restCall.and.returnValue(of({
      statusCode: 200,
      statusMsg: 'Product Excel upload processed',
      importedCount: 1,
      failureCount: 0,
      failures: [],
    }));
    service = new ProductMasterService(httpService);
  });

  it('uploads parsed product rows as JSON to the Product Master API', () => {
    const payload = {
      products: [{ id: 'SKU-1', name: 'Product 1', sellingPrice: 19.5 }],
    };

    service.uploadProductsExcel(payload).subscribe();

    const request = httpService.restCall.calls.mostRecent().args[0];
    expect(request.url).toBe('productMaster/services/uploadProductsExcel');
    expect(request.type).toBe('POST');
    expect(request.contentType).toBe('applicationJSON');
    expect(request.body).toEqual(payload);
  });
});
