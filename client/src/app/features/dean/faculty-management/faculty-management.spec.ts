import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { DeanFacultyService, Faculty } from '../../../services/dean/dean-faculty.service';
import { DropdownService } from '../../../services/core/dropdown.service';
import { DeanAnalyticsService } from '../../../services/dean/dean-analytics.service';
import { DeanPDSService } from '../../../services/dean/dean-pds.service';
import { DeanFacultyProfileService, FacultyFullProfile } from '../../../services/dean/dean-faculty-profile.service';
import { PdsPdfService } from '../../../services/core/pds-pdf.service';
import { FacultyProfilePdfService } from '../../../services/core/faculty-profile-pdf.service';
import { DeanFacultyManagement } from './faculty-management';

describe('Faculty Management', () => {
  let fixture: ComponentFixture<DeanFacultyManagement>;
  let component: DeanFacultyManagement;
  let service: jasmine.SpyObj<DeanFacultyService>;
  let profiles: jasmine.SpyObj<DeanFacultyProfileService>;
  let profilePdf: jasmine.SpyObj<FacultyProfilePdfService>;
  const permanentRanks = [
    'Instructor I', 'Instructor II', 'Instructor III',
    'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
    'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
    'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI',
  ];
  const allRanks = ['Lecturer I', 'Lecturer II', 'Lecturer III', 'Lecturer IV', ...permanentRanks, 'University Professor'];
  const guestRanks = [
    'Lecturer I', 'Lecturer II', 'Lecturer III', 'Lecturer IV', 'Lecturer V', 'Lecturer VI', 'Lecturer VII',
    'Senior Lecturer I', 'Senior Lecturer II', 'Senior Lecturer III', 'Senior Lecturer IV', 'Senior Lecturer V',
    'Professorial Lecturer I', 'Professorial Lecturer II', 'Professorial Lecturer III',
    'Professorial Lecturer IV', 'Professorial Lecturer V', 'Professorial Lecturer VI',
  ];
  const faculty: Faculty = {
    faculty_id: 1, user_id: 101, employee_id: '12345', first_name: 'Sample',
    last_name: 'Faculty', email: 'sample@example.edu', department: 'Test Department',
    employment_status: 'Temporary',
    position_level: 'Instructor I',
  };

  function fullProfile(overrides: Partial<FacultyFullProfile> = {}): FacultyFullProfile {
    return {
      faculty: { first_name: 'Sample', last_name: 'Faculty', employment_status: 'Permanent', email: 'updated@example.edu', designation: 'Program Chair' },
      personal: { civil_status: 'Single', extension_name: 'Jr.' },
      academic: [{ level: 'Undergraduate', degree_course: 'Industrial Technology', school_name: 'Example University' }],
      employment: [], memberships: [], awards: [], eligibilities: [],
      coursesHandled: ['Data Analytics', 'Digital Electronics'],
      ...overrides,
    };
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<DeanFacultyService>('DeanFacultyService', ['getFaculty', 'createFaculty', 'updateFaculty']);
    service.getFaculty.and.returnValue(of({ faculty: [], currentPage: 1, totalPages: 1, totalItems: 0 }));
    service.createFaculty.and.returnValue(of({ emailSent: true }));
    service.updateFaculty.and.returnValue(of({}));
    profiles = jasmine.createSpyObj<DeanFacultyProfileService>('DeanFacultyProfileService', ['getFacultyFullProfile']);
    profiles.getFacultyFullProfile.and.returnValue(of(fullProfile()));
    profilePdf = jasmine.createSpyObj<FacultyProfilePdfService>('FacultyProfilePdfService', ['generateAndDownload']);
    profilePdf.generateAndDownload.and.resolveTo();
    spyOn(Swal, 'fire').and.stub();
    await TestBed.configureTestingModule({
      imports: [DeanFacultyManagement],
      providers: [
        { provide: DeanFacultyService, useValue: service },
        { provide: DropdownService, useValue: {
          getPositionLevels: () => of(allRanks.map((value) => ({ value, label: value }))),
        } },
        { provide: DeanFacultyProfileService, useValue: profiles },
        { provide: FacultyProfilePdfService, useValue: profilePdf },
        ...[DeanAnalyticsService, DeanPDSService, PdsPdfService]
          .map((provide) => ({ provide, useValue: {} })),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DeanFacultyManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  async function renderSelect(id: string): Promise<HTMLSelectElement> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector(`#${id}`);
  }

  function viewButton(): HTMLButtonElement {
    component.facultyList.set([faculty]);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button[title="View"]');
  }

  function dialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  it('opens read-only details for the clicked faculty and loads fresh department data', () => {
    const button = viewButton();
    button.click();
    fixture.detectChanges();
    expect(profiles.getFacultyFullProfile).toHaveBeenCalledWith(faculty.faculty_id);
    expect(dialog()?.textContent).toContain('View Faculty');
    expect(dialog()?.textContent).toContain('updated@example.edu');
    expect(dialog()?.textContent).toContain('Permanent');
    expect(dialog()?.textContent).toContain('Program Chair');
    expect(dialog()?.textContent).not.toContain('Industrial Technology');
    expect(dialog()?.textContent).not.toContain('Data Analytics');
    expect(dialog()?.querySelectorAll('input, select, textarea').length).toBe(0);
    expect(service.createFaculty).not.toHaveBeenCalled();
    expect(service.updateFaculty).not.toHaveBeenCalled();
    expect(profilePdf.generateAndDownload).not.toHaveBeenCalled();
  });

  it('uses the ID of the selected row rather than always loading the first faculty', () => {
    const other = { ...faculty, faculty_id: 2, first_name: 'Other' };
    component.facultyList.set([faculty, other]);
    profiles.getFacultyFullProfile.and.returnValue(of(fullProfile({ faculty: { first_name: 'Other' } })));
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button[title="View"]');
    expect(buttons.length).toBe(2);
    buttons[1].click();
    fixture.detectChanges();
    expect(profiles.getFacultyFullProfile).toHaveBeenCalledOnceWith(2);
    expect(component.viewedFaculty()?.faculty_id).toBe(2);
    expect(component.viewedFaculty()?.first_name).toBe('Other');
    expect(dialog()?.querySelectorAll('dd')[2].textContent).toBe('Other');
  });

  it('shows a loading state and cancels the request when the view is closed', () => {
    const pending = new Subject<FacultyFullProfile>();
    profiles.getFacultyFullProfile.and.returnValue(pending.asObservable());
    viewButton().click();
    fixture.detectChanges();
    expect(dialog()?.getAttribute('aria-busy')).toBe('true');
    expect(dialog()?.textContent).toContain('Loading faculty details');
    component.closeViewModal();
    fixture.detectChanges();
    expect(dialog()).toBeNull();
    expect(pending.observed).toBeFalse();
    pending.next(fullProfile());
    expect(component.viewedFaculty()).toBeNull();
    expect(component.viewLoading()).toBeFalse();
  });

  it('does not show another faculty’s data while switching records or after a late response', () => {
    const first = new Subject<FacultyFullProfile>();
    const second = new Subject<FacultyFullProfile>();
    profiles.getFacultyFullProfile.and.returnValues(first.asObservable(), second.asObservable());
    component.openViewModal(faculty);
    first.next(fullProfile());
    component.openViewModal({ ...faculty, faculty_id: 2, first_name: 'Other' });
    fixture.detectChanges();
    expect(component.viewLoading()).toBeTrue();
    expect(dialog()?.textContent).not.toContain('updated@example.edu');
    expect(first.observed).toBeFalse();
    first.next(fullProfile());
    second.next(fullProfile({ faculty: { first_name: 'Other', employment_status: 'Guest Lecturer' } }));
    fixture.detectChanges();
    expect(component.viewedFaculty()?.faculty_id).toBe(2);
    expect(dialog()?.querySelectorAll('dd')[2].textContent).toBe('Other');
    expect(dialog()?.textContent).toContain('Guest Lecturer');
  });

  it('shows a request error and retries the same faculty when Try Again is clicked', () => {
    profiles.getFacultyFullProfile.and.returnValues(
      throwError(() => ({ error: { message: 'Could not load this faculty.' } })),
      of(fullProfile()),
    );
    viewButton().click();
    fixture.detectChanges();
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Could not load this faculty.');
    const retry = Array.from(dialog()!.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Try Again')!;
    retry.click();
    fixture.detectChanges();
    expect(profiles.getFacultyFullProfile).toHaveBeenCalledTimes(2);
    expect(profiles.getFacultyFullProfile.calls.mostRecent().args[0]).toBe(faculty.faculty_id);
    expect(dialog()?.querySelector('[role="alert"]')).toBeNull();
    expect(dialog()?.textContent).toContain('updated@example.edu');
  });

  it('closes with Escape, restores focus, and keeps keyboard navigation inside the dialog', () => {
    const trigger = viewButton();
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(dialog());
    const buttons = dialog()!.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    buttons[buttons.length - 1].focus();
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the view open for inside clicks and closes it on a backdrop click', () => {
    viewButton().click();
    fixture.detectChanges();
    dialog()!.click();
    expect(component.viewedFaculty()).not.toBeNull();
    dialog()!.parentElement!.click();
    fixture.detectChanges();
    expect(dialog()).toBeNull();
  });

  it('shows only the Edit form fields in the same order, without an Edit action', () => {
    component.openEditModal(faculty);
    fixture.detectChanges();
    const editLabels = Array.from(fixture.nativeElement.querySelectorAll('form label') as NodeListOf<HTMLElement>)
      .map((label) => label.textContent!.replace(/\s*\*\s*$/, '').trim());
    expect(editLabels.length).toBe(9);
    component.closeEditModal();
    viewButton().click();
    fixture.detectChanges();
    expect(Array.from(dialog()!.querySelectorAll('dt')).map((label) => label.textContent!.trim()))
      .toEqual(editLabels);
    expect(dialog()?.classList.contains('max-w-lg')).toBeTrue();
    expect(dialog()?.textContent).not.toContain('Edit Faculty');
    expect(component.showEditModal()).toBeFalse();
    expect(service.updateFaculty).not.toHaveBeenCalled();
  });

  it('also opens a read-only view from Disabled Accounts', () => {
    component.activeTab.set('disabled');
    component.disabledFacultyList.set([faculty]);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[title="View"]');
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(profiles.getFacultyFullProfile).toHaveBeenCalledWith(faculty.faculty_id);
    expect(dialog()?.textContent).toContain('View Faculty');
    expect(dialog()?.textContent).not.toContain('Edit Faculty');
  });

  it('shows missing Edit values as empty and excludes other profile fields', () => {
    profiles.getFacultyFullProfile.and.returnValue(of(fullProfile({
      faculty: { employment_status: null, position_level: '' },
      personal: { mobile_number_primary: '09999999999', extension_name: 'Jr.' },
      pdsEducation: [{ level: 'College', degree_course: 'Bachelor of Technology' }],
    })));
    viewButton().click();
    fixture.detectChanges();
    expect(Array.from(dialog()!.querySelectorAll('dd')).map((value) => value.textContent!.trim()))
      .toEqual(['12345', 'sample@example.edu', 'Sample', '—', 'Faculty', '—', '—', '—', '—']);
    for (const extra of ['09999999999', 'Jr.', 'Bachelor of Technology', 'Industrial Technology', 'Data Analytics', 'Test Department']) {
      expect(dialog()?.textContent).not.toContain(extra);
    }
  });

  for (const status of ['Permanent', 'Temporary', 'Guest Lecturer', null, undefined]) {
    it(`uses the freshly fetched department status (${String(status)}) in the PDF`, async () => {
      profiles.getFacultyFullProfile.and.returnValue(of({
        faculty: { employment_status: status },
        personal: null, academic: [], memberships: [], awards: [], eligibilities: [],
        employment: [{ is_current: true, employment_status: 'Contractual' }],
        coursesHandled: [],
      }));
      (Swal.fire as jasmine.Spy).and.resolveTo({ isConfirmed: true });
      component.downloadFacultyProfile(faculty);
      await fixture.whenStable();
      expect(profiles.getFacultyFullProfile).toHaveBeenCalledWith(faculty.faculty_id);
      expect(profilePdf.generateAndDownload.calls.mostRecent().args[0].faculty.employment_status)
        .toBe(status ?? null);
    });
  }

  it('passes the freshly saved academic rank and multiple designations to the PDF instead of stale row values', async () => {
    const staleFaculty: Faculty = {
      ...faculty, position_level: 'Instructor I', designation: 'Old Coordinator',
    };
    const designation = 'OJT and SFAO Coordinator\nResearch Coordinator';
    profiles.getFacultyFullProfile.and.returnValue(of(fullProfile({
      faculty: { position_level: 'Senior Lecturer V', designation },
    })));
    (Swal.fire as jasmine.Spy).and.resolveTo({ isConfirmed: true });

    component.downloadFacultyProfile(staleFaculty);
    await fixture.whenStable();

    expect(profiles.getFacultyFullProfile).toHaveBeenCalledWith(staleFaculty.faculty_id);
    expect(profilePdf.generateAndDownload).toHaveBeenCalledTimes(1);
    const downloadedFaculty = profilePdf.generateAndDownload.calls.mostRecent().args[0].faculty;
    expect(downloadedFaculty.position_level).toBe('Senior Lecturer V');
    expect(downloadedFaculty.designation).toBe(designation);
  });

  it('passes a fresh null designation to the PDF instead of restoring a stale saved designation', async () => {
    profiles.getFacultyFullProfile.and.returnValue(of(fullProfile({
      faculty: { position_level: 'Instructor III', designation: null },
    })));
    (Swal.fire as jasmine.Spy).and.resolveTo({ isConfirmed: true });

    component.downloadFacultyProfile({ ...faculty, designation: 'Old Coordinator' });
    await fixture.whenStable();

    expect(profilePdf.generateAndDownload).toHaveBeenCalledTimes(1);
    const downloadedFaculty = profilePdf.generateAndDownload.calls.mostRecent().args[0].faculty;
    expect(downloadedFaculty.position_level).toBe('Instructor III');
    expect(downloadedFaculty.designation).toBeNull();
  });

  it('shows the requested choices in Add New Faculty', async () => {
    component.openCreateModal();
    const select = await renderSelect('create-employment-status');
    expect(Array.from(select.options).map((option) => option.value))
      .toEqual(['', 'Permanent', 'Temporary', 'Guest Lecturer']);
  });

  for (const employmentStatus of ['Permanent', 'Temporary']) {
    for (const mode of ['create', 'edit'] as const) {
      it(`offers only the screenshot ranks for ${employmentStatus} in ${mode} and saves the chosen rank`, async () => {
        if (mode === 'create') {
          component.openCreateModal();
          Object.assign(component.createForm, faculty, { employment_status: 'Guest Lecturer', position_level: 'Lecturer I' });
        } else {
          component.openEditModal({ ...faculty, employment_status: 'Guest Lecturer', position_level: 'Lecturer I' });
        }
        const status = await renderSelect(`${mode}-employment-status`);
        status.value = employmentStatus;
        status.dispatchEvent(new Event('change'));
        const rank = await renderSelect(`${mode}-academic-rank`);
        expect(Array.from(rank.options).map((option) => option.value)).toEqual(['', ...permanentRanks]);
        expect(Array.from(rank.options).slice(1).map((option) => option.textContent!.trim())).toEqual(permanentRanks);
        expect(rank.value).toBe('');
        const form = mode === 'create' ? component.createForm : component.editForm;
        expect(form.position_level).toBe('');
        rank.value = 'Professor VI';
        rank.dispatchEvent(new Event('change'));
        if (mode === 'create') {
          component.submitCreateForm();
          expect(service.createFaculty.calls.mostRecent().args[0].position_level).toBe('Professor VI');
        } else {
          component.submitEditForm();
          expect(service.updateFaculty.calls.mostRecent().args[1].position_level).toBe('Professor VI');
        }
      });
    }
  }

  it('retains a valid rank between Permanent and Temporary and clears it for Guest Lecturer', async () => {
    component.openEditModal({ ...faculty, employment_status: 'Permanent', position_level: 'Instructor II' });
    const rank = await renderSelect('edit-academic-rank');
    expect(rank.value).toBe('Instructor II');
    const status = await renderSelect('edit-employment-status');
    for (const employmentStatus of ['Temporary', 'Permanent']) {
      status.value = employmentStatus;
      status.dispatchEvent(new Event('change'));
      await renderSelect('edit-academic-rank');
      expect(rank.value).toBe('Instructor II');
      expect(Array.from(rank.options).map((option) => option.value))
        .toEqual(['', ...permanentRanks]);
    }
    status.value = 'Guest Lecturer';
    status.dispatchEvent(new Event('change'));
    await renderSelect('edit-academic-rank');
    expect(rank.value).toBe('');
    expect(component.editForm.position_level).toBe('');
    expect(Array.from(rank.options).map((option) => option.value)).toEqual(['', ...guestRanks]);
  });

  for (const mode of ['create', 'edit'] as const) {
    it(`shows exactly the requested Guest Lecturer ranks in ${mode} and saves a new rank`, async () => {
      if (mode === 'create') {
        component.openCreateModal();
        Object.assign(component.createForm, faculty, { position_level: 'Instructor I' });
      } else {
        component.openEditModal({ ...faculty, position_level: 'Instructor I' });
      }
      const status = await renderSelect(`${mode}-employment-status`);
      status.value = 'Guest Lecturer';
      status.dispatchEvent(new Event('change'));
      const rank = await renderSelect(`${mode}-academic-rank`);
      expect(rank.disabled).toBeFalse();
      expect(rank.value).toBe('');
      expect(Array.from(rank.options).map((option) => option.value)).toEqual(['', ...guestRanks]);
      expect(Array.from(rank.options).slice(1).map((option) => option.textContent!.trim())).toEqual(guestRanks);
      rank.value = 'Professorial Lecturer VI';
      rank.dispatchEvent(new Event('change'));
      if (mode === 'create') {
        component.submitCreateForm();
        expect(service.createFaculty.calls.mostRecent().args[0].position_level).toBe('Professorial Lecturer VI');
      } else {
        component.submitEditForm();
        expect(service.updateFaculty.calls.mostRecent().args[1].position_level).toBe('Professorial Lecturer VI');
      }
    });

    it(`keeps Academic Rank clickable and requires both employment fields in ${mode}`, async () => {
      if (mode === 'create') {
        component.openCreateModal();
        Object.assign(component.createForm, faculty, { employment_status: '', position_level: '' });
      } else {
        component.openEditModal({ ...faculty, employment_status: null, position_level: '' });
      }
      const submit = () => mode === 'create' ? component.submitCreateForm() : component.submitEditForm();
      const rank = await renderSelect(`${mode}-academic-rank`);
      expect(rank.disabled).toBeFalse();
      expect(rank.required).toBeTrue();
      expect(Array.from(rank.options).map((option) => option.value)).toEqual(['', ...permanentRanks, ...guestRanks]);
      const status = await renderSelect(`${mode}-employment-status`);
      expect(status.required).toBeTrue();
      for (const id of [`${mode}-employment-status`, `${mode}-academic-rank`]) {
        expect(fixture.nativeElement.querySelector(`label[for="${id}"] .text-red-500`).textContent).toBe('*');
      }
      submit();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Please select employment status' }));
      expect(service.createFaculty).not.toHaveBeenCalled();
      expect(service.updateFaculty).not.toHaveBeenCalled();
      status.value = 'Guest Lecturer';
      status.dispatchEvent(new Event('change'));
      await renderSelect(`${mode}-academic-rank`);
      submit();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Please select academic rank' }));
      expect(service.createFaculty).not.toHaveBeenCalled();
      expect(service.updateFaculty).not.toHaveBeenCalled();
      rank.value = 'Lecturer VII';
      rank.dispatchEvent(new Event('change'));
      await renderSelect(`${mode}-academic-rank`);
      status.value = '';
      status.dispatchEvent(new Event('change'));
      await renderSelect(`${mode}-academic-rank`);
      expect(rank.disabled).toBeFalse();
      expect(rank.value).toBe('');
      const form = mode === 'create' ? component.createForm : component.editForm;
      expect(form.position_level).toBe('');
    });
  }

  it('loads a saved Guest Lecturer rank and clears it when switching to Permanent or Temporary', async () => {
    for (const employmentStatus of ['Permanent', 'Temporary']) {
      component.openEditModal({ ...faculty, employment_status: 'Guest Lecturer', position_level: 'Senior Lecturer V' });
      const rank = await renderSelect('edit-academic-rank');
      expect(rank.value).toBe('Senior Lecturer V');
      const status = await renderSelect('edit-employment-status');
      status.value = employmentStatus;
      status.dispatchEvent(new Event('change'));
      await renderSelect('edit-academic-rank');
      expect(rank.value).toBe('');
      expect(component.editForm.position_level).toBe('');
    }
  });

  for (const status of ['PERMANENT FACULTY', 'TEMPORARY']) {
    it(`clears an ineligible saved rank when editing a legacy ${status} record`, async () => {
      component.openEditModal({ ...faculty, employment_status: status, position_level: 'University Professor' });
      const rank = await renderSelect('edit-academic-rank');
      expect(rank.value).toBe('');
      expect(component.editForm.position_level).toBe('');
      expect(Array.from(rank.options).map((option) => option.value)).toEqual(['', ...permanentRanks]);
      expect(service.updateFaculty).not.toHaveBeenCalled();
    });
  }

  it('creates faculty with the designation entered in the last text input', async () => {
    component.openCreateModal();
    Object.assign(component.createForm, faculty);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#create-designation');
    expect(input.type).toBe('text');
    expect(input.required).toBeFalse();
    expect(input.form?.querySelector('input:last-of-type')).not.toBeNull();
    expect(Array.from(input.form!.querySelectorAll('input, select')).pop()).toBe(input);
    input.value = 'Program Chair';
    input.dispatchEvent(new Event('input'));
    component.submitCreateForm();
    expect(service.createFaculty.calls.mostRecent().args[0].designation).toBe('Program Chair');
    component.openCreateModal();
    expect(component.createForm.designation).toBe('');
  });

  it('loads, changes, and clears the saved designation through Edit Faculty', async () => {
    component.openEditModal({ ...faculty, designation: 'Program Chair' });
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#edit-designation');
    expect(input.value).toBe('Program Chair');
    input.value = 'Research Coordinator';
    input.dispatchEvent(new Event('input'));
    component.submitEditForm();
    expect(service.updateFaculty.calls.mostRecent().args[1].designation).toBe('Research Coordinator');
    component.openEditModal({ ...faculty, designation: 'Research Coordinator' });
    component.editForm.designation = '';
    component.submitEditForm();
    expect(service.updateFaculty.calls.mostRecent().args[1].designation).toBe('');
  });

  for (const mode of ['create', 'edit'] as const) {
    it(`adds and saves multiple designations with Enter in ${mode} without submitting the form`, async () => {
      if (mode === 'create') {
        component.openCreateModal();
        Object.assign(component.createForm, faculty);
      } else {
        component.openEditModal(faculty);
      }
      fixture.detectChanges();
      await fixture.whenStable();
      const first: HTMLInputElement = fixture.nativeElement.querySelector(`#${mode}-designation`);
      expect(first.placeholder).toBe('e.g. Research Coordinator');
      expect(fixture.nativeElement.querySelector(`#${mode}-designation-hint`).textContent)
        .toContain('Press Enter to add another');
      first.value = 'Research Coordinator';
      first.dispatchEvent(new Event('input'));
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      first.dispatchEvent(enter);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(enter.defaultPrevented).toBeTrue();
      expect(service.createFaculty).not.toHaveBeenCalled();
      expect(service.updateFaculty).not.toHaveBeenCalled();
      const second: HTMLInputElement = fixture.nativeElement.querySelector(`#${mode}-designation-1`);
      expect(second).not.toBeNull();
      expect(document.activeElement).toBe(second);
      second.value = 'Program Chair';
      second.dispatchEvent(new Event('input'));
      if (mode === 'create') {
        component.submitCreateForm();
        expect(service.createFaculty.calls.mostRecent().args[0].designation)
          .toBe('Research Coordinator\nProgram Chair');
      } else {
        component.submitEditForm();
        expect(service.updateFaculty.calls.mostRecent().args[1].designation)
          .toBe('Research Coordinator\nProgram Chair');
      }
    });
  }

  it('reloads saved designations into separate inputs and removes the selected entry', async () => {
    component.openEditModal({ ...faculty, designation: 'Research Coordinator\nProgram Chair' });
    fixture.detectChanges();
    await fixture.whenStable();
    const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.designation-inputs input');
    expect(Array.from(inputs).map((input) => input.value)).toEqual(['Research Coordinator', 'Program Chair']);
    fixture.nativeElement.querySelector('button[aria-label="Remove designation 1"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.designation-inputs input').length).toBe(1);
    expect(fixture.nativeElement.querySelector('#edit-designation').value).toBe('Program Chair');
    component.submitEditForm();
    expect(service.updateFaculty.calls.mostRecent().args[1].designation).toBe('Program Chair');
  });

  it('does not add rows for blank entries or exceed the saved designation length limit', async () => {
    component.openCreateModal();
    fixture.detectChanges();
    await fixture.whenStable();
    const first: HTMLInputElement = fixture.nativeElement.querySelector('#create-designation');
    const pressEnter = () => first.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true,
    }));
    pressEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.designation-inputs input').length).toBe(1);
    first.value = 'x'.repeat(255);
    first.dispatchEvent(new Event('input'));
    pressEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.designation-inputs input').length).toBe(1);
    first.value = 'Research Coordinator';
    first.dispatchEvent(new Event('input'));
    pressEnter();
    fixture.detectChanges();
    const second: HTMLInputElement = fixture.nativeElement.querySelector('#create-designation-1');
    expect(second.maxLength).toBe(255 - 'Research Coordinator\n'.length);
  });

  for (const status of ['Permanent', 'Temporary', 'Guest Lecturer']) {
    it(`sends the selected ${status} when creating faculty`, async () => {
      component.openCreateModal();
      Object.assign(component.createForm, faculty);
      const select = await renderSelect('create-employment-status');
      select.value = status;
      select.dispatchEvent(new Event('change'));
      const rank = await renderSelect('create-academic-rank');
      rank.value = status === 'Guest Lecturer' ? 'Lecturer I' : 'Instructor I';
      rank.dispatchEvent(new Event('change'));
      component.submitCreateForm();
      expect(service.createFaculty.calls.mostRecent().args[0].employment_status).toBe(status);
    });
  }

  it('loads the saved status into Edit Faculty and saves changes', async () => {
    component.openEditModal(faculty);
    const select = await renderSelect('edit-employment-status');
    expect(select.value).toBe('Temporary');
    select.value = 'Guest Lecturer';
    select.dispatchEvent(new Event('change'));
    const rank = await renderSelect('edit-academic-rank');
    rank.value = 'Lecturer I';
    rank.dispatchEvent(new Event('change'));
    component.submitEditForm();
    expect(service.updateFaculty.calls.mostRecent().args[0]).toBe(1);
    expect(service.updateFaculty.calls.mostRecent().args[1].employment_status).toBe('Guest Lecturer');
  });

  it('resets the status when opening another create form', () => {
    component.createForm.employment_status = 'Permanent';
    component.openCreateModal();
    expect(component.createForm.employment_status).toBe('');
  });

  it('selects the canonical option for legacy uppercase statuses', async () => {
    component.openEditModal({ ...faculty, employment_status: 'PERMANENT FACULTY' });
    const select = await renderSelect('edit-employment-status');
    expect(select.value).toBe('Permanent');
  });

  it('retains an unrecognized legacy status until a replacement is selected', async () => {
    component.openEditModal({ ...faculty, employment_status: 'Contractual' });
    const select = await renderSelect('edit-employment-status');
    expect(select.value).toBe('Contractual');
    expect(select.selectedOptions[0].disabled).toBeTrue();
    component.submitEditForm();
    expect(service.updateFaculty.calls.mostRecent().args[1].employment_status).toBe('Contractual');
  });
});
