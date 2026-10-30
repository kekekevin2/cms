import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { DropdownService } from '../../../services/core/dropdown.service';
import { CollegeDepartmentProfileService } from '../../../services/dean/college-department-profile.service';
import { DeanRequirementService } from '../../../services/dean/dean-requirement.service';
import { DeanService } from '../../../services/dean/dean.service';
import {
  DeanAnalyticsService, FacultyInvolvementResponse,
} from '../../../services/dean/dean-analytics.service';
import { DeanDashboard } from './dean';
import { InvolvementChartPdfService } from '../../../services/core/involvement-chart-pdf.service';

type Chart = 'research' | 'extension' | 'seminars';
const charts: Chart[] = ['research', 'extension', 'seminars'];
const methods = {
  research: 'getResearchInvolvement', extension: 'getExtensionInvolvement',
  seminars: 'getSeminarsInvolvement',
} as const;

function response(name: string): FacultyInvolvementResponse {
  return { title: '', subtitle: '', total: 3,
    data: [{ faculty_id: 1, faculty_name: name, count: 3, percentage: '100' }] };
}

describe('Faculty involvement employment filter', () => {
  let dashboard: DeanDashboard;
  let analytics: jasmine.SpyObj<DeanAnalyticsService>;
  let requests: Record<Chart, Subject<FacultyInvolvementResponse>[]>;

  beforeEach(() => {
    requests = { research: [], extension: [], seminars: [] };
    analytics = jasmine.createSpyObj<DeanAnalyticsService>('DeanAnalyticsService', Object.values(methods));
    for (const chart of charts) {
      analytics[methods[chart]].and.callFake(() => {
        const request = new Subject<FacultyInvolvementResponse>();
        requests[chart].push(request);
        return request.asObservable();
      });
    }
    TestBed.configureTestingModule({
      providers: [
        DeanDashboard,
        { provide: DeanAnalyticsService, useValue: analytics },
        ...[ActivatedRoute, Router, Auth, ThemeService, DropdownService,
          CollegeDepartmentProfileService, DeanRequirementService, DeanService]
          .map((provide) => ({ provide, useValue: {} })),
      ],
    });
    dashboard = TestBed.inject(DeanDashboard);
  });

  afterEach(() => dashboard.ngOnDestroy());

  it('exports the clicked chart with a snapshot of the selected filters', async () => {
    const download = spyOn(InvolvementChartPdfService.prototype, 'download').and.resolveTo();
    dashboard.academicYearsList.set([
      { academic_year_id: 1, year_start: 2022, year_end: 2023, is_active: 0 },
      { academic_year_id: 2, year_start: 2024, year_end: 2025, is_active: 1 },
    ]);
    dashboard.involvementAcademicYear = 2;
    dashboard.involvementEmploymentType = 'temporary';
    dashboard.involvementItems.extension = [{ name: 'Ana Garcia', value: 4, percentage: '100' }];
    const pending = dashboard.downloadInvolvementChart('extension');
    dashboard.involvementEmploymentType = 'permanent';
    dashboard.involvementItems.extension = [];
    await pending;
    expect(download).toHaveBeenCalledOnceWith('extension',
      [{ name: 'Ana Garcia', value: 4, percentage: '100' }], 'Temporary', 'FY 2024-2025');
    expect(dashboard.involvementExport()).toBeNull();
  });

  it('blocks downloads while filtered chart data is loading', async () => {
    const download = spyOn(InvolvementChartPdfService.prototype, 'download').and.resolveTo();
    dashboard.chartLoading.research = true;
    dashboard.involvementItems.research = [{ name: 'Ana Garcia', value: 4 }];
    await dashboard.downloadInvolvementChart('research');
    expect(download).not.toHaveBeenCalled();
  });

  it('sends the selected employment type to all three charts', () => {
    dashboard.involvementEmploymentType = 'guest_lecturer';
    dashboard.onInvolvementEmploymentTypeChange();
    for (const chart of charts) {
      expect(analytics[methods[chart]]).toHaveBeenCalledWith(undefined, 'guest_lecturer');
    }
  });

  it('retains employment type when the academic year is changed', () => {
    dashboard.involvementAcademicYear = 42;
    dashboard.involvementEmploymentType = 'permanent';
    dashboard.onInvolvementAcademicYearChange();
    for (const chart of charts) {
      expect(analytics[methods[chart]]).toHaveBeenCalledWith(42, 'permanent');
    }
  });

  it('clears the employment filter without losing the selected academic year', () => {
    dashboard.involvementAcademicYear = 42;
    dashboard.involvementEmploymentType = null;
    dashboard.onInvolvementEmploymentTypeChange();
    for (const chart of charts) {
      expect(analytics[methods[chart]]).toHaveBeenCalledWith(42, undefined);
    }
  });

  it('ignores delayed responses from a previously selected employment type', () => {
    dashboard.involvementEmploymentType = 'permanent';
    dashboard.onInvolvementEmploymentTypeChange();
    dashboard.involvementEmploymentType = 'temporary';
    dashboard.onInvolvementEmploymentTypeChange();
    for (const chart of charts) {
      expect(requests[chart][0].observed).toBeFalse();
      requests[chart][0].next(response('Old Faculty'));
      expect(dashboard.involvementItems[chart]).toEqual([]);
      expect(dashboard.chartLoading[chart]).toBeTrue();
      requests[chart][1].next(response('Temporary Faculty'));
      expect(dashboard.involvementItems[chart]).toEqual([
        { name: 'Temporary Faculty', value: 3, percentage: '100' },
      ]);
      expect(dashboard.chartLoading[chart]).toBeFalse();
    }
  });

  it('removes previous chart data when the new filtered request fails', () => {
    spyOn(console, 'error');
    dashboard.loadFacultyInvolvementCharts();
    for (const chart of charts) requests[chart][0].next(response('Unfiltered Faculty'));
    dashboard.involvementEmploymentType = 'guest_lecturer';
    dashboard.onInvolvementEmploymentTypeChange();
    for (const chart of charts) {
      requests[chart][1].error(new Error('Preview request failed'));
      expect(dashboard.involvementItems[chart]).toEqual([]);
      expect(dashboard.chartLoading[chart]).toBeFalse();
    }
  });

  it('cancels outstanding chart requests when leaving the dashboard', () => {
    dashboard.loadFacultyInvolvementCharts();
    dashboard.ngOnDestroy();
    for (const chart of charts) expect(requests[chart][0].observed).toBeFalse();
  });
});
