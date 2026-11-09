import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanMemberDemographicsComponent } from './dean-member-demographics';

describe('Gender distribution program filter', () => {
  let http: HttpTestingController;
  const response = {
    demographics: {
      maleCount: 10, femaleCount: 10, malePercentage: 50, femalePercentage: 50,
      byProgram: [{ program: 'CPE', count: 12 }, { program: 'ELEC', count: 8 }],
      genderByProgram: [
        { program: 'CPE', totalMembers: 12, maleCount: 8, femaleCount: 4, malePercentage: 66.7, femalePercentage: 33.3 },
        { program: 'ELEC', totalMembers: 8, maleCount: 2, femaleCount: 6, malePercentage: 25, femalePercentage: 75 },
      ],
    },
    stats: { totalMembers: 20, activeMembers: 20, membersByYearLevel: [] },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeanMemberDemographicsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function setup() {
    const fixture = TestBed.createComponent(DeanMemberDemographicsComponent);
    fixture.componentInstance.organizationId = 7;
    fixture.detectChanges();
    http.expectOne((request) => request.url.endsWith('/dropdown/academic-years')).flush([
      { academic_year_id: 2, year_start: 2026, year_end: 2027 },
    ]);
    const request = http.expectOne((request) => request.url.endsWith('/member-demographics'));
    expect(request.request.params.get('organizationId')).toBe('7');
    request.flush(response);
    fixture.detectChanges();
    return fixture;
  }

  it('filters only the gender chart and restores all programs without another request', () => {
    const fixture = setup();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#gender-program-filter');
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual(['All programs', 'CPE', 'ELEC']);
    select.value = 'CPE';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.genderDistribution().maleCount).toBe(8);
    expect(fixture.componentInstance.genderDistribution().totalMembers).toBe(12);
    expect(fixture.nativeElement.querySelector('#gender-distribution').textContent).toContain('66.7%');
    expect(fixture.componentInstance.stats().totalMembers).toBe(20);
    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.genderDistribution().totalMembers).toBe(20);
    expect(fixture.componentInstance.genderDistribution().maleCount).toBe(10);
    http.expectNone((request) => request.url.endsWith('/member-demographics'));
  });

  it('resets an unavailable program after the academic-year/semester scope changes', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.selectedGenderProgram.set('CPE');
    component.selectedAcademicYear = 2;
    component.selectedSemester = '1st Semester';
    component.loadDemographics();
    const request = http.expectOne((request) => request.url.endsWith('/member-demographics'));
    expect(request.request.params.get('organizationId')).toBe('7');
    expect(request.request.params.get('academicYearId')).toBe('2');
    expect(request.request.params.get('semester')).toBe('1st Semester');
    request.flush({
      demographics: { ...response.demographics, genderByProgram: [response.demographics.genderByProgram[1]] },
      stats: response.stats,
    });
    fixture.detectChanges();
    expect(component.selectedGenderProgram()).toBe('');
    expect(component.academicYears().length).toBe(1);
  });

  it('shows a clear empty state when a program has no gender data', () => {
    const fixture = setup();
    fixture.componentInstance.demographics.update((data) => ({
      ...data,
      genderByProgram: [...data.genderByProgram!, { program: 'Unknown gender', totalMembers: 2, maleCount: 0, femaleCount: 0, malePercentage: 0, femalePercentage: 0 }],
    }));
    fixture.componentInstance.selectedGenderProgram.set('Unknown gender');
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('#gender-distribution');
    expect(panel.textContent).toContain('No gender data available for this program');
    expect(panel.querySelector('svg')).toBeNull();
  });
});
