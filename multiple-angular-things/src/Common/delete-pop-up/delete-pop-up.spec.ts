import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletePopUp } from './delete-pop-up';

describe('DeletePopUp', () => {
  let component: DeletePopUp;
  let fixture: ComponentFixture<DeletePopUp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletePopUp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeletePopUp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
