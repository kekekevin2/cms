import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword implements OnDestroy {
  email = '';
  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');
  resendLoading = signal(false);
  resendSuccess = signal(false);
  resendCooldown = signal(0);
  private cooldownInterval: any;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  onSubmit() {
    if (!this.email.trim()) {
      this.errorMessage.set('Please enter your email address');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.http
      .post(`${environment.apiUrl}/password-reset/request`, { email: this.email })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.submitted.set(true);
          this.startResendCooldown();
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error.error?.message || 'An error occurred. Please try again.');
        },
      });
  }

  resendEmail() {
    if (this.resendCooldown() > 0 || this.resendLoading()) {
      return;
    }

    this.resendLoading.set(true);
    this.resendSuccess.set(false);
    this.errorMessage.set('');

    this.http
      .post(`${environment.apiUrl}/password-reset/request`, { email: this.email })
      .subscribe({
        next: () => {
          this.resendLoading.set(false);
          this.resendSuccess.set(true);
          this.startResendCooldown();

          // Hide success message after 3 seconds
          setTimeout(() => {
            this.resendSuccess.set(false);
          }, 3000);
        },
        error: (error) => {
          this.resendLoading.set(false);
          this.errorMessage.set(
            error.error?.message || 'Failed to resend email. Please try again.',
          );
        },
      });
  }

  startResendCooldown() {
    this.resendCooldown.set(60); // 60 seconds cooldown

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current > 0) {
        this.resendCooldown.set(current - 1);
      } else {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
