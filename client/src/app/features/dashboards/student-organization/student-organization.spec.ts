import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentOrganization } from './student-organization';

describe('StudentOrganization', () => {
  let component: StudentOrganization;
  let fixture: ComponentFixture<StudentOrganization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOrganization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentOrganization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
