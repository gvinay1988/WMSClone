import { TestBed } from '@angular/core/testing';

import { Supplieservice } from './supplieservice';

describe('Supplieservice', () => {
  let service: Supplieservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Supplieservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
