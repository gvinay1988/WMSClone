import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserConfiguration } from './user-configuration';

describe('UserConfiguration', () => {
  let component: UserConfiguration;
  let fixture: ComponentFixture<UserConfiguration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserConfiguration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserConfiguration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
