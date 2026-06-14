import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import {
  OrganizationService,
  OrganizationMember,
  PositionTemplate,
} from '../../../services/organization/organization.service';
import {
  AcademicYearService,
  AcademicYearsResponse,
} from '../../../services/core/academic-year.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-organization-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-members.html',
})
export class OrganizationMembersComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private academicYearService = inject(AcademicYearService);

  // Expose Math for template
  Math = Math;

  // State
  members = signal<OrganizationMember[]>([]);
  positions = signal<PositionTemplate[]>([]);
  academicYears = signal<any[]>([]);
  advisers = signal<any[]>([]);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  itemsPerPage = 20;

  // Filters
  searchQuery = signal('');
  selectedAcademicYear = signal<number | undefined>(undefined);
  selectedPosition = signal<string | undefined>(undefined);
  selectedSemester = signal<string | undefined>(undefined);
  showActiveOnly = signal(true);

  // View mode
  viewMode = signal<'list' | 'officers'>('list');

  // Modals
  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showBulkUploadModal = signal(false);
  showEditAdviserModal = signal(false);
  selectedMember = signal<OrganizationMember | null>(null);
  selectedAdviser = signal<any | null>(null);

  // Form data
  memberForm = signal({
    sr_code: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    year_level: '1st Year' as '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | '5th Year',
    position: '',
    parent_member_id: undefined as number | undefined,
    academic_year_id: undefined as number | undefined,
    term_start_date: '',
    term_end_date: '',
    is_active: true,
  });

  // Adviser-specific form data
  adviserForm = signal({
    academic_rank: '',
    employment_status: '',
    length_of_service: '',
    educational_attainment: '',
    campus: '',
    telephone_number: '',
    birth_date: '',
    age: undefined as number | undefined,
    civil_status: '',
    home_address: '',
    signature_url: '',
    notes: '',
  });

  // Photo upload
  selectedPhoto = signal<File | null>(null);
  photoPreview = signal<string | null>(null);
  selectedSignature = signal<File | null>(null);

  // Bulk upload
  bulkUploadForm = signal({
    file: null as File | null,
    academic_year_id: undefined as number | undefined,
    section: '',
  });
  uploadResults = signal<any>(null);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    this.loadMembers();
    this.loadPositionTemplates();
    this.loadAcademicYears();
  }

  loadMembers() {
    this.loading.set(true);
    this.errorMessage.set('');

    console.log('Loading members, viewMode:', this.viewMode());

    // Determine position filter based on view mode
    let positionFilter = this.selectedPosition();

    if (this.viewMode() === 'list') {
      // Organization Population - show only regular members (position = "Member")
      positionFilter = 'Member';
      console.log('List view - filtering for position: Member');
    } else if (this.viewMode() === 'officers') {
      // Officers Profile - exclude "Member" position
      // We need to fetch all and filter client-side since backend doesn't support "NOT EQUAL"
      positionFilter = undefined;
      console.log('Officers view - fetching all positions');
    }

    const limit = this.viewMode() === 'officers' ? 999 : this.itemsPerPage;

    console.log('API call params:', {
      page: this.currentPage(),
      limit,
      search: this.searchQuery(),
      academicYearId: this.selectedAcademicYear(),
      position: positionFilter,
      isActive: this.showActiveOnly() ? true : undefined,
    });

    this.organizationService
      .getMembers(
        this.currentPage(),
        limit,
        this.searchQuery(),
        this.selectedAcademicYear(),
        positionFilter,
        this.showActiveOnly() ? true : undefined,
      )
      .subscribe({
        next: (response) => {
          console.log('API response:', response);

          // If in officers view, filter out "Member" position
          if (this.viewMode() === 'officers') {
            const filteredMembers = response.members.filter(
              (m) => m.position.toLowerCase() !== 'member',
            );
            console.log('Filtered officers:', filteredMembers.length);
            this.members.set(filteredMembers);
            this.totalItems.set(filteredMembers.length);
            this.totalPages.set(1); // Single page for officers view
          } else {
            // Organization Population view - already filtered to "Member" position
            console.log('Members loaded:', response.members.length);
            this.members.set(response.members);
            this.totalPages.set(response.totalPages);
            this.totalItems.set(response.totalItems);
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('API error:', error);
          this.errorMessage.set(error.error?.message || 'Failed to load members');
          this.loading.set(false);
        },
      });
  }

  loadPositionTemplates() {
    this.organizationService.getPositionTemplates().subscribe({
      next: (response) => {
        console.log('Loaded positions:', response.positions);
        this.positions.set(response.positions);
      },
      error: (error) => {
        console.error('Failed to load positions:', error);
        this.errorMessage.set('Failed to load position options');
      },
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAcademicYears().subscribe({
      next: (response: AcademicYearsResponse) => {
        this.academicYears.set(response.academicYears);
      },
      error: (error: any) => {
        console.error('Failed to load academic years:', error);
      },
    });
  }

  toggleViewMode(mode: 'list' | 'officers') {
    this.viewMode.set(mode);
    this.currentPage.set(1);
    this.loadMembers();

    if (mode === 'officers') {
      this.loadAdvisers();
    }
  }

  loadAdvisers() {
    this.organizationService.getAdvisers().subscribe({
      next: (response) => {
        this.advisers.set(response.advisers.filter((a) => a.is_active));
      },
      error: (error) => {
        console.error('Failed to load advisers:', error);
      },
    });
  }

  openAddModal() {
    this.resetForm();
    // If in Organization Population view, automatically set position to "Member"
    if (this.viewMode() === 'list') {
      this.memberForm.set({
        ...this.memberForm(),
        position: 'Member',
      });
    }
    this.showAddModal.set(true);
  }

  openEditModal(member: OrganizationMember) {
    this.selectedMember.set(member);
    this.memberForm.set({
      sr_code: member.sr_code,
      first_name: member.first_name,
      middle_name: member.middle_name || '',
      last_name: member.last_name,
      email: member.email || '',
      contact_number: member.contact_number || '',
      year_level: member.year_level,
      position: member.position,
      parent_member_id: member.parent_member_id,
      academic_year_id: member.academic_year_id,
      term_start_date: member.term_start_date,
      term_end_date: member.term_end_date || '',
      is_active: member.is_active,
    });
    this.showEditModal.set(true);
  }

  openDeleteModal(member: OrganizationMember) {
    this.selectedMember.set(member);
    this.showDeleteModal.set(true);
  }

  openEditAdviserModal(adviser: any) {
    this.selectedAdviser.set(adviser);
    // Populate basic form with adviser data
    this.memberForm.set({
      sr_code: adviser.Faculty?.employee_id || '',
      first_name: adviser.Faculty?.first_name || '',
      middle_name: adviser.Faculty?.middle_name || '',
      last_name: adviser.Faculty?.last_name || '',
      email: adviser.Faculty?.email || '',
      contact_number: adviser.Faculty?.contact_number || '',
      year_level: '1st Year',
      position: 'Adviser',
      parent_member_id: undefined,
      academic_year_id: undefined,
      term_start_date: '',
      term_end_date: '',
      is_active: true,
    });
    // Populate adviser-specific form
    this.adviserForm.set({
      academic_rank: adviser.Faculty?.academic_rank || '',
      employment_status: adviser.Faculty?.employment_status || '',
      length_of_service: adviser.length_of_service || '',
      educational_attainment: adviser.Faculty?.educational_attainment || '',
      campus: adviser.Faculty?.campus || '',
      telephone_number: adviser.Faculty?.telephone_number || '',
      birth_date: adviser.Faculty?.birth_date || '',
      age: adviser.Faculty?.age || undefined,
      civil_status: adviser.Faculty?.civil_status || '',
      home_address: adviser.Faculty?.home_address || '',
      signature_url: adviser.Faculty?.signature_url || '',
      notes: adviser.notes || '',
    });
    this.showEditAdviserModal.set(true);
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteModal.set(false);
    this.showBulkUploadModal.set(false);
    this.showEditAdviserModal.set(false);
    this.selectedMember.set(null);
    this.selectedAdviser.set(null);
    this.resetForm();
    this.uploadResults.set(null);
  }

  resetForm() {
    this.memberForm.set({
      sr_code: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      contact_number: '',
      year_level: '1st Year',
      position: '',
      parent_member_id: undefined,
      academic_year_id: undefined,
      term_start_date: '',
      term_end_date: '',
      is_active: true,
    });
    this.adviserForm.set({
      academic_rank: '',
      employment_status: '',
      length_of_service: '',
      educational_attainment: '',
      campus: '',
      telephone_number: '',
      birth_date: '',
      age: undefined,
      civil_status: '',
      home_address: '',
      signature_url: '',
      notes: '',
    });
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
    this.selectedSignature.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage.set('Please select a valid image file (JPG, JPEG, or PNG)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.errorMessage.set('Image size must be less than 5MB');
        return;
      }

      this.selectedPhoto.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
      this.errorMessage.set('');
    }
  }

  onSignatureSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage.set('Please select a valid image file (JPG, JPEG, or PNG)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.errorMessage.set('Image size must be less than 5MB');
        return;
      }

      this.selectedSignature.set(file);
      this.errorMessage.set('');
    }
  }

  removePhoto() {
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
  }

  triggerPhotoUpload() {
    const fileInput = document.getElementById('photoUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  saveMember() {
    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();

    // Append all form fields
    formData.append('sr_code', form.sr_code);
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', form.email || '');
    formData.append('contact_number', form.contact_number || '');
    formData.append('year_level', form.year_level);
    formData.append('position', form.position);
    formData.append('academic_year_id', form.academic_year_id?.toString() || '');
    formData.append('term_start_date', form.term_start_date);
    formData.append('term_end_date', form.term_end_date || '');
    formData.append('is_active', form.is_active.toString());

    if (form.parent_member_id) {
      formData.append('parent_member_id', form.parent_member_id.toString());
    }

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
    }

    this.organizationService.createMemberWithPhoto(formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Member added successfully',
          confirmButtonColor: '#16a34a',
          timer: 2000,
          showConfirmButton: false,
        });
        this.closeModals();
        this.loadMembers();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to add officer');
        this.loading.set(false);
      },
    });
  }

  updateMember() {
    const memberId = this.selectedMember()?.member_id;
    if (!memberId) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();

    // Append all form fields
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', form.email || '');
    formData.append('contact_number', form.contact_number || '');
    formData.append('year_level', form.year_level);
    formData.append('position', form.position);
    formData.append('term_end_date', form.term_end_date || '');
    formData.append('is_active', form.is_active.toString());

    if (form.parent_member_id) {
      formData.append('parent_member_id', form.parent_member_id.toString());
    }

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
    }

    this.organizationService.updateMemberWithPhoto(memberId, formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: response.message || 'Member updated successfully',
          confirmButtonColor: '#16a34a',
          timer: 2000,
          showConfirmButton: false,
        });
        this.closeModals();
        this.loadMembers();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to update member');
        this.loading.set(false);
      },
    });
  }

  updateAdviser() {
    const adviserId = this.selectedAdviser()?.adviser_id;
    if (!adviserId) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();
    const adviserFormData = this.adviserForm();

    // Append basic name fields
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', form.email || '');
    formData.append('contact_number', form.contact_number || '');

    // Append adviser-specific fields
    formData.append('academic_rank', adviserFormData.academic_rank || '');
    formData.append('employment_status', adviserFormData.employment_status || '');
    formData.append('length_of_service', adviserFormData.length_of_service || '');
    formData.append('educational_attainment', adviserFormData.educational_attainment || '');
    formData.append('campus', adviserFormData.campus || '');
    formData.append('telephone_number', adviserFormData.telephone_number || '');
    formData.append('birth_date', adviserFormData.birth_date || '');
    formData.append('age', adviserFormData.age?.toString() || '');
    formData.append('civil_status', adviserFormData.civil_status || '');
    formData.append('home_address', adviserFormData.home_address || '');

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
    }

    this.organizationService.updateAdviserPhoto(adviserId, formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: response.message || 'Adviser updated successfully',
          confirmButtonColor: '#16a34a',
          timer: 2000,
          showConfirmButton: false,
        });
        this.closeModals();
        this.loadAdvisers();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to update adviser');
        this.loading.set(false);
      },
    });
  }

  deleteMember() {
    const memberId = this.selectedMember()?.member_id;
    if (!memberId) return;

    Swal.fire({
      title: 'Delete Member?',
      text: 'Are you sure you want to delete this member? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.errorMessage.set('');

        this.organizationService.deleteMember(memberId).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: response.message || 'Member deleted successfully',
              confirmButtonColor: '#16a34a',
              timer: 2000,
              showConfirmButton: false,
            });
            this.closeModals();
            this.loadMembers();
          },
          error: (error) => {
            this.errorMessage.set(error.error?.message || 'Failed to delete member');
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to delete member',
              confirmButtonColor: '#dc2626',
            });
          },
        });
      }
    });
  }

  applyFilters() {
    this.currentPage.set(1);
    this.loadMembers();
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.loadMembers();
  }

  getMemberFullName(member: OrganizationMember): string {
    const middle = member.middle_name ? ` ${member.middle_name} ` : ' ';
    return `${member.first_name}${middle}${member.last_name}`;
  }

  getPotentialSupervisors(): OrganizationMember[] {
    return this.members().filter(
      (m) =>
        m.is_active &&
        m.position.toLowerCase() !== 'member' && // Exclude regular members
        (!this.selectedMember() || m.member_id !== this.selectedMember()?.member_id),
    );
  }

  getPresident(): OrganizationMember | undefined {
    return this.members().find((m) => m.position.toLowerCase() === 'president' && m.is_active);
  }

  getOfficers(): OrganizationMember[] {
    return this.members().filter(
      (m) =>
        m.is_active &&
        m.position.toLowerCase() !== 'member' &&
        m.position.toLowerCase() !== 'president',
    );
  }

  getInitials(member: OrganizationMember): string {
    return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  }

  getAdviserInitials(adviser: any): string {
    if (!adviser.Faculty) return 'FA';
    return `${adviser.Faculty.first_name.charAt(0)}${adviser.Faculty.last_name.charAt(0)}`.toUpperCase();
  }

  getAdviserFullName(adviser: any): string {
    if (!adviser.Faculty) return 'Unknown';
    const middle = adviser.Faculty.middle_name ? ` ${adviser.Faculty.middle_name} ` : ' ';
    return `${adviser.Faculty.first_name}${middle}${adviser.Faculty.last_name}`;
  }

  getRandomColor(seed: string): string {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
    ];
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }

  getPhotoUrl(photoUrl: string | undefined): string | null {
    if (!photoUrl) return null;
    // If it's already a full URL, return as-is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    // Otherwise, prepend the backend base URL
    return `${environment.serverUrl}${photoUrl}`;
  }

  onImageError(event: Event): void {
    // Hide the broken image and show the fallback
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }

  // Bulk upload methods
  openBulkUploadModal() {
    this.bulkUploadForm.set({
      file: null,
      academic_year_id: undefined,
      section: '',
    });
    this.uploadResults.set(null);
    this.showBulkUploadModal.set(true);
  }

  downloadTemplate() {
    this.organizationService.downloadMembersTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'organization-members-template.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.errorMessage.set('Failed to download template');
        setTimeout(() => this.errorMessage.set(''), 3000);
      },
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.bulkUploadForm.set({
        ...this.bulkUploadForm(),
        file: file,
      });
    }
  }

  uploadMembers() {
    const form = this.bulkUploadForm();

    if (!form.file || !form.academic_year_id || !form.section) {
      this.errorMessage.set('Please fill all required fields and select a file');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('academic_year_id', form.academic_year_id.toString());
    formData.append('section', form.section);

    this.organizationService.bulkUploadMembers(formData).subscribe({
      next: (response) => {
        this.uploadResults.set(response.results);
        this.successMessage.set(response.message);
        this.loading.set(false);
        this.loadMembers();

        // Close modal after successful upload
        this.showBulkUploadModal.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to upload members');
        this.loading.set(false);
      },
    });
  }
}
