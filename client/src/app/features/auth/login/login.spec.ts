import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { Auth } from '../../../services/auth/auth';
import {
  RecaptchaCheckboxCallbacks,
  RecaptchaService,
} from '../../../services/core/recaptcha.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let recaptcha: jasmine.SpyObj<RecaptchaService>;
  let auth: jasmine.SpyObj<Auth>;
  let darkMode: WritableSignal<boolean>;
  let submit: HTMLButtonElement;

  const validCredentials = { email: 'faculty@example.edu', password: 'example-password' };

  function callbacks(): RecaptchaCheckboxCallbacks {
    return recaptcha.renderCheckbox.calls.mostRecent().args[3];
  }

  function makeReady(): void {
    component.loginForm.setValue(validCredentials);
    callbacks().onVerify('verified-token');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    recaptcha = jasmine.createSpyObj<RecaptchaService>('RecaptchaService', [
      'loadSiteKey', 'loadApi', 'renderCheckbox', 'getToken', 'reset',
    ]);
    recaptcha.loadSiteKey.and.returnValue(of('test-site-key'));
    recaptcha.loadApi.and.returnValue(Promise.resolve());
    recaptcha.renderCheckbox.and.returnValue(0);
    recaptcha.getToken.and.returnValue('verified-token');
    auth = jasmine.createSpyObj<Auth>('Auth', ['login']);
    darkMode = signal(false);
    spyOn(Swal, 'fire').and.stub();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: auth },
        { provide: RecaptchaService, useValue: recaptcha },
        { provide: ThemeService, useValue: {
          isDarkMode: darkMode,
          toggleTheme: () => darkMode.update((value) => !value),
        } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    submit = fixture.nativeElement.querySelector('button[type="submit"]');
  });

  it('enables Sign In only after valid credentials and CAPTCHA verification', () => {
    expect(submit.disabled).toBeTrue();
    component.loginForm.setValue(validCredentials);
    fixture.detectChanges();
    expect(submit.disabled).toBeTrue();

    callbacks().onVerify('verified-token');
    fixture.detectChanges();
    expect(submit.disabled).toBeFalse();
  });

  it('keeps Sign In disabled for invalid credentials even after CAPTCHA verification', () => {
    callbacks().onVerify('verified-token');
    component.loginForm.setValue({ ...validCredentials, email: 'invalid-email' });
    fixture.detectChanges();
    expect(submit.disabled).toBeTrue();

    component.loginForm.setValue({ ...validCredentials, password: '' });
    fixture.detectChanges();
    expect(submit.disabled).toBeTrue();
  });

  for (const event of ['onExpire', 'onError'] as const) {
    it(`disables Sign In when CAPTCHA calls ${event}`, () => {
      makeReady();
      callbacks()[event]();
      fixture.detectChanges();
      expect(submit.disabled).toBeTrue();

      callbacks().onVerify('new-token');
      fixture.detectChanges();
      expect(submit.disabled).toBeFalse();
    });
  }

  it('requires CAPTCHA verification again after changing the theme', () => {
    makeReady();
    darkMode.set(true);
    fixture.detectChanges();
    expect(recaptcha.reset).toHaveBeenCalledWith(0);
    expect(recaptcha.renderCheckbox).toHaveBeenCalledTimes(2);
    expect(submit.disabled).toBeTrue();
  });

  it('disables Sign In while submitting and resets verification after login failure', async () => {
    const response = new Subject();
    auth.login.and.returnValue(response.asObservable());
    makeReady();
    await component.onSubmit();
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledOnceWith({
      ...validCredentials, recaptchaToken: 'verified-token',
    });
    expect(submit.disabled).toBeTrue();
    expect(submit.textContent).toContain('Signing in');

    await component.onSubmit();
    expect(auth.login).toHaveBeenCalledTimes(1);

    response.error({ error: { message: 'Invalid credentials' } });
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
    expect(recaptcha.reset).toHaveBeenCalledWith(0);
    expect(submit.disabled).toBeTrue();
  });

  it('clears the ready state if the CAPTCHA token is no longer available', async () => {
    makeReady();
    recaptcha.getToken.and.returnValue('');
    await component.onSubmit();
    fixture.detectChanges();
    expect(auth.login).not.toHaveBeenCalled();
    expect(submit.disabled).toBeTrue();
  });
});
