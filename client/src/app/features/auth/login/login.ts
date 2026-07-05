import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Component, OnInit, signal, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { RecaptchaService } from '../../../services/core/recaptcha.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

// Declare grecaptcha for TypeScript
declare const grecaptcha: any;

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit {
  loginForm!: FormGroup;
  isPasswordVisible: boolean = false;
  isLoading = signal<boolean>(false);
  recaptchaSiteKey = environment.recaptchaSiteKey;
  private recaptchaWidgetId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    public themeService: ThemeService,
    private recaptchaService: RecaptchaService,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngAfterViewInit(): void {
    // Wait for grecaptcha to be ready and render the widget
    this.renderRecaptcha();
  }

  private renderRecaptcha(): void {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      try {
        const container = document.getElementById('recaptcha-container');
        if (!container) return;
        // Only render if container is empty
        if (container.childElementCount > 0) return;
        this.recaptchaWidgetId = grecaptcha.render('recaptcha-container', {
          sitekey: this.recaptchaSiteKey,
          theme: this.themeService.isDarkMode() ? 'dark' : 'light',
          size: 'normal',
        });
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    } else {
      setTimeout(() => this.renderRecaptcha(), 100);
    }
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading.set(true);

      const { email, password } = this.loginForm.value;

      try {
        // Get reCAPTCHA token
        let recaptchaToken: string;

        if (typeof grecaptcha !== 'undefined') {
          recaptchaToken = grecaptcha.getResponse(this.recaptchaWidgetId);

          if (!recaptchaToken || recaptchaToken.length === 0) {
            throw 'Please complete the reCAPTCHA challenge';
          }
        } else {
          throw 'reCAPTCHA not loaded. Please refresh the page.';
        }

        console.log('📤 Login component: Calling auth service...');

        // Set a timeout to detect hanging requests
        const timeoutId = setTimeout(() => {
          console.error('⏱️ Login request timeout after 30 seconds');
          this.isLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Request Timeout',
            text: 'The login request is taking too long. Please check your connection and try again.',
            confirmButtonColor: '#16a34a',
          });
        }, 30000);

        // Attempt login with reCAPTCHA token
        this.authService.login({ email, password, recaptchaToken }).subscribe({
          next: (response) => {
            clearTimeout(timeoutId);
            console.log('✅ Login component: Login successful');
            this.isLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Login Successful!',
              text: 'Redirecting to your dashboard...',
              timer: 1500,
              showConfirmButton: false,
            });
            // Navigation is handled in the auth service
          },
          error: (error) => {
            clearTimeout(timeoutId);
            console.error('❌ Login component: Login failed', error);
            this.isLoading.set(false);
            this.resetRecaptcha();

            const message = error.error?.message || 'Login failed. Please check your credentials.';
            Swal.fire({
              icon: 'error',
              title: 'Login Failed',
              text: message,
              confirmButtonColor: '#16a34a',
            });
            console.error('Login error:', error);
          },
        });
      } catch (error) {
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'reCAPTCHA Error',
          text: (error as string) || 'Please complete the reCAPTCHA challenge',
          confirmButtonColor: '#16a34a',
        });
      }
    }
  }

  private resetRecaptcha(): void {
    if (typeof grecaptcha !== 'undefined' && this.recaptchaWidgetId !== null) {
      try {
        grecaptcha.reset(this.recaptchaWidgetId);
      } catch (error) {
        console.error('Error resetting reCAPTCHA:', error);
      }
    }
  }

  get loginData() {
    return this.loginForm.controls;
  }
}
