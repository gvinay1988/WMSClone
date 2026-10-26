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

  it('uploads the selected workbook as multipart form data to the Product Master API', () => {
    const file = new File(['workbook'], 'Product-Master.xlsx');

    service.uploadProductsExcel(file).subscribe();

    const request = httpService.restCall.calls.mostRecent().args[0];
    expect(request.url).toBe('productMaster/services/uploadProductsExcel');
    expect(request.type).toBe('POST');
    expect(request.contentType).toBe('multipart/form-data');
    const uploadedFile = (request.body as FormData).get('file') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.size).toBe(file.size);
  });
});
