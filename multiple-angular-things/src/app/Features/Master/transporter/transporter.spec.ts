import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transporter } from './transporter';

describe('Transporter', () => {
  let component: Transporter;
  let fixture: ComponentFixture<Transporter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transporter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transporter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
