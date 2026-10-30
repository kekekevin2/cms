import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Declared by the Google reCAPTCHA v2 script after it is loaded.
declare const grecaptcha: any;

export interface RecaptchaCheckboxCallbacks {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

/**
 * Service to handle Google reCAPTCHA operations
 * Provides the reCAPTCHA v2 checkbox token used by the login request.
 */
@Injectable({
  providedIn: 'root',
})
export class RecaptchaService {
  private apiLoadPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  /** Gets the public site key from the API, which reads it from the server environment. */
  loadSiteKey(): Observable<string> {
    return this.http
      .get<{ siteKey: string }>(`${environment.apiUrl}/auth/recaptcha-config`)
      .pipe(map((config) => config.siteKey));
  }

  /** Loads the reCAPTCHA v2 API with explicit widget rendering. */
  loadApi(): Promise<void> {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      return Promise.resolve();
    }

    if (this.apiLoadPromise) return this.apiLoadPromise;

    this.apiLoadPromise = new Promise<void>((resolve, reject) => {
      const callbackName = '__recaptchaV2Ready';
      (window as any)[callbackName] = () => {
        delete (window as any)[callbackName];
        resolve();
      };

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete (window as any)[callbackName];
        this.apiLoadPromise = null;
        reject('Unable to load reCAPTCHA. Please refresh the page.');
      };
      document.head.appendChild(script);
    });

    return this.apiLoadPromise;
  }

  renderCheckbox(
    containerId: string,
    siteKey: string,
    theme: 'light' | 'dark',
    callbacks: RecaptchaCheckboxCallbacks,
  ): number {
    if (typeof grecaptcha === 'undefined' || !grecaptcha.render) {
      throw new Error('reCAPTCHA not loaded. Please refresh the page.');
    }
    return grecaptcha.render(containerId, {
      sitekey: siteKey,
      theme,
      size: 'normal',
      callback: callbacks.onVerify,
      'expired-callback': callbacks.onExpire,
      'error-callback': callbacks.onError,
    });
  }

  getToken(widgetId: number): string {
    return typeof grecaptcha === 'undefined' ? '' : grecaptcha.getResponse(widgetId);
  }

  reset(widgetId: number): void {
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.reset(widgetId);
    }
  }

  /**
   * Check if reCAPTCHA is loaded and ready
   * @returns true if grecaptcha is available
   */
  isReady(): boolean {
    return typeof grecaptcha !== 'undefined';
  }
}
