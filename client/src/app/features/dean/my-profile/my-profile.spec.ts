import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { DeanMyProfile } from './my-profile';
import { CollegeDepartmentProfileService } from '../../../services/dean/college-department-profile.service';
import { Auth } from '../../../services/auth/auth';

describe('Department profile email editing', () => {
  let service: jasmine.SpyObj<CollegeDepartmentProfileService>;
  let auth: jasmine.SpyObj<Auth>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('CollegeDepartmentProfileService', ['getProfile', 'updateProfile']);
    auth = jasmine.createSpyObj('Auth', ['getProfile']);
    service.getProfile.and.returnValue(of({ record: { email: 'department@example.test' } }));
    service.updateProfile.and.returnValue(of({ message: 'Saved', record: { email: 'new@example.test' } }));
    auth.getProfile.and.returnValue(of({ user: {} as any }));
    spyOn(Swal, 'fire').and.stub();
    await TestBed.configureTestingModule({
      imports: [DeanMyProfile],
      providers: [
        { provide: CollegeDepartmentProfileService, useValue: service },
        { provide: Auth, useValue: auth },
      ],
    }).compileComponents();
  });

  it('shows the existing email in edit mode and rejects invalid values', () => {
    const fixture = TestBed.createComponent(DeanMyProfile);
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#department-email');
    expect(input.value).toBe('department@example.test');
    input.value = 'invalid-email';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const saveButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: any) => button.textContent.includes('Save Changes')) as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();
    fixture.componentInstance.save();
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('saves the normalized contact email without refreshing or modifying the login account', () => {
    const fixture = TestBed.createComponent(DeanMyProfile);
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    fixture.componentInstance.emailControl.setValue(' New@Example.test ');
    fixture.componentInstance.save();
    expect(service.updateProfile).toHaveBeenCalledWith(jasmine.objectContaining({ email: 'new@example.test' }));
    expect(auth.getProfile).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isEditing()).toBeFalse();
  });

  it('shows a save error and preserves the editing state', () => {
    service.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Failed to update profile' } })));
    const fixture = TestBed.createComponent(DeanMyProfile);
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    fixture.componentInstance.emailControl.setValue('taken@example.test');
    fixture.componentInstance.save();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Failed to update profile' }));
    expect(fixture.componentInstance.isEditing()).toBeTrue();
    expect(fixture.componentInstance.saving()).toBeFalse();
    expect(auth.getProfile).not.toHaveBeenCalled();
  });
});
