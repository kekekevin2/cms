import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import {
  CareerOpportunity,
  CollegeDepartmentProfile,
  CollegeDepartmentProfileService,
  PEO,
  Program,
  PublicDepartmentSummary,
} from '../../../services/dean/college-department-profile.service';
import { ThemeService } from '../../../services/theme/theme.service';

interface PublicProfileResponse {
  record?: CollegeDepartmentProfile;
  records?: PublicDepartmentSummary[];
}

@Component({
  selector: 'app-public-department-profile',
  imports: [RouterLink],
  templateUrl: './public-department-profile.html',
  styleUrls: [
    './public-department-profile.css',
    './public-department-content.css',
    './public-department-responsive.css',
  ],
})
export class PublicDepartmentProfile implements OnInit {
  private readonly profileService = inject(CollegeDepartmentProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  // Initialize the same saved theme as the rest of the application.
  readonly themeService = inject(ThemeService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<CollegeDepartmentProfile | null>(null);
  readonly departments = signal<PublicDepartmentSummary[]>([]);
  readonly peos = computed(() => this.parseArray<PEO>(this.profile()?.peos));
  readonly programs = computed(() => this.parseArray<Program>(this.profile()?.programs));
  readonly careerOpportunities = computed(() =>
    this.parseArray<CareerOpportunity>(this.profile()?.career_opportunities),
  );
  readonly programOutcomes = computed(() =>
    this.parseArray<string>(this.profile()?.program_outcomes),
  );

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params) => this.load(params.get('id'))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      this.profile.set(result.record ?? null);
      this.departments.set(result.records ?? []);
      this.loading.set(false);
    });
  }

  private load(id: string | null): Observable<PublicProfileResponse> {
    this.loading.set(true);
    this.error.set('');
    this.profile.set(null);
    this.departments.set([]);
    const request: Observable<PublicProfileResponse> = id
      ? this.profileService.getPublicProfile(id)
      : this.profileService.getPublicDepartments();

    return request.pipe(catchError((err: HttpErrorResponse) => {
      this.error.set(err.status === 404 || err.status === 400
        ? 'This department profile is not available.'
        : 'Unable to load department information. Please refresh to try again.');
      return of({});
    }));
  }

  private parseArray<T>(value: unknown): T[] {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getCareerLines(careers: string): string[] {
    return (careers || '').split('\n').map((line) => line.trim()).filter(Boolean);
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }
}
