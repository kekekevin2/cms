import { Component, OnInit, signal } from '@angular/core';
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
export class DeanFacultyManagement implements OnInit {
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

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateFacultyData = {
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    position_level: '',
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

        await this.facultyProfilePdfService.generateActivitiesReport(faculty, [
          {
            title: 'Seminars/Trainings/Conferences Attended',
            columns: [
              { key: 'no', header: 'No.', widthFraction: 0.05 },
              {
                key: 'title',
                header: 'Title of Seminar/Workshop/Training/Conference Attended',
                widthFraction: 0.4,
              },
              { key: 'category', header: 'Category (Local, National, International)', widthFraction: 0.15 },
              { key: 'date', header: 'Date', widthFraction: 0.15 },
              { key: 'sponsoring_agency', header: 'Sponsoring Agency', widthFraction: 0.25 },
            ],
            rows: seminars.map((s: any, i: number) => ({
              no: String(i + 1),
              title: s.title || '',
              category: s.category || '',
              date: formatDate(s.date),
              sponsoring_agency: s.sponsoring_agency || '',
            })),
          },
          {
            title: 'Research Activities',
            columns: [
              { key: 'no', header: 'No.', widthFraction: 0.05 },
              { key: 'title', header: 'Title of Research', widthFraction: 0.4 },
              { key: 'category', header: 'Category', widthFraction: 0.15 },
              { key: 'date', header: 'Date', widthFraction: 0.15 },
              { key: 'sponsoring_agency', header: 'Sponsoring Agency', widthFraction: 0.25 },
            ],
            rows: research.map((r: any, i: number) => ({
              no: String(i + 1),
              title: r.title || '',
              category: r.category || '',
              date: formatDate(r.date),
              sponsoring_agency: r.sponsoring_agency || '',
            })),
          },
          {
            title: 'Extension Activities',
            columns: [
              { key: 'no', header: 'No.', widthFraction: 0.05 },
              { key: 'title', header: 'Title of Extension PPAs', widthFraction: 0.4 },
              { key: 'date', header: 'Date of Implementation', widthFraction: 0.15 },
              { key: 'beneficiary', header: 'Beneficiary', widthFraction: 0.22 },
              { key: 'location', header: 'Location', widthFraction: 0.18 },
            ],
            rows: extensions.map((e: any, i: number) => ({
              no: String(i + 1),
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
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
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
    };
    this.showEditModal.set(true);
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
                faculty,
                personal: profileData.personal,
                academic: profileData.academic,
                employment: profileData.employment,
                coursesHandled: profileData.coursesHandled,
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
