import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormArrayDemoService } from './form-array-demo.service';

describe('FormArrayDemoService', () => {
  let service: FormArrayDemoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(FormArrayDemoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post a demo payload to the backend', () => {
    const payload = { formType: 'single', skills: [{ skill: 'Angular', experience: '2 years' }] };

    service.submitDemo(payload).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:8000/form-array-demo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'ok' });
  });
});
