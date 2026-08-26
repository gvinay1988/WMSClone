import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Serverrpage } from './serverrpage';

describe('Serverrpage', () => {
  let component: Serverrpage;
  let fixture: ComponentFixture<Serverrpage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Serverrpage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Serverrpage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
