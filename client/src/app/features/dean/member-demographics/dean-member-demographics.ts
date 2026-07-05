import { Component, OnInit, signal, inject } from '@angular/core';
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

interface Organization {
  organization_id: number;
  organization_name: string;
}

interface AcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
}

@Component({
  selector: 'app-dean-member-demographics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-member-demographics.html',
})
export class DeanMemberDemographicsComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(false);
  selectedOrganization: number | undefined = undefined;
  selectedAcademicYear: number | undefined = undefined;
  selectedSemester: string | undefined = undefined;
  activeOnly = signal(true);

  organizations = signal<Organization[]>([]);
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
    this.loadOrganizations();
    this.loadAcademicYears();
  }

  loadOrganizations() {
    this.http.get<any>(`${environment.apiUrl}/dean/organizations`).subscribe({
      next: (response) => {
        this.organizations.set(response.organizations || []);
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
      },
    });
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
    if (!this.selectedOrganization) {
      return;
    }

    this.loading.set(true);

    let params = new HttpParams().set('organizationId', this.selectedOrganization.toString());

    if (this.selectedAcademicYear) {
      params = params.set('academicYearId', this.selectedAcademicYear.toString());
    }

    if (this.selectedSemester) {
      params = params.set('semester', this.selectedSemester);
    }

    params = params.set('activeOnly', this.activeOnly().toString());

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
    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF',
      '#4BC0C0',
      '#FF6384',
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
