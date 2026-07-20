import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
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
import { DropdownService } from '../../../services/core/dropdown.service';
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
  private dropdownService = inject(DropdownService);

  // Expose Math for template
  Math = Math;

  // State
  members = signal<OrganizationMember[]>([]);
  bulkUploads = signal<any[]>([]); // For displaying upload records
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

  // Client-side filtered bulk uploads for the Organization Population table.
  // Applies the search query and Term/Semester filters over the currently loaded
  // uploads. Search matches Department, Section, File Name, Year Level, Semester.
  filteredBulkUploads = computed<any[]>(() => {
    const list = this.bulkUploads();
    const query = this.searchQuery().trim().toLowerCase();
    const yearFilter = this.selectedAcademicYear();
    const semesterFilter = this.selectedSemester();

    return list.filter((u: any) => {
      // Term (academic year) filter
      if (yearFilter !== undefined && u.academic_year_id !== yearFilter) {
        return false;
      }
      // Semester filter
      if (semesterFilter && u.semester !== semesterFilter) {
        return false;
      }
      // Search across relevant text columns
      if (query) {
        const dept = (u.department || '').toString().toLowerCase();
        const section = (u.section || '').toString().toLowerCase();
        const fileName = (u.file_name || '').toString().toLowerCase();
        const yearLevel = (u.year_level || '').toString().toLowerCase();
        const semester = (u.semester || '').toString().toLowerCase();
        if (
          !dept.includes(query) &&
          !section.includes(query) &&
          !fileName.includes(query) &&
          !yearLevel.includes(query) &&
          !semester.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  });

  // Modals
  showAddModal = signal(false);
  showEditModal = signal(false);
  showBulkUploadModal = signal(false);
  showEditAdviserModal = signal(false);
  showViewModal = signal(false);
  showPreviewModal = signal(false);
  previewData = signal<any>(null);
  previewLoading = signal(false);
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
    year_level: '1st Year' as string,
    position: '',
    parent_member_id: undefined as number | undefined,
    academic_year_id: undefined as number | undefined,
    semester: '',
    term_start_date: '',
    term_end_date: '',
    is_active: true,
    course: '',
    gwa: '',
    campus: '',
    telephone_number: '',
    birth_date: '',
    age: '',
    civil_status: '' as '' | 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'SEPARATED',
    home_address: '',
  });

  // Adviser-specific form data - using model() for two-way binding
  adviserForm = signal({
    academic_rank: '',
    employment_status: '',
    length_of_service: '',
    educational_attainment: '',
    campus: '',
    contact_number: '',
    telephone_number: '',
    email: '',
    birth_date: '',
    age: undefined as number | undefined,
    civil_status: '',
    home_address: '',
    signature_url: '',
    notes: '',
  });

  // Helper method to update adviserForm
  updateAdviserForm(field: string, value: any) {
    console.log(`🔧 updateAdviserForm called: field="${field}", value="${value}", type=${typeof value}`);
    const updatedForm = {
      ...this.adviserForm(),
      [field]: value
    };
    this.adviserForm.set(updatedForm);
    console.log(`✅ adviserForm updated. New ${field} value:`, value);
    console.log(`📊 FULL adviserForm state now:`, this.adviserForm());
  }

  // Helper method to update memberForm
  updateMemberForm(field: string, value: any) {
    console.log(`🔧 updateMemberForm called: field="${field}", value="${value}", type=${typeof value}`);
    const updatedForm = {
      ...this.memberForm(),
      [field]: value
    };
    this.memberForm.set(updatedForm);
    console.log(`✅ memberForm updated. New ${field} value:`, value);
    console.log(`📊 FULL memberForm state now:`, this.memberForm());
  }

  // Photo upload
  selectedPhoto = signal<File | null>(null);
  photoPreview = signal<string | null>(null);
  selectedSignature = signal<File | null>(null);
  signaturePreview = signal<string | null>(null);

  // Bulk upload
  bulkUploadForm = signal({
    file: null as File | null,
    academic_year_id: undefined as number | undefined,
    section: '',
    year_level: '' as '' | '1st Year' | '2nd Year' | '3rd Year' | '4th Year',
    department: '',
    semester: '' as '' | '1st Semester' | '2nd Semester' | 'Summer 1' | 'Summer 2',
  });
  uploadResults = signal<any>({ total: 0, inserted: 0, updated: 0, skipped: 0, errors: [] });

  // Bulk upload edit mode
  bulkUploadEditMode = signal(false);
  editingUploadId = signal<number | null>(null);
  departments = signal<any[]>([]);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    console.log('OrganizationMembersComponent initialized');
    console.log('Initial viewMode:', this.viewMode());
    
    // Load common data
    this.loadPositionTemplates();
    this.loadAcademicYears();
    this.loadDepartments();
    
    // Load data based on initial view mode
    if (this.viewMode() === 'list') {
      this.loadBulkUploads();
    } else if (this.viewMode() === 'officers') {
      this.loadMembers();
      this.loadAdvisers();
    }
  }

  loadBulkUploads() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.organizationService.getBulkUploadHistory(this.currentPage(), this.itemsPerPage).subscribe({
      next: (response) => {
        console.log('Bulk uploads loaded:', response);
        this.bulkUploads.set(response.uploads || []);
        this.totalPages.set(response.totalPages || 1);
        this.totalItems.set(response.totalItems || 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('API error loading bulk uploads:', error);
        this.bulkUploads.set([]);
        this.errorMessage.set(error.error?.message || 'Failed to load file records. Please restart the server and try again.');
        this.loading.set(false);
      },
    });
  }

  loadDepartments() {
    this.dropdownService.getDepartments().subscribe({
      next: (departments) => {
        this.departments.set(departments);
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
      },
    });
  }

  loadMembers() {
    console.log('=== loadMembers() CALLED ===');
    console.log('Current viewMode:', this.viewMode());
    console.log('Setting loading to TRUE');
    this.loading.set(true);
    this.errorMessage.set('');

    console.log('=== Loading members START ===');

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
      semester: this.selectedSemester(),
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
          console.log('=== API SUCCESS ===');
          console.log('API response:', response);
          console.log('Total members received from API:', response.members.length);

          // If in officers view, filter out "Member" position
          if (this.viewMode() === 'officers') {
            const filteredMembers = response.members.filter(
              (m) => m.position && m.position.trim() !== '' && m.position.toLowerCase() !== 'member',
            );
            console.log('Filtered officers (excluding "Member" position):', filteredMembers.length);
            console.log('Officer positions found:', filteredMembers.map(m => `${m.first_name} ${m.last_name} - ${m.position}`));
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
          
          console.log('Setting loading to FALSE');
          this.loading.set(false);
          console.log('=== Loading members COMPLETE ===');
        },
        error: (error) => {
          console.error('=== API ERROR ===');
          console.error('API error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.error?.message);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          this.errorMessage.set(error.error?.message || 'Failed to load members. Please check the console for details.');
          console.log('Setting loading to FALSE (error case)');
          this.loading.set(false);
          console.log('=== Loading members FAILED ===');
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
    console.log('Loading academic years...');
    this.academicYearService.getAcademicYears().subscribe({
      next: (response: AcademicYearsResponse) => {
        console.log('Academic Years Response:', response);
        console.log('Academic Years Array:', response.academicYears);
        console.log('Number of academic years:', response.academicYears.length);
        this.academicYears.set(response.academicYears);
        console.log('academicYears signal value:', this.academicYears());
      },
      error: (error: any) => {
        console.error('Failed to load academic years:', error);
      },
    });
  }

  toggleViewMode(mode: 'list' | 'officers') {
    console.log('=== toggleViewMode START ===');
    console.log('Switching to mode:', mode);
    this.viewMode.set(mode);
    this.currentPage.set(1);

    if (mode === 'list') {
      console.log('Loading bulk uploads for list view');
      this.loadBulkUploads();
    } else {
      console.log('Loading members and advisers for officers view');
      this.loadMembers();
      this.loadAdvisers();
    }
    console.log('=== toggleViewMode END ===');
  }

  loadAdvisers() {
    // Automatically load the adviser(s) assigned by the Dean
    // This ensures the Officer Profile always displays the current adviser assignment
    // No manual selection or input is required - the data comes from organization_advisers table
    console.log('Loading advisers assigned by Dean...');
    this.organizationService.getAdvisers().subscribe({
      next: (response) => {
        console.log('Advisers response:', response);
        // Filter for active advisers only (is_active = true)
        // When Dean updates the adviser, old assignments are deactivated and new ones are activated
        const activeAdvisers = response.advisers.filter((a) => a.is_active);
        console.log('Active advisers assigned by Dean:', activeAdvisers);
        this.advisers.set(activeAdvisers);
      },
      error: (error) => {
        console.error('Failed to load advisers:', error);
        this.advisers.set([]);
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
    console.log('=== Opening Edit Officer Modal ===');
    console.log('Officer data:', member);
    
    this.selectedMember.set(member);
    this.memberForm.set({
      sr_code: member.sr_code || '',
      first_name: member.first_name,
      middle_name: member.middle_name || '',
      last_name: member.last_name,
      email: member.email || '',
      contact_number: member.contact_number || '',
      year_level: member.year_level,
      position: member.position,
      parent_member_id: member.parent_member_id,
      academic_year_id: member.academic_year_id,
      semester: (member as any).semester || '',
      term_start_date: member.term_start_date,
      term_end_date: member.term_end_date || '',
      is_active: member.is_active,
      course: member.course || '',
      gwa: member.gwa || '',
      campus: member.campus || '',
      telephone_number: member.telephone_number || '',
      birth_date: member.birth_date || '',
      age: member.age || '',
      civil_status: member.civil_status || '',
      home_address: member.home_address || '',
    });
    
    // CRITICAL: Also populate adviserForm with officer profile fields
    // because the HTML template binds to adviserForm for these fields
    this.adviserForm.set({
      academic_rank: '',
      employment_status: '',
      length_of_service: '',
      educational_attainment: member.course || '', // Course
      campus: member.campus || '',
      contact_number: '',
      telephone_number: member.telephone_number || '',
      email: '',
      birth_date: member.birth_date || '',
      age: member.age ? Number(member.age) : undefined, // Convert to number
      civil_status: member.civil_status || '',
      home_address: member.home_address || '',
      signature_url: '',
      notes: member.gwa || '', // GWA
    });
    
    console.log('✅ memberForm populated:', this.memberForm());
    console.log('✅ adviserForm populated:', this.adviserForm());
    
    // Set photo preview if exists, explicitly clear if not
    if (member.photo_url) {
      this.photoPreview.set(this.getPhotoUrl(member.photo_url));
    } else {
      this.photoPreview.set(null);
    }

    // Set signature preview if exists, explicitly clear if not
    if (member.signature_url) {
      this.signaturePreview.set(this.getPhotoUrl(member.signature_url));
    } else {
      this.signaturePreview.set(null);
    }

    // Clear any previously selected files
    this.selectedPhoto.set(null);
    this.selectedSignature.set(null);
    this.errorMessage.set('');

    this.showEditModal.set(true);
  }

  viewMember(member: OrganizationMember) {
    this.selectedMember.set(member);
    this.showViewModal.set(true);
  }

  openViewMemberModal(member: OrganizationMember) {
    this.viewMember(member);
  }

  openDeleteModal(member: OrganizationMember) {
    this.selectedMember.set(member);
    this.deleteMember();
  }

  openEditAdviserModal(adviser: any) {
    console.log('=== Opening edit adviser modal ===');
    console.log('Adviser object:', JSON.stringify(adviser, null, 2));
    console.log('Faculty data:', adviser.Faculty);
    
    this.selectedAdviser.set(adviser);
    
    // Prepare the adviser form data
    const adviserFormData = {
      academic_rank: adviser.Faculty?.academic_rank || '',
      employment_status: adviser.Faculty?.employment_status || '',
      length_of_service: adviser.length_of_service || '',
      educational_attainment: adviser.Faculty?.educational_attainment || '',
      campus: adviser.Faculty?.campus || '',
      contact_number: adviser.Faculty?.contact_number || '',
      telephone_number: adviser.Faculty?.telephone_number || '',
      email: adviser.Faculty?.email || '',
      birth_date: adviser.Faculty?.birth_date || '',
      age: adviser.Faculty?.age || undefined,
      civil_status: adviser.Faculty?.civil_status || '',
      home_address: adviser.Faculty?.home_address || '',
      signature_url: adviser.Faculty?.signature_url || '',
      notes: adviser.notes || '',
    };
    
    console.log('✅ Adviser form data prepared:', adviserFormData);
    console.log('📝 Field values from database:');
    console.log('   - Academic Rank:', adviser.Faculty?.academic_rank || '(empty)');
    console.log('   - Employment Status:', adviser.Faculty?.employment_status || '(empty)');
    console.log('   - Educational Attainment:', adviser.Faculty?.educational_attainment || '(empty)');
    console.log('   - Campus:', adviser.Faculty?.campus || '(empty)');
    console.log('   - Telephone Number:', adviser.Faculty?.telephone_number || '(empty)');
    console.log('   - Birth Date:', adviser.Faculty?.birth_date || '(empty)');
    console.log('   - Age:', adviser.Faculty?.age || '(empty)');
    console.log('   - Civil Status:', adviser.Faculty?.civil_status || '(empty)');
    console.log('   - Home Address:', adviser.Faculty?.home_address || '(empty)');
    console.log('   - Signature URL:', adviser.Faculty?.signature_url || '(empty)');
    console.log('   - Length of Service:', adviser.length_of_service || '(empty)');
    
    // Populate basic form with adviser data from Faculty
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
      semester: '',
      term_start_date: '',
      term_end_date: '',
      is_active: true,
      course: '',
      gwa: '',
      campus: adviser.Faculty?.campus || '',
      telephone_number: adviser.Faculty?.telephone_number || '',
      birth_date: adviser.Faculty?.birth_date || '',
      age: adviser.Faculty?.age?.toString() || '',
      civil_status: adviser.Faculty?.civil_status || '',
      home_address: adviser.Faculty?.home_address || '',
    });
    
    // Populate adviser-specific form
    this.adviserForm.set(adviserFormData);
    
    console.log('✅ adviserForm has been set with database values');
    console.log('💡 NOTE: If fields appear empty, it means no data has been saved to the database yet for these fields.');
    console.log('💡 To test: Enter data in the fields, click Save, then reopen Edit to see the saved values.');
    
    // Set photo preview if exists
    if (adviser.Faculty?.photo_url) {
      this.photoPreview.set(this.getPhotoUrl(adviser.Faculty.photo_url));
      console.log('📷 Photo preview set:', this.getPhotoUrl(adviser.Faculty.photo_url));
    } else {
      this.photoPreview.set(null);
      console.log('📷 No photo URL available');
    }
    
    // Clear any selected new photo
    this.selectedPhoto.set(null);
    this.selectedSignature.set(null);
    
    // Clear error messages
    this.errorMessage.set('');
    
    this.showEditAdviserModal.set(true);
    
    console.log('=== Modal opened successfully ===');
    console.log('⚠️ IMPORTANT: The form fields are bound to the database values.');
    console.log('⚠️ If fields show empty, it means the database has NULL values for those fields.');
    console.log('⚠️ Test by entering data and saving, then reopen Edit to verify persistence.');
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showBulkUploadModal.set(false);
    this.showEditAdviserModal.set(false);
    this.showViewModal.set(false);
    this.selectedMember.set(null);
    this.selectedAdviser.set(null);
    this.resetForm();
    this.uploadResults.set(null);
    // Reset bulk-upload edit state so a stale mode doesn't leak into a fresh open
    this.bulkUploadEditMode.set(false);
    this.editingUploadId.set(null);
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
      semester: '',
      term_start_date: '',
      term_end_date: '',
      is_active: true,
      course: '',
      gwa: '',
      campus: '',
      telephone_number: '',
      birth_date: '',
      age: '',
      civil_status: '',
      home_address: '',
    });
    this.adviserForm.set({
      academic_rank: '',
      employment_status: '',
      length_of_service: '',
      educational_attainment: '',
      campus: '',
      contact_number: '',
      telephone_number: '',
      email: '',
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
    this.signaturePreview.set(null);
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

      // Create preview so the uploaded signature is visible in the modal
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.signaturePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
      this.errorMessage.set('');
    }
  }

  removeSignature() {
    this.selectedSignature.set(null);
    this.signaturePreview.set(null);
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

  triggerSignatureUpload() {
    const fileInput = document.getElementById('signatureUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  saveMember() {
    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();
    const adviserFormData = this.adviserForm();

    // Validate required fields for officers
    if (!form.position || form.position.trim() === '') {
      this.errorMessage.set('Position is required');
      this.loading.set(false);
      return;
    }

    if (!form.first_name || form.first_name.trim() === '') {
      this.errorMessage.set('First name is required');
      this.loading.set(false);
      return;
    }

    if (!form.last_name || form.last_name.trim() === '') {
      this.errorMessage.set('Last name is required');
      this.loading.set(false);
      return;
    }

    console.log('📝 Saving member with position:', form.position);
    console.log('📝 Full form data:', form);

    // Append all form fields
    formData.append('sr_code', form.sr_code);
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', form.email || '');
    formData.append('contact_number', form.contact_number || '');
    formData.append('year_level', form.year_level || '');
    formData.append('position', form.position || '');
    formData.append('academic_year_id', form.academic_year_id?.toString() || '');
    formData.append('term_start_date', form.term_start_date || '');
    formData.append('term_end_date', form.term_end_date || '');
    formData.append('is_active', form.is_active.toString());
    
    // Append new officer profile fields from adviserForm
    formData.append('course', adviserFormData.educational_attainment || '');
    formData.append('gwa', adviserFormData.notes || '');
    formData.append('campus', adviserFormData.campus || '');
    formData.append('telephone_number', adviserFormData.telephone_number || '');
    formData.append('birth_date', adviserFormData.birth_date || '');
    formData.append('age', adviserFormData.age?.toString() || '');
    formData.append('civil_status', adviserFormData.civil_status || '');
    formData.append('home_address', adviserFormData.home_address || '');

    if (form.parent_member_id) {
      formData.append('parent_member_id', form.parent_member_id.toString());
    }

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
    }
    
    // Append signature if selected
    if (this.selectedSignature()) {
      formData.append('signature', this.selectedSignature()!);
    }

    this.organizationService.createMemberWithPhoto(formData).subscribe({
      next: (response) => {
        console.log('✅ Member created successfully!');
        console.log('Response:', response);
        console.log('New member data:', response.member);
        console.log('Member position:', response.member?.position);
        console.log('Member academic_year_id:', response.member?.academic_year_id);
        console.log('Member is_active:', response.member?.is_active);
        
        this.loading.set(false);
        this.closeModals();
        
        // Clear ALL filters to ensure new officer is visible
        console.log('🔄 Clearing all filters');
        this.selectedAcademicYear.set(undefined);
        this.selectedPosition.set('');
        this.selectedSemester.set('');
        this.searchQuery.set('');
        this.showActiveOnly.set(true); // Show active only (new officers are active by default)
        
        console.log('🔄 Reloading members...');
        this.loadMembers();
        
        // Show success message AFTER reloading to ensure data is fresh
        setTimeout(() => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: response.message || 'Officer added successfully',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'OK',
          });
        }, 100);
      },
      error: (error) => {
        console.error('❌ Failed to create member:', error);
        this.errorMessage.set(error.error?.message || 'Failed to add officer');
        this.loading.set(false);
      },
    });
  }

  updateMember() {
    const memberId = this.selectedMember()?.member_id;
    if (!memberId) return;

    console.log('=== UPDATE OFFICER DEBUG ===');
    console.log('Member ID:', memberId);
    console.log('📋 Current memberForm() values:', this.memberForm());
    console.log('📋 Current adviserForm() values:', this.adviserForm());

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();
    const adviserFormData = this.adviserForm();

    console.log('📤 Appending to FormData:');
    console.log('  first_name:', form.first_name);
    console.log('  middle_name:', form.middle_name);
    console.log('  last_name:', form.last_name);
    console.log('  sr_code:', form.sr_code);
    console.log('  email:', form.email);
    console.log('  contact_number:', form.contact_number);
    console.log('  year_level:', form.year_level);
    console.log('  position:', form.position);
    console.log('  course:', adviserFormData.educational_attainment);
    console.log('  campus:', adviserFormData.campus);

    // Append all form fields
    formData.append('sr_code', form.sr_code || '');
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', form.email || '');
    formData.append('contact_number', form.contact_number || '');
    formData.append('year_level', form.year_level || '');
    formData.append('position', form.position || '');
    formData.append('term_end_date', form.term_end_date || '');
    formData.append('is_active', form.is_active.toString());
    
    // Append new officer profile fields from adviserForm
    formData.append('course', adviserFormData.educational_attainment || '');
    formData.append('gwa', adviserFormData.notes || '');
    formData.append('campus', adviserFormData.campus || '');
    formData.append('telephone_number', adviserFormData.telephone_number || '');
    formData.append('birth_date', adviserFormData.birth_date || '');
    formData.append('age', adviserFormData.age?.toString() || '');
    formData.append('civil_status', adviserFormData.civil_status || '');
    formData.append('home_address', adviserFormData.home_address || '');

    if (form.parent_member_id) {
      formData.append('parent_member_id', form.parent_member_id.toString());
    }

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
    }
    
    // Append signature if selected
    if (this.selectedSignature()) {
      formData.append('signature', this.selectedSignature()!);
    }

    this.organizationService.updateMemberWithPhoto(memberId, formData).subscribe({
      next: (response) => {
        console.log('✅ Officer updated successfully!');
        console.log('Response:', response);
        console.log('Updated member:', response.member);
        
        this.loading.set(false);
        this.closeModals();
        
        // Clear academic year filter to ensure updated officer is visible
        console.log('🔄 Clearing academic year filter');
        this.selectedAcademicYear.set(undefined);
        console.log('🔄 Reloading members...');
        this.loadMembers();
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Officer updated successfully',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to update officer');
        this.loading.set(false);
      },
    });
  }

  updateAdviser() {
    const adviserId = this.selectedAdviser()?.adviser_id;
    if (!adviserId) return;

    console.log('=== Starting adviser update ===');
    console.log('Adviser ID:', adviserId);

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    const form = this.memberForm();
    const adviserFormData = this.adviserForm();

    console.log('📤 Preparing form data to send:');
    console.log('🔍 CURRENT adviserForm() VALUES:', adviserFormData);
    console.log('Basic fields:', {
      first_name: form.first_name,
      middle_name: form.middle_name,
      last_name: form.last_name,
      email: adviserFormData.email,
      contact_number: adviserFormData.contact_number
    });
    console.log('Profile fields:', {
      academic_rank: adviserFormData.academic_rank,
      employment_status: adviserFormData.employment_status,
      length_of_service: adviserFormData.length_of_service,
      educational_attainment: adviserFormData.educational_attainment,
      campus: adviserFormData.campus,
      telephone_number: adviserFormData.telephone_number,
      birth_date: adviserFormData.birth_date,
      age: adviserFormData.age,
      civil_status: adviserFormData.civil_status,
      home_address: adviserFormData.home_address
    });

    // Append basic name fields
    formData.append('first_name', form.first_name);
    formData.append('middle_name', form.middle_name || '');
    formData.append('last_name', form.last_name);
    formData.append('email', adviserFormData.email || '');
    formData.append('contact_number', adviserFormData.contact_number || '');

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

    // Log what's actually in FormData
    console.log('📋 FormData contents:');
    for (let pair of formData.entries()) {
      console.log(`  ${pair[0]}: "${pair[1]}"`);
    }

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photo', this.selectedPhoto()!);
      console.log('📷 Appending photo to form data:', this.selectedPhoto()!.name);
    }

    // Append signature if selected
    if (this.selectedSignature()) {
      formData.append('signature', this.selectedSignature()!);
      console.log('✍️ Appending signature to form data:', this.selectedSignature()!.name);
    }

    console.log('✅ Sending updateAdviser request with all fields...');

    this.organizationService.updateAdviserPhoto(adviserId, formData).subscribe({
      next: (response) => {
        console.log('✅ Adviser update successful!');
        console.log('Response:', response);
        console.log('💡 Now close and reopen Edit Adviser modal to verify the data persists.');
        
        this.loading.set(false);  // ✅ FIX: Set loading to false
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Adviser updated successfully',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });
        this.closeModals();
        this.loadAdvisers();
      },
      error: (error) => {
        console.error('❌ Adviser update failed:', error);
        this.errorMessage.set(error.error?.message || 'Failed to update adviser');
        this.loading.set(false);
      },
    });
  }

  deleteMember() {
    const memberId = this.selectedMember()?.member_id;
    if (!memberId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this member?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.errorMessage.set('');

        this.organizationService.deleteMember(memberId).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: response.message || 'Officer deleted successfully',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK',
            });
            this.closeModals();
            this.loadMembers();
          },
          error: (error) => {
            this.errorMessage.set(error.error?.message || 'Failed to delete officer');
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: error.error?.message || 'Failed to delete officer',
              confirmButtonColor: '#ef4444',
              confirmButtonText: 'OK',
            });
          },
        });
      }
    });
  }

  applyFilters() {
    const wasOnFirstPage = this.currentPage() === 1;
    this.currentPage.set(1);
    if (this.viewMode() === 'list') {
      // Search/Term/Semester in the Organization Population view are applied
      // client-side via the `filteredBulkUploads` computed signal, so no
      // server round-trip is needed while the user is already on page 1.
      // If they had paginated further, reload page 1 so the client-side
      // filter operates on the correct set of rows.
      if (!wasOnFirstPage) {
        this.loadBulkUploads();
      }
    } else {
      this.loadMembers();
    }
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.loadBulkUploads();
  }

  viewUploadDetails(upload: any) {
    this.previewUpload(upload);
  }

  previewUpload(upload: any) {
    this.previewLoading.set(true);
    this.showPreviewModal.set(true);
    this.previewData.set(null);

    this.organizationService.previewBulkUpload(upload.upload_id).subscribe({
      next: (data) => {
        this.previewData.set(data);
        this.previewLoading.set(false);
      },
      error: (error) => {
        this.previewLoading.set(false);
        this.showPreviewModal.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: error.error?.message || 'Failed to preview file',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  closePreviewModal() {
    this.showPreviewModal.set(false);
    this.previewData.set(null);
  }

  downloadUpload(upload: any) {
    this.organizationService.downloadBulkUpload(upload.upload_id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = upload.file_name;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: error.error?.message || 'Failed to download file',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  deleteUpload(upload: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this upload?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);

        this.organizationService.deleteBulkUpload(upload.upload_id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'File deleted successfully',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK',
            });
            this.loadBulkUploads();
          },
          error: (error) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: error.error?.message || 'Failed to delete file',
              confirmButtonColor: '#ef4444',
              confirmButtonText: 'OK',
            });
          },
        });
      }
    });
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
    // Respect the position filter — if a specific non-president position is
    // selected, the president card should not appear.
    const selected = this.selectedPosition();
    if (selected && selected.trim().toLowerCase() !== 'president') {
      return undefined;
    }
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

  /**
   * Static list of officer positions that can appear in the Officers Profile
   * view. Kept in the same order/spelling as the Add Officer modal so the
   * filter values and the saved `member.position` values line up.
   *
   * "Adviser" is first because the adviser card is pinned at the top of the
   * profile view.
   */
  readonly officerPositionOptions: string[] = [
    'Adviser',
    'PRESIDENT',
    'VICE PRESIDENT',
    'SECRETARY',
    'ASSISTANT SECRETARY',
    'TREASURER',
    'ASSISTANT TREASURER',
    'AUDITOR',
    'P.R.O.',
    'BUSINESS MANAGER',
    'MEDIA AND PUBLICITY HEAD',
    'MEDIA AND PUBLICITY COMMITTEE',
    'MEDIA AND PUBLICITY',
    'COMMDRRM HEAD',
    'COMMDRRM COMMITTEE',
    '1ST YEAR REPRESENTATIVE',
    'SECOND YEAR REPRESENTATIVE',
    'THIRD YEAR REPRESENTATIVE',
    'FOURTH YEAR REPRESENTATIVE',
  ];

  /**
   * Options shown in the "All Positions" dropdown. Starts with the static list
   * and appends any distinct position observed on currently loaded members
   * that isn't already covered (case-insensitive), so legacy or imported
   * positions still show up as filterable options.
   */
  availablePositionOptions = computed<string[]>(() => {
    const known = new Set(
      this.officerPositionOptions.map((p) => p.trim().toLowerCase()),
    );
    const extras: string[] = [];
    for (const m of this.members()) {
      const raw = (m.position || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (key === 'member') continue; // Members are not officers
      if (!known.has(key)) {
        known.add(key);
        extras.push(raw);
      }
    }
    return [...this.officerPositionOptions, ...extras];
  });

  /**
   * Look up a position's hierarchy level from the loaded position templates.
   * Lower numbers rank higher (e.g., President = 1). Unknown positions get a
   * large fallback so they sort to the bottom.
   */
  getPositionHierarchy(positionName: string | undefined | null): number {
    if (!positionName) return 9999;
    const target = positionName.trim().toLowerCase();
    const match = this.positions().find(
      (p) => p.position_name && p.position_name.trim().toLowerCase() === target,
    );
    return match?.hierarchy_level ?? 9999;
  }

  /**
   * All active officers (excluding regular Members), sorted by their position's
   * hierarchy level and then by last name. Advisers are handled separately —
   * they are pinned above this list in the template.
   */
  getSortedOfficers(): OrganizationMember[] {
    return this.members()
      .filter(
        (m) =>
          m.is_active &&
          m.position &&
          m.position.trim() !== '' &&
          m.position.toLowerCase() !== 'member' &&
          m.position.toLowerCase() !== 'adviser' &&
          m.position.toLowerCase() !== 'advisor',
      )
      .slice()
      .sort((a, b) => {
        const ha = this.getPositionHierarchy(a.position);
        const hb = this.getPositionHierarchy(b.position);
        if (ha !== hb) return ha - hb;
        return (a.last_name || '').localeCompare(b.last_name || '');
      });
  }

  /**
   * Non-president officers (Vice President through 4th Year Representative,
   * and any other position defined by the org), sorted by hierarchy.
   * The President is displayed as its own detailed card above this list.
   *
   * Also honours the "All Positions" filter — when a specific position is
   * selected, only officers matching that position are returned. Selecting
   * "Adviser" or "President" clears this list (they are rendered elsewhere).
   */
  getOtherOfficersSorted(): OrganizationMember[] {
    const selected = this.selectedPosition();
    const selectedKey = selected ? selected.trim().toLowerCase() : '';

    // Adviser and President are rendered in their own cards, not in this grid.
    if (selectedKey === 'adviser' || selectedKey === 'advisor' || selectedKey === 'president') {
      return [];
    }

    const base = this.getSortedOfficers().filter(
      (m) => m.position.toLowerCase() !== 'president',
    );

    if (!selectedKey) {
      return base;
    }

    return base.filter((m) => m.position.trim().toLowerCase() === selectedKey);
  }

  /**
   * Whether the pinned Adviser card should be displayed given the current
   * position filter. Returns true when no filter is set or when "Adviser"
   * is explicitly selected.
   */
  shouldShowAdviserCard(): boolean {
    const selected = this.selectedPosition();
    if (!selected) return true;
    const key = selected.trim().toLowerCase();
    return key === 'adviser' || key === 'advisor';
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

  getRandomColor(seed: string | null | undefined): string {
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
    // Handle null/undefined seed
    const safeSeed = seed || 'default';
    const index = safeSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
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
      year_level: '',
      department: '',
      semester: '',
    });
    this.uploadResults.set(null);
    this.bulkUploadEditMode.set(false);
    this.editingUploadId.set(null);
    this.errorMessage.set('');
    this.showBulkUploadModal.set(true);
  }

  openEditBulkUploadModal(upload: any) {
    this.bulkUploadForm.set({
      file: null, // File is optional in edit mode
      academic_year_id: upload.academic_year_id ?? undefined,
      section: upload.section || '',
      year_level: (upload.year_level as any) || '',
      department: upload.department || '',
      semester: (upload.semester as any) || '',
    });
    this.uploadResults.set(null);
    this.bulkUploadEditMode.set(true);
    this.editingUploadId.set(upload.upload_id);
    this.errorMessage.set('');
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
    const isEdit = this.bulkUploadEditMode();

    // Metadata fields are always required. File is required only when creating.
    const metadataMissing =
      !form.academic_year_id ||
      !form.section ||
      !form.year_level ||
      !form.department ||
      !form.semester;

    if (metadataMissing || (!isEdit && !form.file)) {
      this.errorMessage.set(
        isEdit
          ? 'Please fill in all required fields'
          : 'Please fill all required fields and select a file',
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    if (form.file) {
      formData.append('file', form.file);
    }
    formData.append('academic_year_id', form.academic_year_id!.toString());
    formData.append('section', form.section);
    formData.append('year_level', form.year_level);
    formData.append('department', form.department);
    formData.append('semester', form.semester);

    // The two service calls return different response shapes, so widen the
    // observable to `any` before subscribing to keep TS happy about the union.
    const request$: Observable<any> = isEdit
      ? this.organizationService.updateBulkUpload(
          this.editingUploadId()!,
          formData,
        )
      : this.organizationService.bulkUploadMembers(formData);

    request$.subscribe({
      next: (response: any) => {
        if (response?.results) {
          this.uploadResults.set(response.results);
        }
        this.successMessage.set(response.message);
        this.loading.set(false);
        this.loadBulkUploads(); // Reload upload records

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message,
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });

        // Close modal after success and reset edit state
        this.showBulkUploadModal.set(false);
        this.bulkUploadEditMode.set(false);
        this.editingUploadId.set(null);
      },
      error: (error: any) => {
        this.errorMessage.set(
          error?.error?.message ||
            (isEdit ? 'Failed to update file' : 'Failed to upload members'),
        );
        this.loading.set(false);
      },
    });
  }
}
