import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { OrganizationService } from '../../../services/organization/organization.service';
import { OrganizationEventService } from '../../../services/organization/organization-event.service';
import { EventAnalyticsService, SDGEventData } from '../../../services/organization/event-analytics.service';
import { CVLAttachmentService, CVLAttachment } from '../../../services/organization/cvl-attachment.service';
import { OrganizationMembersComponent } from '../../organization/members/organization-members';
import { OrganizationDocumentsComponent } from '../../organization/documents/organization-documents';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import { SDGEventsChartComponent } from '../../../shared/components/sdg-events-chart/sdg-events-chart';
import Swal from 'sweetalert2';

interface OrganizationStats {
  approvedEvents: number;
  pendingEvents: number;
  totalMembers: number;
  activeMembers?: number;
  documentsSubmitted: number;
  documentsPending: number;
  documentsApproved: number;
  documentsRejected: number;
  membersByPosition: { position: string; count: number }[];
  membersByYearLevel: { year: string; count: number }[];
}

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OrganizationMembersComponent,
    OrganizationDocumentsComponent,
    ChangePasswordModal,
    SDGEventsChartComponent,
  ],
  templateUrl: './organization.html',
})
export class OrganizationDashboard implements OnInit {
  authService = inject(Auth);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private organizationService = inject(OrganizationService);
  private eventService = inject(OrganizationEventService);
  private eventAnalyticsService = inject(EventAnalyticsService);
  private cvlAttachmentService = inject(CVLAttachmentService);

  activeTab = signal<'dashboard' | 'members' | 'documents' | 'advisers' | 'events' | 'cvl-attachments'>('dashboard');
  dashboardTab = signal<'analytics' | 'demographics'>('analytics');
  isSidebarOpen = signal(true);
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);

  organizationName = signal('');
  advisers = signal<any[]>([]);
  sdgEventData = signal<SDGEventData[]>([]);
  stats = signal<OrganizationStats>({
    approvedEvents: 0,
    pendingEvents: 0,
    totalMembers: 0,
    documentsSubmitted: 0,
    documentsPending: 0,
    documentsApproved: 0,
    documentsRejected: 0,
    membersByPosition: [],
    membersByYearLevel: [],
  });
  demographics = signal<any>({
    maleCount: 0,
    femaleCount: 0,
    malePercentage: 0,
    femalePercentage: 0,
    byProgram: [],
  });
  demographicsAcademicYear = signal<number | undefined>(undefined);
  demographicsSemester = signal<string | undefined>(undefined);
  loading = signal(false);

  // CVL Attachments
  cvlAttachments = signal<CVLAttachment[]>([]);
  showCVLAttachmentModal = signal(false);
  showCVLViewModal = signal(false);
  selectedCVLAttachment = signal<CVLAttachment | null>(null);
  cvlForm = signal({
    attachment: '',
    dateCreated: '',
    semester: '',
  });
  cvlUploadedFiles = signal<File[]>([]);
  cvlExistingFiles = signal<any[]>([]); // For storing existing uploaded files when editing
  cvlFormSubmitted = signal(false);
  cvlLoading = signal(false);
  cvlErrorMessage = signal('');
  cvlSuccessMessage = signal('');
  cvlEditMode = signal(false);
  cvlEditType = signal<string | null>(null); // Store attachment type for editing

  ngOnInit() {
    const userInfo = this.authService.currentUser();
    if (userInfo && userInfo.profile && userInfo.profile.organization_name) {
      this.organizationName.set(userInfo.profile.organization_name);
    }
    this.loadAdvisers();
    this.loadStatistics();
    this.loadSDGEventData();
  }

  loadSDGEventData() {
    // Changed from getEventsBySDGPerYear to getReportsBySDGPerYear
    // Now gets SDG data from report submissions instead of events
    this.eventAnalyticsService.getReportsBySDGPerYear().subscribe({
      next: (data) => {
        this.sdgEventData.set(data);
      },
      error: (error) => {
        console.error('Failed to load SDG report data:', error);
      },
    });
  }

  selectTab(tab: 'dashboard' | 'members' | 'documents' | 'advisers' | 'events' | 'cvl-attachments') {
    this.activeTab.set(tab);
    if (tab === 'advisers') {
      this.loadAdvisers();
    } else if (tab === 'dashboard') {
      this.loadStatistics();
      if (this.dashboardTab() === 'demographics') {
        this.loadDemographics();
      }
    } else if (tab === 'cvl-attachments') {
      this.loadCVLAttachments();
    }
  }

  selectDashboardTab(tab: 'analytics' | 'demographics') {
    this.dashboardTab.set(tab);
    if (tab === 'demographics') {
      this.loadDemographics();
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  getPageTitle(): string {
    switch (this.activeTab()) {
      case 'dashboard':
        return 'Dashboard';
      case 'members':
        return 'Members Management';
      case 'documents':
        return 'Document Submission';
      case 'events':
        return 'Events Management';
      case 'advisers':
        return 'Organization Advisers';
      case 'cvl-attachments':
        return 'CVL Attachments';
      default:
        return 'Organization Portal';
    }
  }

  loadAdvisers() {
    this.organizationService.getAdvisers().subscribe({
      next: (response) => {
        this.advisers.set(response.advisers);
      },
      error: (error) => {
        console.error('Failed to load advisers:', error);
      },
    });
  }

  loadStatistics() {
    this.loading.set(true);

    // Load events statistics
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.stats.update((s) => ({
          ...s,
          approvedEvents: events.length,
          pendingEvents: 0,
        }));
      },
      error: (error) => {
        console.error('Failed to load events:', error);
      },
    });

    // Load members and documents to calculate statistics
    this.organizationService.getMembers(1, 999).subscribe({
      next: (response) => {
        // Exclude advisers from member statistics
        const members = response.members.filter((m: any) => 
          m.position && m.position.toLowerCase() !== 'adviser' && m.position.toLowerCase() !== 'advisor'
        );
        const activeMembers = members.filter((m: any) => m.is_active).length;

        // Count by position (excluding null/undefined and advisers)
        const positionCounts: { [key: string]: number } = {};
        members.forEach((m: any) => {
          if (m.position && m.position.trim() !== '') {
            positionCounts[m.position] = (positionCounts[m.position] || 0) + 1;
          }
        });

        // Count by year level (excluding null/undefined)
        const yearCounts: { [key: string]: number } = {};
        members.forEach((m: any) => {
          if (m.year_level && m.year_level.trim() !== '') {
            yearCounts[m.year_level] = (yearCounts[m.year_level] || 0) + 1;
          }
        });

        this.stats.update((s) => ({
          ...s,
          totalMembers: members.length,
          activeMembers,
          membersByPosition: Object.entries(positionCounts).map(([position, count]) => ({
            position,
            count,
          })),
          membersByYearLevel: Object.entries(yearCounts).map(([year, count]) => ({
            year,
            count,
          })),
        }));
      },
      error: (error) => {
        console.error('Failed to load members:', error);
      },
    });

    this.organizationService.getDocuments(1, 999).subscribe({
      next: (response) => {
        const documents = response.documents;
        this.stats.update((s) => ({
          ...s,
          documentsSubmitted: documents.length,
          documentsPending: documents.filter((d: any) => d.status === 'pending').length,
          documentsApproved: documents.filter((d: any) => d.status === 'approved').length,
          documentsRejected: documents.filter((d: any) => d.status === 'rejected').length,
        }));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load documents:', error);
        this.loading.set(false);
      },
    });
  }

  loadDemographics() {
    this.organizationService.getDemographics().subscribe({
      next: (data) => {
        this.demographics.set(data);
      },
      error: (error) => {
        console.error('Failed to load demographics:', error);
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getAdviserFullName(adviser: any): string {
    const faculty = adviser.Faculty;
    if (!faculty) return 'N/A';
    const middle = faculty.middle_name ? ` ${faculty.middle_name} ` : ' ';
    return `${faculty.first_name}${middle}${faculty.last_name}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getProgramColor(index: number): string {
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

  // CVL Attachment Methods
  loadCVLAttachments() {
    this.cvlAttachmentService.getCVLAttachments().subscribe({
      next: (response) => {
        console.log('CVL Attachments loaded:', response.cvlAttachments);
        this.cvlAttachments.set(response.cvlAttachments);
      },
      error: (error) => {
        console.error('Failed to load CVL attachments:', error);
        this.cvlErrorMessage.set('Failed to load CVL attachments');
      },
    });
  }

  openCVLAttachmentModal() {
    this.showCVLAttachmentModal.set(true);
    this.cvlEditMode.set(false);
    this.cvlEditType.set(null);
    this.resetCVLForm();
  }

  closeCVLAttachmentModal() {
    this.showCVLAttachmentModal.set(false);
    this.resetCVLForm();
  }

  closeCVLViewModal() {
    this.showCVLViewModal.set(false);
    this.selectedCVLAttachment.set(null);
  }

  resetCVLForm() {
    this.cvlForm.set({
      attachment: '',
      dateCreated: '',
      semester: '',
    });
    this.cvlUploadedFiles.set([]);
    this.cvlExistingFiles.set([]);
    this.cvlFormSubmitted.set(false);
    this.cvlErrorMessage.set('');
    this.cvlSuccessMessage.set('');
  }

  editCVLAttachment(attachment: CVLAttachment) {
    this.cvlEditMode.set(true);
    this.cvlEditType.set(attachment.attachment);
    this.cvlForm.set({
      attachment: attachment.attachment,
      dateCreated: attachment.date_created || '',
      semester: attachment.semester || '',
    });
    // Load existing file
    this.cvlExistingFiles.set([{
      id: attachment.id,
      name: attachment.filename,
      size: attachment.file_size
    }]);
    this.cvlUploadedFiles.set([]); // Clear new uploads
    this.showCVLAttachmentModal.set(true);
  }

  viewCVLAttachment(attachment: CVLAttachment) {
    this.selectedCVLAttachment.set(attachment);
    this.showCVLViewModal.set(true);
  }

  downloadCVLAttachment(attachment: CVLAttachment) {
    this.cvlAttachmentService.downloadCVLFile(attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.filename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download failed:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to download attachment',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  downloadExistingFile(file: any) {
    if (file.id) {
      this.cvlAttachmentService.downloadCVLFile(file.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Download failed:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to download file',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'OK',
          });
        },
      });
    }
  }

  removeExistingFile(index: number) {
    this.cvlExistingFiles.update(files => files.filter((_, i) => i !== index));
  }

  deleteCVLAttachment(attachmentId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this attachment?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.cvlAttachmentService.deleteCVLAttachmentById(attachmentId).subscribe({
          next: () => {
            this.cvlAttachments.update(attachments => 
              attachments.filter(a => a.id !== attachmentId)
            );
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'CVL attachment has been deleted successfully',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK',
            });
          },
          error: (error) => {
            console.error('Delete failed:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: error.error?.message || 'Failed to delete CVL attachment',
              confirmButtonColor: '#ef4444',
              confirmButtonText: 'OK',
            });
          },
        });
      }
    });
  }

  triggerCVLFileInput() {
    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onCVLFilesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.addCVLFiles(files);
  }

  addCVLFiles(files: File[]) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        this.cvlErrorMessage.set(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        this.cvlErrorMessage.set(`File ${file.name} has invalid type`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      this.cvlUploadedFiles.update(current => [...current, ...validFiles]);
      this.cvlErrorMessage.set('');
    }
  }

  removeCVLFile(index: number) {
    this.cvlUploadedFiles.update(files => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getAttachmentTitle(attachmentType: string): string {
    const titleMap: { [key: string]: string } = {
      'Attachment A': 'Commitment Letter of the Adviser',
      'Attachment B': 'Certification of Academic Qualifications',
      'Attachment C': 'Profile of Student Organization',
      'Attachment D': 'List of Members',
      'Attachment E': 'History of Student Organization',
      'Attachment F': 'Declaration of the Organization\'s Revolving Fund',
      'Attachment G': 'Preamble',
      'Attachment H': 'Student Organization\'s Adviser Profile',
      'Attachment J': 'List of Officers'
    };
    return titleMap[attachmentType] || attachmentType;
  }

  saveCVLAttachment() {
    this.cvlFormSubmitted.set(true);
    this.cvlErrorMessage.set('');
    this.cvlSuccessMessage.set('');

    // Validation - check both new uploads and existing files
    const form = this.cvlForm();
    const hasFiles = this.cvlUploadedFiles().length > 0 || this.cvlExistingFiles().length > 0;
    
    if (!form.attachment || !form.semester || !hasFiles) {
      this.cvlErrorMessage.set('Please fill in all required fields and upload at least one document');
      return;
    }

    this.cvlLoading.set(true);

    // Prepare FormData
    const formData = new FormData();
    formData.append('attachment_type', form.attachment);
    formData.append('semester', form.semester);
    if (form.dateCreated) {
      formData.append('date_created', form.dateCreated);
    }

    // Add files
    this.cvlUploadedFiles().forEach(file => {
      formData.append('documents', file);
    });

    // Call API
    const apiCall = this.cvlEditMode()
      ? this.cvlAttachmentService.updateCVLAttachment(this.cvlEditType()!, formData)
      : this.cvlAttachmentService.createCVLAttachment(formData);

    apiCall.subscribe({
      next: () => {
        this.cvlLoading.set(false);
        this.closeCVLAttachmentModal();
        this.loadCVLAttachments(); // Refresh the list
        
        Swal.fire({
          icon: 'success',
          title: this.cvlEditMode() ? 'Success!' : 'Success!',
          text: this.cvlEditMode() 
            ? 'CVL Attachment updated successfully!' 
            : 'CVL Attachment saved successfully!',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });
      },
      error: (error) => {
        this.cvlLoading.set(false);
        console.error('Save CVL attachment error:', error);
        this.cvlErrorMessage.set(error.error?.message || 'Failed to save CVL attachment');
        
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: error.error?.message || 'Failed to save CVL attachment',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK',
        });
      },
    });
  }
}
