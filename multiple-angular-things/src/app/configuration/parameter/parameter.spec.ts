import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Parameter } from './parameter';

describe('Parameter', () => {
  let component: Parameter;
  let fixture: ComponentFixture<Parameter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parameter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Parameter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
