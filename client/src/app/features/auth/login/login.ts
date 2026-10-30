import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Component, OnInit, OnDestroy, signal, effect, AfterViewInit, ElementRef, ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { RecaptchaService } from '../../../services/core/recaptcha.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('recaptchaFrame') private recaptchaFrame!: ElementRef<HTMLDivElement>;
  recaptchaScale = 1;
  private recaptchaResizeObserver?: ResizeObserver;
  private destroyed = false;
  loginForm!: FormGroup;
  isPasswordVisible: boolean = false;
  isLoading = signal<boolean>(false);
  isRecaptchaVerified = signal(false);
  recaptchaSiteKey = '';
  recaptchaConfigError = false;
  private recaptchaWidgetId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    public themeService: ThemeService,
    private recaptchaService: RecaptchaService,
  ) {
    effect(() => {
      const theme = this.themeService.isDarkMode() ? 'dark' : 'light';
      if (this.recaptchaWidgetId !== null) {
        this.resetRecaptcha();
        this.recaptchaWidgetId = null;
        this.renderRecaptcha(theme);
      }
    });
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngAfterViewInit(): void {
    const frame = this.recaptchaFrame.nativeElement;
    const resizeRecaptcha = () => {
      // Google renders the normal checkbox at a fixed 304 × 78 pixels.
      this.recaptchaScale = Math.min(1, frame.clientWidth / 304);
      frame.style.height = `${78 * this.recaptchaScale}px`;
    };
    this.recaptchaResizeObserver = new ResizeObserver(resizeRecaptcha);
    this.recaptchaResizeObserver.observe(frame);
    this.recaptchaService.loadSiteKey().subscribe({
      next: async (siteKey) => {
        try {
          await this.recaptchaService.loadApi();
          if (this.destroyed) return;
          this.recaptchaSiteKey = siteKey;
          this.renderRecaptcha();
        } catch (error) {
          this.recaptchaConfigError = true;
          console.error('Unable to load reCAPTCHA:', error);
        }
      },
      error: (error) => {
        this.recaptchaConfigError = true;
        console.error('Unable to load reCAPTCHA configuration:', error);
      },
    });
  }

  private renderRecaptcha(theme: 'light' | 'dark' = this.themeService.isDarkMode() ? 'dark' : 'light'): void {
    if (!this.recaptchaSiteKey || this.recaptchaWidgetId !== null) return;
    this.isRecaptchaVerified.set(false);
    try {
      // Use a fresh element because Google does not allow rendering twice on one host.
      const host = document.createElement('div');
      host.id = 'login-recaptcha-widget';
      this.recaptchaFrame.nativeElement.querySelector('#recaptcha-container')!.replaceChildren(host);
      this.recaptchaWidgetId = this.recaptchaService.renderCheckbox(
        host.id,
        this.recaptchaSiteKey,
        theme,
        {
          onVerify: (token) => this.isRecaptchaVerified.set(!!token),
          onExpire: () => this.isRecaptchaVerified.set(false),
          onError: () => this.isRecaptchaVerified.set(false),
        },
      );
    } catch (error) {
      this.recaptchaConfigError = true;
      console.error('Unable to render reCAPTCHA:', error);
    }
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.recaptchaResizeObserver?.disconnect();
  }

  async onSubmit(): Promise<void> {
    if (this.isLoading()) return;
    if (this.loginForm.valid) {
      if (this.recaptchaConfigError || this.recaptchaWidgetId === null) {
        Swal.fire({
          icon: 'error',
          title: 'reCAPTCHA Unavailable',
          text: 'reCAPTCHA is not ready. Please refresh the page or contact the administrator.',
          confirmButtonColor: '#16a34a',
        });
        return;
      }

      this.isLoading.set(true);

      const { email, password } = this.loginForm.value;

      try {
        const recaptchaToken = this.recaptchaService.getToken(this.recaptchaWidgetId);
        if (!recaptchaToken) {
          this.isRecaptchaVerified.set(false);
          throw 'Please complete the reCAPTCHA challenge';
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
    this.isRecaptchaVerified.set(false);
    if (this.recaptchaWidgetId !== null) {
      this.recaptchaService.reset(this.recaptchaWidgetId);
    }
  }

  get loginData() {
    return this.loginForm.controls;
  }

  get canSignIn(): boolean {
    return (
      this.loginForm.valid &&
      this.isRecaptchaVerified() &&
      !this.recaptchaConfigError &&
      !this.isLoading()
    );
  }
}
