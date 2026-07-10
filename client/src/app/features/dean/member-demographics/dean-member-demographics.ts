import { Component, OnInit, OnChanges, SimpleChanges, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface MemberDemographics {
  maleCount: number;
  femaleCount: number;
  malePercentage: number;
  femalePercentage: number;
  byProgram: Array<{ program: string; count: number }>;
}

interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  membersByYearLevel: Array<{ year: string; count: number }>;
}

interface AcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
}

/**
 * Department Portal → Member Demographics.
 *
 * UI mirrors the Organization Portal demographics tab exactly. Data is
 * aggregated across every organization in the dean's department by
 * default. When an `organizationId` is supplied (via the Organization
 * Management action icon deep-link), the same view is scoped to a
 * single organization instead.
 */
@Component({
  selector: 'app-dean-member-demographics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-member-demographics.html',
})
export class DeanMemberDemographicsComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

  /**
   * Optional organization scope. When set the view filters to a single
   * organization; otherwise data aggregates across the department.
   */
  @Input() organizationId?: number | null;

  loading = signal(false);
  selectedAcademicYear: number | undefined = undefined;
  selectedSemester: string | undefined = undefined;

  academicYears = signal<AcademicYear[]>([]);

  demographics = signal<MemberDemographics>({
    maleCount: 0,
    femaleCount: 0,
    malePercentage: 0,
    femalePercentage: 0,
    byProgram: [],
  });

  stats = signal<MemberStats>({
    totalMembers: 0,
    activeMembers: 0,
    membersByYearLevel: [],
  });

  ngOnInit() {
    this.loadAcademicYears();
    this.loadDemographics();
  }

  ngOnChanges(changes: SimpleChanges) {
    const change = changes['organizationId'];
    if (!change || change.firstChange) return;
    // Re-scope when the parent switches organizations at runtime.
    this.loadDemographics();
  }

  loadAcademicYears() {
    this.http.get<any>(`${environment.apiUrl}/dropdown/academic-years`).subscribe({
      next: (response) => {
        this.academicYears.set(response.academicYears || []);
      },
      error: (error) => {
        console.error('Error loading academic years:', error);
      },
    });
  }

  loadDemographics() {
    this.loading.set(true);

    let params = new HttpParams();

    if (this.organizationId != null) {
      params = params.set('organizationId', this.organizationId.toString());
    }

    if (this.selectedAcademicYear) {
      params = params.set('academicYearId', this.selectedAcademicYear.toString());
    }

    if (this.selectedSemester) {
      params = params.set('semester', this.selectedSemester);
    }

    this.http
      .get<any>(`${environment.apiUrl}/dean/dashboard/organizations/member-demographics`, { params })
      .subscribe({
        next: (response) => {
          this.demographics.set(response.demographics);
          this.stats.set(response.stats);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading demographics:', error);
          this.loading.set(false);
        },
      });
  }

  getProgramColor(index: number): string {
    // Match the Organization Portal palette exactly.
    const colors = [
      '#8b5cf6', // purple
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1', // indigo
    ];
    return colors[index % colors.length];
  }

  getAccumulatedOffset(index: number): number {
    if (!this.demographics().byProgram || index === 0) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      const program = this.demographics().byProgram[i];
      const percentage = (program.count / this.stats().totalMembers) * 100;
      offset += (percentage / 100) * 502.65;
    }
    return offset;
  }
}
