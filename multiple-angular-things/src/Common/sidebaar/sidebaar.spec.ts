import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sidebaar } from './sidebaar';

describe('Sidebaar', () => {
  let component: Sidebaar;
  let fixture: ComponentFixture<Sidebaar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebaar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebaar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
