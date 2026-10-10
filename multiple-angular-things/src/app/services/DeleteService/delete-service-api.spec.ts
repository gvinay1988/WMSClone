import { TestBed } from '@angular/core/testing';

import { DeleteServiceAPI } from './delete-service-api';

describe('DeleteServiceAPI', () => {
  let service: DeleteServiceAPI;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteServiceAPI);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
