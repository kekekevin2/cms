import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeanFacultyService,
  Faculty,
  CreateFacultyData,
  UpdateFacultyData,
} from '../../../services/dean/dean-faculty.service';
import {
  DropdownService,
  DropdownAcademicYear,
  DropdownPositionLevel,
} from '../../../services/core/dropdown.service';
import { DeanAnalyticsService } from '../../../services/dean/dean-analytics.service';
import { DeanPDSService } from '../../../services/dean/dean-pds.service';
import { DeanFacultyProfileService } from '../../../services/dean/dean-faculty-profile.service';
import { PdsPdfService } from '../../../services/core/pds-pdf.service';
import { FacultyProfilePdfService } from '../../../services/core/faculty-profile-pdf.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-faculty-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './faculty-management.html',
  styleUrl: './faculty-management.css',
})
export class DeanFacultyManagement implements OnInit, OnDestroy {
  // Active faculty state
  facultyList = signal<Faculty[]>([]);
  loading = signal(false);
  createLoading = signal(false);
  updateLoading = signal(false);
  deleteLoading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = signal('');
  pageSize = 10;
  Math = Math;

  // Disabled faculty state
  activeTab = signal<'active' | 'disabled'>('active');
  disabledFacultyList = signal<Faculty[]>([]);
  disabledLoading = signal(false);
  disabledCurrentPage = signal(1);
  disabledTotalPages = signal(1);
  disabledTotalItems = signal(0);
  disabledSearchQuery = signal('');

  positionLevels = signal<DropdownPositionLevel[]>([]);
  readonly employmentStatuses = ['Permanent', 'Temporary', 'Guest Lecturer'];
  private readonly academicRankPattern = /^(?:Instructor (?:I|II|III)|Assistant Professor (?:I|II|III|IV)|Associate Professor (?:I|II|III|IV|V)|Professor (?:I|II|III|IV|V|VI))$/;
  private readonly guestLecturerRanks: DropdownPositionLevel[] = [
    'Lecturer I', 'Lecturer II', 'Lecturer III', 'Lecturer IV', 'Lecturer V', 'Lecturer VI', 'Lecturer VII',
    'Senior Lecturer I', 'Senior Lecturer II', 'Senior Lecturer III', 'Senior Lecturer IV', 'Senior Lecturer V',
    'Professorial Lecturer I', 'Professorial Lecturer II', 'Professorial Lecturer III',
    'Professorial Lecturer IV', 'Professorial Lecturer V', 'Professorial Lecturer VI',
  ].map((value) => ({ value, label: value }));

  private isPermanentOrTemporary(status: string | null | undefined): boolean {
    return ['Permanent', 'Temporary'].includes(this.normalizeEmploymentStatus(status));
  }

  academicRanksFor(status: string | null | undefined): DropdownPositionLevel[] {
    if (this.normalizeEmploymentStatus(status) === 'Guest Lecturer') return this.guestLecturerRanks;
    if (this.isPermanentOrTemporary(status)) {
      return this.positionLevels().filter((level) => this.academicRankPattern.test(level.value));
    }
    return [
      ...this.positionLevels().filter((level) => this.academicRankPattern.test(level.value)),
      ...this.guestLecturerRanks,
    ];
  }

  onEmploymentStatusChange(mode: 'create' | 'edit', status: string): void {
    const form = mode === 'create' ? this.createForm : this.editForm;
    form.employment_status = this.normalizeEmploymentStatus(status);
    if (!form.employment_status ||
        (this.isPermanentOrTemporary(form.employment_status) && form.position_level &&
          !this.academicRankPattern.test(form.position_level)) ||
        (form.employment_status === 'Guest Lecturer' && form.position_level &&
          !this.guestLecturerRanks.some((rank) => rank.value === form.position_level))) {
      form.position_level = '';
    }
  }

  showCreateModal = signal(false);
  showEditModal = signal(false);
  viewedFaculty = signal<Faculty | null>(null);
  viewLoading = signal(false);
  viewError = signal('');
  private viewRequest?: Subscription;
  private viewTrigger?: HTMLElement;
  private viewDialogElement?: HTMLElement;

  @ViewChild('facultyViewDialog')
  set facultyViewDialog(ref: ElementRef<HTMLElement> | undefined) {
    this.viewDialogElement = ref?.nativeElement;
    this.viewDialogElement?.focus();
  }

  createForm: CreateFacultyData = {
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    position_level: '',
    employment_status: '',
    designation: '',
  };
  editForm = {
    faculty_id: 0,
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    position_level: '',
    employment_status: '',
    designation: '',
  };

  constructor(
    private facultyService: DeanFacultyService,
    private dropdownService: DropdownService,
    private analyticsService: DeanAnalyticsService,
    private pdsService: DeanPDSService,
    private facultyProfileService: DeanFacultyProfileService,
    private pdfService: PdsPdfService,
    private facultyProfilePdfService: FacultyProfilePdfService,
  ) {}

  openViewModal(faculty: Faculty, rememberTrigger = true): void {
    if (rememberTrigger && document.activeElement instanceof HTMLElement) {
      this.viewTrigger = document.activeElement;
    }
    this.viewRequest?.unsubscribe();
    this.viewedFaculty.set({ ...faculty });
    this.viewError.set('');
    this.viewLoading.set(true);
    this.viewDialogElement?.focus();
    this.viewRequest = this.facultyProfileService.getFacultyFullProfile(faculty.faculty_id).subscribe({
      next: (profile) => {
        this.viewedFaculty.set({
          ...faculty,
          ...(profile.faculty || {}),
          employment_status: this.normalizeEmploymentStatus(profile.faculty?.employment_status),
        });
        this.viewLoading.set(false);
      },
      error: (error) => {
        this.viewError.set(error.error?.message || 'Unable to load faculty details. Please try again.');
        this.viewLoading.set(false);
      },
    });
  }

  closeViewModal(): void {
    this.viewRequest?.unsubscribe();
    this.viewedFaculty.set(null);
    this.viewLoading.set(false);
    this.viewError.set('');
    if (this.viewTrigger?.isConnected) this.viewTrigger.focus();
    this.viewTrigger = undefined;
  }

  retryViewFaculty(): void {
    const faculty = this.viewedFaculty();
    if (faculty) this.openViewModal(faculty, false);
  }

  onViewKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeViewModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget as HTMLElement;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    this.viewRequest?.unsubscribe();
  }

  generateAllActivitiesPDF(faculty: Faculty) {
    Promise.all([
      this.analyticsService.getSeminarsTrainingsByFaculty(faculty.faculty_id).toPromise(),
      this.analyticsService.getResearchActivitiesByFaculty(faculty.faculty_id).toPromise(),
      this.analyticsService.getExtensionActivitiesByFaculty(faculty.faculty_id).toPromise(),
    ])
      .then(async ([seminarsData, researchData, extensionData]) => {
        const seminars = seminarsData?.facultyList?.[0]?.activities || [];
        const research = researchData?.facultyList?.[0]?.activities || [];
        const extensions = extensionData?.facultyList?.[0]?.activities || [];

        if (seminars.length === 0 && research.length === 0 && extensions.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Data',
            text: 'No activities found for this faculty member.',
            confirmButtonColor: '#2563eb',
          });
          return;
        }

        const formatDate = (date: string) => {
          if (!date) return '';
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        // "FY 2022-2025": the span of years the listed activities fall in
        const period = (rows: any[]) => {
          const years = rows
            .map((r) => new Date(r.date).getFullYear())
            .filter((y) => !isNaN(y));
          if (years.length === 0) return `FY ${new Date().getFullYear()}`;
          const [from, to] = [Math.min(...years), Math.max(...years)];
          return from === to ? `FY ${from}` : `FY ${from}-${to}`;
        };
        // No. / Title / Category / Date / Sponsoring Agency, sized like the accreditation tables
        const involvementColumns = (titleHeader: string) => [
          { key: 'no', header: 'No.', widthFraction: 0.07, align: 'center' as const },
          { key: 'title', header: titleHeader, widthFraction: 0.38 },
          { key: 'category', header: 'Category (Local, National, International)', widthFraction: 0.15 },
          { key: 'date', header: 'Date', widthFraction: 0.18 },
          { key: 'sponsoring_agency', header: 'Sponsoring Agency', widthFraction: 0.22 },
        ];
        const involvementRows = (rows: any[]) =>
          rows.map((r: any, i: number) => ({
            no: `${i + 1}.`,
            title: r.title || '',
            category: r.category || '',
            date: formatDate(r.date),
            sponsoring_agency: r.sponsoring_agency || '',
          }));

        await this.facultyProfilePdfService.generateActivitiesReport(faculty, [
          {
            titleLines: [
              'List of Faculty Involvement in',
              'Seminars/Workshops/Trainings/Conferences (Permanent and Temporary)',
            ],
            period: period(seminars),
            columns: involvementColumns('Title of Seminar/Workshop/Training/ Conference Attended'),
            rows: involvementRows(seminars),
          },
          {
            titleLines: [
              'List of Faculty Involvement in Research-related',
              'Seminars/Workshops/Trainings/Conferences (Permanent and Temporary)',
            ],
            period: period(research),
            columns: involvementColumns('Title of Research Seminar/Workshop/Training/ Conference Attended'),
            rows: involvementRows(research),
          },
          {
            titleLines: ['List of Faculty Involvement in', 'Extension Activities (Permanent and Temporary)'],
            period: period(extensions),
            columns: [
              { key: 'no', header: 'No.', widthFraction: 0.07, align: 'center' as const },
              { key: 'title', header: 'Title of Extension PPAs', widthFraction: 0.38 },
              { key: 'date', header: 'Date of Implementation', widthFraction: 0.18 },
              { key: 'beneficiary', header: 'Beneficiary', widthFraction: 0.19 },
              { key: 'location', header: 'Location', widthFraction: 0.18 },
            ],
            rows: extensions.map((e: any, i: number) => ({
              no: `${i + 1}.`,
              title: e.title || '',
              date: formatDate(e.date),
              beneficiary: e.beneficiary || '',
              location: e.location || '',
            })),
          },
        ]);
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to generate PDF. Please try again.',
          confirmButtonColor: '#2563eb',
        });
      });
  }

  ngOnInit() {
    this.loadFaculty();
    this.loadPositionLevels();
  }

  loadPositionLevels() {
    this.dropdownService.getPositionLevels().subscribe({
      next: (levels) => this.positionLevels.set(levels),
      error: (error) => console.error('Error loading position levels:', error),
    });
  }

  loadFaculty() {
    this.loading.set(true);
    this.facultyService
      .getFaculty(this.currentPage(), this.pageSize, this.searchQuery())
      .subscribe({
        next: (response) => {
          this.facultyList.set(response.faculty);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading faculty:', error);
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load faculty',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  searchFaculty() {
    this.currentPage.set(1);
    this.loadFaculty();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadFaculty();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }

  openCreateModal() {
    this.createForm = {
      employee_id: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      contact_number: '',
      position_level: '',
      employment_status: '',
      designation: '',
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  designationEntries(mode: 'create' | 'edit'): string[] {
    const form = mode === 'create' ? this.createForm : this.editForm;
    return (form.designation || '').split('\n');
  }

  updateDesignationEntry(mode: 'create' | 'edit', index: number, value: string): void {
    const form = mode === 'create' ? this.createForm : this.editForm;
    const entries = this.designationEntries(mode);
    entries[index] = value;
    form.designation = entries.join('\n');
  }

  addDesignationEntry(mode: 'create' | 'edit', index: number, event: Event): void {
    if (event instanceof KeyboardEvent && event.isComposing) return;
    event.preventDefault();
    const form = mode === 'create' ? this.createForm : this.editForm;
    const entries = this.designationEntries(mode);
    if (!entries[index].trim() || (form.designation || '').length >= 255) return;
    entries.splice(index + 1, 0, '');
    form.designation = entries.join('\n');
    const container = (event.target as HTMLElement).closest('.designation-inputs');
    setTimeout(() => container?.querySelectorAll<HTMLInputElement>('input')[index + 1]?.focus());
  }

  removeDesignationEntry(mode: 'create' | 'edit', index: number): void {
    const form = mode === 'create' ? this.createForm : this.editForm;
    const entries = this.designationEntries(mode);
    entries.splice(index, 1);
    form.designation = entries.join('\n');
  }

  submitCreateForm() {
    if (!this.createForm.employee_id.trim() || this.createForm.employee_id.length !== 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a valid 5-digit employee ID',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.createForm.first_name.trim() || !this.createForm.last_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter first name and last name',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.createForm.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter email',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    if (!this.validateEmploymentFields(this.createForm)) return;

    this.createLoading.set(true);
    this.facultyService.createFaculty(this.createForm).subscribe({
      next: (response) => {
        this.createLoading.set(false);
        this.closeCreateModal();

        if (response.emailSent) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: `Faculty created successfully!<br><small>Credentials sent via email to ${this.createForm.email}</small>`,
            confirmButtonColor: '#2563eb',
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Faculty Created - Email Failed',
            html: `
              <p>Faculty account created successfully, but email could not be sent.</p>
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; text-align: left;">
                <p><strong>Email:</strong> ${this.createForm.email}</p>
                <p><strong>Password:</strong> <code style="background: #dbeafe; padding: 2px 6px; border-radius: 3px;">${response.generatedPassword}</code></p>
              </div>
              <p style="color: #2563eb; font-size: 14px;"><strong>⚠️ Important:</strong> Please save these credentials and share them with the faculty manually.</p>
            `,
            confirmButtonColor: '#2563eb',
            confirmButtonText: 'I have saved the credentials',
            allowOutsideClick: false,
          });
        }

        this.loadFaculty();
      },
      error: (error) => {
        this.createLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'Failed to create faculty',
          confirmButtonColor: '#2563eb',
        });
      },
    });
  }

  openEditModal(faculty: Faculty) {
    this.editForm = {
      faculty_id: faculty.faculty_id,
      employee_id: faculty.employee_id,
      first_name: faculty.first_name,
      middle_name: faculty.middle_name || '',
      last_name: faculty.last_name,
      email: faculty.email,
      contact_number: faculty.contact_number || '',
      position_level: faculty.position_level || '',
      employment_status: this.normalizeEmploymentStatus(faculty.employment_status),
      designation: faculty.designation || '',
    };
    this.onEmploymentStatusChange('edit', this.editForm.employment_status);
    this.showEditModal.set(true);
  }

  private normalizeEmploymentStatus(value: string | null | undefined): string {
    const normalized = (value || '').trim().replace(/\s+faculty$/i, '').toLowerCase();
    return this.employmentStatuses.find((status) => status.toLowerCase() === normalized) || value || '';
  }

  private validateEmploymentFields(form: Pick<Faculty, 'employment_status' | 'position_level'>): boolean {
    if (!form.employment_status?.trim() || !form.position_level?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: !form.employment_status?.trim() ? 'Please select employment status' : 'Please select academic rank',
        confirmButtonColor: '#2563eb',
      });
      return false;
    }
    return true;
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEditForm() {
    if (!this.editForm.employee_id.trim() || this.editForm.employee_id.length !== 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a valid 5-digit employee ID',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.editForm.first_name.trim() || !this.editForm.last_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter first name and last name',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.editForm.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter email',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    if (!this.validateEmploymentFields(this.editForm)) return;

    this.updateLoading.set(true);
    this.facultyService
      .updateFaculty(this.editForm.faculty_id, {
        employee_id: this.editForm.employee_id,
        first_name: this.editForm.first_name,
        middle_name: this.editForm.middle_name,
        last_name: this.editForm.last_name,
        email: this.editForm.email,
        contact_number: this.editForm.contact_number,
        position_level: this.editForm.position_level,
        employment_status: this.editForm.employment_status,
        designation: this.editForm.designation,
      })
      .subscribe({
        next: () => {
          this.updateLoading.set(false);
          this.closeEditModal();
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Faculty updated successfully',
            confirmButtonColor: '#2563eb',
          });
          this.loadFaculty();
        },
        error: (error) => {
          this.updateLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update faculty',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }



  getFullName(faculty: Faculty): string {
    return faculty.middle_name
      ? `${faculty.first_name} ${faculty.middle_name} ${faculty.last_name}`
      : `${faculty.first_name} ${faculty.last_name}`;
  }

  resetPassword(faculty: Faculty) {
    Swal.fire({
      title: 'Reset Password',
      text: `Generate a new password for "${this.getFullName(faculty)}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reset Password',
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.facultyService.resetPassword(faculty.faculty_id).subscribe({
          next: (response) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Password Reset!',
              html: `
                <div class="text-left">
                  <p class="mb-4">New password generated successfully:</p>
                  <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <p class="mb-2"><strong>Email:</strong> ${faculty.email}</p>
                    <p><strong>New Password:</strong> <span class="font-mono text-blue-600">${response.newPassword}</span></p>
                  </div>
                  <p class="text-sm text-red-600">⚠️ Save this password now. It won't be shown again.</p>
                </div>
              `,
              confirmButtonText: 'I have saved the password',
              confirmButtonColor: '#16a34a',
              allowOutsideClick: false,
            });
          },
          error: (error) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to reset password',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  downloadFacultyPDS(faculty: Faculty) {
    Swal.fire({
      title: 'Download PDS',
      text: `Download Personal Data Sheet for "${this.getFullName(faculty)}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Download',
      confirmButtonColor: '#2563eb',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.pdsService.getFacultyPDS(faculty.faculty_id).subscribe({
          next: async (pds) => {
            try {
              await this.pdfService.generateAndDownload(pds);
              Swal.fire({
                icon: 'success',
                title: 'Download Complete',
                text: 'PDS PDF has been downloaded successfully.',
                timer: 2000,
                showConfirmButton: false,
              });
            } catch (err) {
              console.error('PDF generation error:', err);
              Swal.fire({
                icon: 'error',
                title: 'Download Failed',
                text: 'Failed to generate PDS PDF.',
                confirmButtonColor: '#2563eb',
              });
            } finally {
              this.loading.set(false);
            }
          },
          error: (error) => {
            this.loading.set(false);
            console.error('Download PDS error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Download Failed',
              text: error.error?.message || 'Failed to download PDS.',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  downloadFacultyProfile(faculty: Faculty) {
    Swal.fire({
      title: 'Download Faculty Profile',
      text: `Generate PDF profile for "${this.getFullName(faculty)}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Download PDF',
      confirmButtonColor: '#2563eb',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Generating PDF...',
          text: 'Please wait while we fetch the profile data',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        this.facultyProfileService.getFacultyFullProfile(faculty.faculty_id).subscribe({
          next: async (profileData) => {
            try {
              await this.facultyProfilePdfService.generateAndDownload({
                faculty: {
                  ...faculty,
                  ...(profileData.faculty || {}),
                  employment_status: profileData.faculty?.employment_status ?? null,
                },
                personal: profileData.personal,
                academic: profileData.academic,
                employment: profileData.employment,
                coursesHandled: profileData.coursesHandled,
                eligibilities: (profileData.eligibilities || [])
                  .map((e: any) => e.career_service)
                  .filter(Boolean),
                pdsEducation: profileData.pdsEducation || [],
                photoUrl: profileData.photoUrl || null,
              });
              Swal.close();
            } catch (error) {
              console.error('Error generating faculty profile PDF:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate the profile PDF. Please try again.',
                confirmButtonColor: '#2563eb',
              });
            }
          },
          error: (error) => {
            console.error('Error fetching faculty profile:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to fetch faculty profile data. Please try again.',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  // Switch between active and disabled tabs
  switchTab(tab: 'active' | 'disabled') {
    this.activeTab.set(tab);
    if (tab === 'disabled') {
      this.loadDisabledFaculty();
    }
  }

  // Load disabled faculty
  loadDisabledFaculty() {
    this.disabledLoading.set(true);
    this.facultyService
      .getDisabledFaculty(
        this.disabledCurrentPage(),
        this.pageSize,
        this.disabledSearchQuery(),
      )
      .subscribe({
        next: (response) => {
          this.disabledFacultyList.set(response.faculty);
          this.disabledCurrentPage.set(response.currentPage);
          this.disabledTotalPages.set(response.totalPages);
          this.disabledTotalItems.set(response.totalItems);
          this.disabledLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading disabled faculty:', error);
          this.disabledLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load disabled faculty',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  // Search disabled faculty
  searchDisabledFaculty() {
    this.disabledCurrentPage.set(1);
    this.loadDisabledFaculty();
  }

  // Change page for disabled faculty
  changeDisabledPage(page: number) {
    if (page >= 1 && page <= this.disabledTotalPages()) {
      this.disabledCurrentPage.set(page);
      this.loadDisabledFaculty();
    }
  }

  // Disable faculty account (soft delete)
  disableFaculty(faculty: Faculty) {
    Swal.fire({
      title: 'Disable Account',
      html: `
        <p>Are you sure you want to disable the account for:</p>
        <p class="font-semibold mt-2">"${this.getFullName(faculty)}"?</p>
        <p class="text-sm text-gray-600 mt-3">The account will be disabled and the faculty member will not be able to login.</p>
        <p class="text-sm text-blue-600 mt-2">You can restore this account later from the "Disabled Accounts" tab.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Disable Account',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.facultyService.disableFaculty(faculty.faculty_id).subscribe({
          next: () => {
            this.loading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Account Disabled',
              text: 'Faculty account has been disabled successfully',
              confirmButtonColor: '#2563eb',
            });
            this.loadFaculty();
          },
          error: (error) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to disable faculty account',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  // Restore disabled faculty account
  restoreFaculty(faculty: Faculty) {
    Swal.fire({
      title: 'Restore Account',
      html: `
        <p>Restore the account for:</p>
        <p class="font-semibold mt-2">"${this.getFullName(faculty)}"?</p>
        <p class="text-sm text-gray-600 mt-3">The account will be reactivated and the faculty member will be able to login again.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restore Account',
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.disabledLoading.set(true);
        this.facultyService.restoreFaculty(faculty.faculty_id).subscribe({
          next: () => {
            this.disabledLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Account Restored',
              text: 'Faculty account has been restored successfully',
              confirmButtonColor: '#2563eb',
            });
            this.loadDisabledFaculty();
            this.loadFaculty(); // Refresh active list too
          },
          error: (error) => {
            this.disabledLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to restore faculty account',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  // Permanently delete faculty (only for disabled accounts)
  permanentlyDeleteFaculty(faculty: Faculty) {
    Swal.fire({
      title: 'Permanently Delete Account',
      html: `
        <div class="text-left">
          <p class="text-red-600 font-semibold mb-3">⚠️ WARNING: This action cannot be undone!</p>
          <p>You are about to permanently delete:</p>
          <p class="font-semibold mt-2">"${this.getFullName(faculty)}"</p>
          <div class="bg-red-50 border-l-4 border-red-500 p-3 mt-4">
            <p class="text-sm text-red-800">This will:</p>
            <ul class="text-sm text-red-800 list-disc list-inside mt-2">
              <li>Permanently remove the faculty record</li>
              <li>Delete the associated user account</li>
              <li>Remove all associated data</li>
              <li><strong>This action CANNOT be reversed</strong></li>
            </ul>
          </div>
          <p class="text-sm text-gray-600 mt-4">Type "DELETE" to confirm:</p>
        </div>
      `,
      icon: 'error',
      input: 'text',
      inputPlaceholder: 'Type DELETE to confirm',
      showCancelButton: true,
      confirmButtonText: 'Permanently Delete',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
      preConfirm: (value) => {
        if (value !== 'DELETE') {
          Swal.showValidationMessage('You must type "DELETE" to confirm');
          return false;
        }
        return true;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.disabledLoading.set(true);
        this.facultyService.permanentlyDeleteFaculty(faculty.faculty_id).subscribe({
          next: () => {
            this.disabledLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Permanently Deleted',
              text: 'Faculty account has been permanently deleted',
              confirmButtonColor: '#2563eb',
            });
            this.loadDisabledFaculty();
          },
          error: (error) => {
            this.disabledLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to permanently delete faculty',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  // Keep the old delete function for backward compatibility but rename it
  openDeleteModal(faculty: Faculty) {
    // This is now replaced by disableFaculty
    this.disableFaculty(faculty);
  }
}
