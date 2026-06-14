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
  ) {}

  generateAllActivitiesPDF(faculty: Faculty) {
    // Fetch all three types of activities
    Promise.all([
      this.analyticsService.getSeminarsTrainingsByFaculty(faculty.faculty_id).toPromise(),
      this.analyticsService.getResearchActivitiesByFaculty(faculty.faculty_id).toPromise(),
      this.analyticsService.getExtensionActivitiesByFaculty(faculty.faculty_id).toPromise(),
    ])
      .then(([seminarsData, researchData, extensionData]) => {
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

        this.createHTMLPDF(faculty, seminars, research, extensions);
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

  private createHTMLPDF(faculty: Faculty, seminars: any[], research: any[], extensions: any[]) {
    const currentYear = new Date().getFullYear();
    const facultyName = `${faculty.last_name.toUpperCase()}, ${faculty.first_name.toUpperCase()} ${faculty.middle_name?.toUpperCase() || ''}`;

    const formatDate = (date: string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faculty Activities Report</title>
        <style>
          @media print {
            @page { margin: 0.5in; size: letter; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
          }
          .page-break { page-break-after: always; }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .title {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 10pt;
            margin-bottom: 10px;
          }
          .faculty-name {
            text-align: left;
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 10pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid black;
            padding: 4px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            font-size: 8pt;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .col-no { width: 5%; }
          .col-title { width: 40%; }
          .col-category { width: 15%; }
          .col-date { width: 15%; }
          .col-agency { width: 25%; }
          .col-beneficiary { width: 22%; }
          .col-location { width: 18%; }
        </style>
      </head>
      <body>
    `;

    // Seminars Section
    if (seminars.length > 0) {
      htmlContent += `
        <div class="header">
          <div class="title">Seminars/Trainings/Conferences Attended</div>
          <div class="subtitle">FY ${currentYear}-${currentYear + 1}</div>
        </div>
        <div class="faculty-name">Faculty Name: ${facultyName}</div>
        <table>
          <thead>
            <tr>
              <th class="col-no">No.</th>
              <th class="col-title">Title of Seminar/Workshop/Training/Conference Attended</th>
              <th class="col-category">Category (Local, National, International)</th>
              <th class="col-date">Date</th>
              <th class="col-agency">Sponsoring Agency</th>
            </tr>
          </thead>
          <tbody>
      `;

      seminars.forEach((seminar, index) => {
        htmlContent += `
          <tr>
            <td class="col-no">${index + 1}</td>
            <td class="col-title">${seminar.title || ''}</td>
            <td class="col-category">${seminar.category || ''}</td>
            <td class="col-date">${formatDate(seminar.date)}</td>
            <td class="col-agency">${seminar.sponsoring_agency || ''}</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
        <div class="page-break"></div>
      `;
    }

    // Research Section
    if (research.length > 0) {
      htmlContent += `
        <div class="header">
          <div class="title">Research Activities</div>
          <div class="subtitle">FY ${currentYear}-${currentYear + 1}</div>
        </div>
        <div class="faculty-name">Faculty Name: ${facultyName}</div>
        <table>
          <thead>
            <tr>
              <th class="col-no">No.</th>
              <th class="col-title">Title of Research</th>
              <th class="col-category">Category</th>
              <th class="col-date">Date</th>
              <th class="col-agency">Sponsoring Agency</th>
            </tr>
          </thead>
          <tbody>
      `;

      research.forEach((item, index) => {
        htmlContent += `
          <tr>
            <td class="col-no">${index + 1}</td>
            <td class="col-title">${item.title || ''}</td>
            <td class="col-category">${item.category || ''}</td>
            <td class="col-date">${formatDate(item.date)}</td>
            <td class="col-agency">${item.sponsoring_agency || ''}</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
        <div class="page-break"></div>
      `;
    }

    // Extension Section
    if (extensions.length > 0) {
      htmlContent += `
        <div class="header">
          <div class="title">Extension Activities</div>
          <div class="subtitle">FY ${currentYear}-${currentYear + 1}</div>
        </div>
        <div class="faculty-name">Faculty Name: ${facultyName}</div>
        <table>
          <thead>
            <tr>
              <th class="col-no">No.</th>
              <th class="col-title">Title of Extension PPAs</th>
              <th class="col-date">Date of Implementation</th>
              <th class="col-beneficiary">Beneficiary</th>
              <th class="col-location">Location</th>
            </tr>
          </thead>
          <tbody>
      `;

      extensions.forEach((item, index) => {
        htmlContent += `
          <tr>
            <td class="col-no">${index + 1}</td>
            <td class="col-title">${item.title || ''}</td>
            <td class="col-date">${formatDate(item.date_from)}</td>
            <td class="col-beneficiary">${item.beneficiary || ''}</td>
            <td class="col-location">${item.location || ''}</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
      `;
    }

    htmlContent += `
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  private createPDF(data: any, type: string, faculty: Faculty) {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const title = data.title;
    const titleLines = doc.splitTextToSize(title, pageWidth - 2 * margin);
    doc.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += titleLines.length * 6 + 5;

    // Academic Year
    const currentYear = new Date().getFullYear();
    doc.setFontSize(11);
    doc.text(`FY ${currentYear}-${currentYear + 1}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Faculty Name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Faculty Name: ${data.facultyList[0].faculty_name.toUpperCase()}`, margin, yPosition);
    yPosition += 8;

    // Table headers
    const headers = this.getTableHeaders(type);
    const columnWidths = this.getColumnWidths(type, pageWidth, margin);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 7);

    let xPosition = margin + 2;
    headers.forEach((header: string, index: number) => {
      doc.text(header, xPosition, yPosition + 5);
      xPosition += columnWidths[index];
    });
    yPosition += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    data.facultyList[0].activities.forEach((activity: any, activityIndex: number) => {
      const rowData = this.getRowData(activity, type, activityIndex + 1);
      const rowHeight = this.calculateRowHeight(doc, rowData, columnWidths, pageWidth, margin);

      // Check if we need a new page
      if (yPosition + rowHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight);

      xPosition = margin + 2;
      rowData.forEach((cellData: string, index: number) => {
        const cellLines = doc.splitTextToSize(cellData, columnWidths[index] - 4);
        doc.text(cellLines, xPosition, yPosition + 4);
        xPosition += columnWidths[index];
      });

      yPosition += rowHeight;
    });

    // Save PDF
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const facultyName = `${faculty.last_name}_${faculty.first_name}`.replace(/\s+/g, '_');
    const fileName = `${facultyName}_${typeLabel}_Report_${currentYear}.pdf`;
    doc.save(fileName);
  }

  private getTableHeaders(type: string): string[] {
    switch (type) {
      case 'extension':
        return [
          'No.',
          'Title of Extension PPAs',
          'Date of Implementation',
          'Beneficiary',
          'Location',
        ];
      case 'research':
        return ['No.', 'Title of Research', 'Category', 'Date', 'Sponsoring Agency'];
      case 'seminars':
        return [
          'No.',
          'Title of Seminar/Workshop/Training/Conference Attended',
          'Category (Local, National, International)',
          'Date',
          'Sponsoring Agency',
        ];
      default:
        return [];
    }
  }

  private getColumnWidths(type: string, pageWidth: number, margin: number): number[] {
    const totalWidth = pageWidth - 2 * margin;
    switch (type) {
      case 'extension':
        return [12, totalWidth * 0.35, totalWidth * 0.18, totalWidth * 0.22, totalWidth * 0.13];
      case 'research':
      case 'seminars':
        return [12, totalWidth * 0.4, totalWidth * 0.15, totalWidth * 0.15, totalWidth * 0.18];
      default:
        return [];
    }
  }

  private getRowData(activity: any, type: string, rowNumber: number): string[] {
    const formatDate = (date: string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    switch (type) {
      case 'extension':
        const dateRange = activity.date_to
          ? `${formatDate(activity.date_from)} - ${formatDate(activity.date_to)}`
          : formatDate(activity.date_from);
        return [
          rowNumber.toString(),
          activity.title || '',
          dateRange,
          activity.beneficiary || '',
          activity.location || '',
        ];
      case 'research':
        return [
          rowNumber.toString(),
          activity.title || '',
          activity.category || '',
          formatDate(activity.date),
          activity.sponsoring_agency || '',
        ];
      case 'seminars':
        return [
          rowNumber.toString(),
          activity.title || '',
          activity.category || '',
          formatDate(activity.date),
          activity.sponsoring_agency || '',
        ];
      default:
        return [];
    }
  }

  private calculateRowHeight(
    doc: any,
    rowData: string[],
    columnWidths: number[],
    pageWidth: number,
    margin: number,
  ): number {
    let maxLines = 1;
    rowData.forEach((cellData: string, index: number) => {
      const lines = doc.splitTextToSize(cellData, columnWidths[index] - 4);
      maxLines = Math.max(maxLines, lines.length);
    });
    return Math.max(7, maxLines * 4 + 3);
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
        this.pdsService.downloadFacultyPDS(faculty.faculty_id).subscribe({
          next: (blob) => {
            this.loading.set(false);
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            link.download = `PDS_${faculty.last_name}_${faculty.first_name}_${dateStr}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);

            Swal.fire({
              icon: 'success',
              title: 'Download Complete',
              text: 'PDS file has been downloaded successfully.',
              timer: 2000,
              showConfirmButton: false,
            });
          },
          error: (error) => {
            this.loading.set(false);
            console.error('Download PDS error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Download Failed',
              text: error.error?.message || 'Failed to download PDS file.',
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
        // Show loading
        Swal.fire({
          title: 'Generating PDF...',
          text: 'Please wait while we fetch the profile data',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Fetch faculty profile data
        this.facultyProfileService.getFacultyFullProfile(faculty.faculty_id).subscribe({
          next: (profileData) => {
            Swal.close();
            this.generateFacultyProfilePDF(faculty, profileData);
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

  private generateFacultyProfilePDF(faculty: Faculty, profileData: any) {
    // Helper function to format date
    const formatDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Helper function to calculate age
    const calculateAge = (birthDate: string | null | undefined): number => {
      if (!birthDate) return 0;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // Extract data from profile
    const personal = profileData.personal || {};
    const academic = profileData.academic || [];
    const employment = profileData.employment || [];
    const eligibilities = profileData.eligibilities || [];
    const coursesHandled = profileData.coursesHandled || [];

    // Get education by level
    const undergraduate = academic.find((edu: any) => edu.level === 'Undergraduate');
    const masters = academic.find((edu: any) => edu.level === 'Masters');
    const doctorate = academic.find((edu: any) => edu.level === 'Doctorate');

    // Get current employment
    const currentEmployment = employment.find((emp: any) => emp.is_current) || employment[0];

    // Determine role (Research Coordinator or Instructor)
    const role = currentEmployment?.position_title || 'Instructor';

    // Format faculty name for header (FIRST MIDDLE-INITIAL. LAST)
    const middleInitial = (faculty.middle_name || personal.middle_name || '').charAt(0);
    const headerName = `${(faculty.first_name || personal.first_name || '').toUpperCase()} ${middleInitial ? middleInitial.toUpperCase() + '.' : ''} ${(faculty.last_name || personal.last_name || '').toUpperCase()}`.trim();

    // Get birth date and age
    const birthDate = personal.date_of_birth;
    const age = calculateAge(birthDate);
    const formattedBirthDate = formatDate(birthDate);

    const facultyName = `${faculty.first_name} ${faculty.middle_name || ''} ${faculty.last_name}`.trim();
    
    // Create HTML template matching the exact design from the image
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Faculty Profile - ${facultyName}</title>
        <style>
          @page {
            size: 8.5in 13in;
            margin: 0;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.3;
            color: #000;
            background: white;
          }
          
          .page {
            width: 8.5in;
            height: 13in;
            position: relative;
            background: white;
          }
          
          /* Top colored design */
          .top-design {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 120px;
            overflow: hidden;
          }
          
          .orange-section {
            position: absolute;
            top: 0;
            left: 0;
            width: 50%;
            height: 120px;
            background: #FF6B35;
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
          }
          
          .blue-section {
            position: absolute;
            top: 0;
            left: 35%;
            width: 40%;
            height: 120px;
            background: #1E88E5;
            clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%);
          }
          
          .red-section {
            position: absolute;
            top: 0;
            right: 0;
            width: 35%;
            height: 120px;
            background: #E53935;
            clip-path: polygon(15% 0, 100% 0, 100% 100%, 0 100%);
          }
          
          /* Header content */
          .header-content {
            position: relative;
            padding: 30px 40px;
            display: flex;
            align-items: flex-start;
            gap: 25px;
            z-index: 10;
          }
          
          .photo-box {
            width: 180px;
            height: 220px;
            background: #2C2C2C;
            border: 3px solid white;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 60px;
            font-weight: bold;
          }
          
          .header-text {
            flex: 1;
            padding-top: 10px;
          }
          
          .faculty-title {
            font-size: 36px;
            font-weight: bold;
            color: #8B0000;
            margin-bottom: 8px;
            letter-spacing: 2px;
          }
          
          .faculty-name {
            font-size: 22px;
            font-weight: bold;
            color: #000;
            margin-bottom: 4px;
          }
          
          .faculty-position {
            font-size: 14px;
            color: #000;
            margin-bottom: 10px;
          }
          
          .faculty-role {
            font-size: 13px;
            font-weight: bold;
            color: #000;
            margin-bottom: 2px;
          }
          
          .faculty-department {
            font-size: 12px;
            color: #000;
            margin-bottom: 12px;
          }
          
          .contact-info {
            font-size: 11px;
            color: #000;
          }
          
          .contact-info div {
            margin-bottom: 2px;
          }
          
          .contact-label {
            font-weight: bold;
          }
          
          /* Divider line */
          .divider {
            margin: 0 40px;
            height: 3px;
            background: #8B0000;
          }
          
          /* Content sections */
          .content {
            padding: 25px 40px;
          }
          
          .section {
            margin-bottom: 25px;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #8B0000;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          
          .info-label {
            width: 200px;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
            font-size: 10pt;
          }
          
          .info-value {
            flex: 1;
            color: #000;
            font-size: 10pt;
          }
          
          .education-item {
            margin-bottom: 15px;
          }
          
          .education-level {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11pt;
            margin-bottom: 3px;
          }
          
          .education-details {
            font-size: 10pt;
            color: #333;
            line-height: 1.4;
          }
          
          .list-item {
            margin-bottom: 5px;
            padding-left: 20px;
            position: relative;
            font-size: 10pt;
          }
          
          .list-item:before {
            content: "•";
            position: absolute;
            left: 5px;
            font-weight: bold;
          }
          
          /* Footer */
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: #1E88E5;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12pt;
            font-weight: bold;
            letter-spacing: 2px;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Top colored design -->
          <div class="top-design">
            <div class="orange-section"></div>
            <div class="blue-section"></div>
            <div class="red-section"></div>
          </div>
          
          <!-- Header with photo and info -->
          <div class="header-content">
            <div class="photo-box">
              ${faculty.first_name.charAt(0)}${faculty.last_name.charAt(0)}
            </div>
            <div class="header-text">
              <div class="faculty-title">FACULTY PROFILE</div>
              <div class="faculty-name">${headerName}</div>
              <div class="faculty-position">${faculty.position_level || 'Assistant Professor IV'}</div>
              <div class="faculty-role">${role}</div>
              <div class="faculty-department">College of Engineering Technology</div>
              <div class="contact-info">
                <div><span class="contact-label">Contact Number:</span> ${personal.mobile_primary || faculty.contact_number || 'N/A'}</div>
                <div><span class="contact-label">Email Address:</span> ${personal.email_primary || faculty.email || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <!-- Divider -->
          <div class="divider"></div>
          
          <!-- Content -->
          <div class="content">
            <!-- Personal Information -->
            <div class="section">
              <div class="section-title">PERSONAL INFORMATION</div>
              <div class="info-row">
                <div class="info-label">FIRST NAME</div>
                <div class="info-value">${personal.first_name || faculty.first_name || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">MIDDLE NAME</div>
                <div class="info-value">${personal.middle_name || faculty.middle_name || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">LAST NAME</div>
                <div class="info-value">${personal.last_name || faculty.last_name || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">ACADEMIC RANK</div>
                <div class="info-value">${faculty.position_level || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">EMPLOYMENT STATUS</div>
                <div class="info-value">${currentEmployment?.employment_status || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">BIRTH DATE</div>
                <div class="info-value">${formattedBirthDate || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">AGE</div>
                <div class="info-value">${age > 0 ? age + ' years old' : 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">CIVIL STATUS</div>
                <div class="info-value">${personal.civil_status || 'N/A'}</div>
              </div>
            </div>
            
            <!-- Education -->
            <div class="section">
              <div class="section-title">EDUCATION</div>
              ${undergraduate ? `
              <div class="education-item">
                <div class="education-level">UNDERGRADUATE</div>
                <div class="education-details">
                  <strong>${undergraduate.degree_course || 'N/A'}</strong><br>
                  ${undergraduate.school_name || 'N/A'}<br>
                  ${undergraduate.year_graduated || 'N/A'}
                </div>
              </div>
              ` : '<div class="education-item"><div class="education-level">UNDERGRADUATE</div><div class="education-details">No data available</div></div>'}
              
              ${masters ? `
              <div class="education-item">
                <div class="education-level">MASTER\'S</div>
                <div class="education-details">
                  <strong>${masters.degree_course || 'N/A'}</strong><br>
                  ${masters.school_name || 'N/A'}<br>
                  ${masters.year_graduated || 'N/A'}
                </div>
              </div>
              ` : '<div class="education-item"><div class="education-level">MASTER\'S</div><div class="education-details">No data available</div></div>'}
              
              ${doctorate ? `
              <div class="education-item">
                <div class="education-level">DOCTORATE</div>
                <div class="education-details">
                  <strong>${doctorate.degree_course || 'N/A'}</strong><br>
                  ${doctorate.school_name || 'N/A'}<br>
                  ${doctorate.year_graduated ? doctorate.year_graduated : '(Complete Academic Requirements)'}
                </div>
              </div>
              ` : '<div class="education-item"><div class="education-level">DOCTORATE</div><div class="education-details">No data available</div></div>'}
            </div>
            
            <!-- Eligibilities -->
            <div class="section">
              <div class="section-title">ELIGIBILITIES</div>
              ${eligibilities.length > 0 
                ? eligibilities.map((elig: any) => `<div class="list-item">${elig.career_service || elig.title || elig.name || 'N/A'}</div>`).join('')
                : '<div class="list-item">No eligibilities recorded</div>'}
            </div>
            
            <!-- Courses Handled -->
            <div class="section">
              <div class="section-title">COURSES HANDLED</div>
              ${coursesHandled.length > 0 
                ? coursesHandled.map((course: string) => `<div class="list-item">${course}</div>`).join('')
                : '<div class="list-item">No courses recorded</div>'}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            FACULTY PROFILE
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a hidden iframe to print
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      // Wait for content to load then print
      printFrame.onload = () => {
        setTimeout(() => {
          printFrame.contentWindow?.print();
          
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    }
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
