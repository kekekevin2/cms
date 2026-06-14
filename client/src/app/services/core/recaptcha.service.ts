import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

// Declare grecaptcha from Google reCAPTCHA script
declare const grecaptcha: any;

/**
 * Service to handle Google reCAPTCHA operations
 * Provides methods to execute and reset reCAPTCHA challenges
 */
@Injectable({
  providedIn: 'root',
})
export class RecaptchaService {
  private siteKey = environment.recaptchaSiteKey;

  /**
   * Execute reCAPTCHA and get token
   * For reCAPTCHA v2, this gets the response from the checkbox widget
   * 
   * @param action Optional action name (used for reCAPTCHA v3, not v2)
   * @returns Promise with reCAPTCHA token
   */
  async executeRecaptcha(action: string = 'submit'): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if reCAPTCHA script is loaded
      if (typeof grecaptcha === 'undefined') {
        reject('reCAPTCHA not loaded. Please refresh the page.');
        return;
      }

      try {
        // For reCAPTCHA v2, get the response from the widget
        const response = grecaptcha.getResponse();
        
        if (response && response.length > 0) {
          resolve(response);
        } else {
          reject('Please complete the reCAPTCHA challenge');
        }
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        reject('reCAPTCHA error: ' + error);
      }
    });
  }

  /**
   * Reset reCAPTCHA widget
   * Call this after form submission (success or error) to allow retry
   */
  resetRecaptcha(): void {
    if (typeof grecaptcha !== 'undefined') {
      try {
        grecaptcha.reset();
      } catch (error) {
        console.error('Error resetting reCAPTCHA:', error);
      }
    }
  }

  /**
   * Get site key for rendering reCAPTCHA widget
   * @returns reCAPTCHA site key from environment
   */
  getSiteKey(): string {
    return this.siteKey;
  }

  /**
   * Check if reCAPTCHA is loaded and ready
   * @returns true if grecaptcha is available
   */
  isReady(): boolean {
    return typeof grecaptcha !== 'undefined';
  }
}
