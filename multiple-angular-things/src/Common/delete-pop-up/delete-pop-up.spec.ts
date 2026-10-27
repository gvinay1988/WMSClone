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

  it('should emit a cancel event when deletion is canceled', () => {
    const cancelSpy = spyOn(component.onCancel, 'emit');

    component.cancelDelete();

    expect(component.visible).toBeFalse();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
