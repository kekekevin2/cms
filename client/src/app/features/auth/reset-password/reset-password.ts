import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  verifying = signal(true);
  tokenValid = signal(false);
  resetSuccess = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      if (this.token) {
        this.verifyToken();
      } else {
        this.verifying.set(false);
        this.errorMessage.set('Invalid reset link');
      }
    });
  }

  verifyToken() {
    this.http.get(`${environment.apiUrl}/password-reset/verify/${this.token}`).subscribe({
      next: () => {
        this.verifying.set(false);
        this.tokenValid.set(true);
      },
      error: (error) => {
        this.verifying.set(false);
        this.tokenValid.set(false);
        this.errorMessage.set(error.error?.message || 'Invalid or expired reset link');
      },
    });
  }

  onSubmit() {
    this.errorMessage.set('');

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.loading.set(true);

    this.http
      .post(`${environment.apiUrl}/password-reset/reset`, {
        token: this.token,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.resetSuccess.set(true);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error.error?.message || 'Failed to reset password');
        },
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }
}
