import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  PDSService,
  PersonalDataSheet,
  PDSChild,
  PDSEducation,
  PDSEligibility,
  PDSWorkExperience,
  PDSVoluntaryWork,
  PDSTraining,
  PDSOtherInfo,
  PDSReference,
} from '../../../services/core/pds.service';
import { PdsPdfService } from '../../../services/core/pds-pdf.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-personal-data-sheet',
  imports: [CommonModule, FormsModule],
  templateUrl: './personal-data-sheet.html',
  styleUrl: './personal-data-sheet.css',
})
export class PersonalDataSheetComponent implements OnInit {
  pds: PersonalDataSheet = {
    surname: '',
    first_name: '',
    middle_name: '',
    date_of_birth: '',
    place_of_birth: '',
    sex: 'Male',
    civil_status: 'Single',
    citizenship_type: 'Filipino',
    residential_city: '',
    residential_province: '',
    permanent_city: '',
    permanent_province: '',
    mobile_no: '',
    email_address: '',
    children: [],
    education: [],
    eligibilities: [],
    work_experiences: [],
    voluntary_works: [],
    trainings: [],
    other_info: [],
    references: [],
  };

  currentTab = signal<number>(1);
  loading = signal(false);
  isEditMode = signal(false); // Track edit mode for submitted/approved PDS
  photoFile: File | null = null;
  signatureFile: File | null = null;
  photoPreview = signal<string>('');
  signaturePreview = signal<string>('');
  showPdfPreview = signal(false);
  pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  private pdfPreviewObjectUrl: string | null = null;

  // Checkbox states for optional sections
  hasNoSpouse = false;
  hasNoChildren = false;
  fatherInfoNA = false;
  motherInfoNA = false;
  hasNoWorkExperience = false;
  hasNoVoluntaryWork = false;
  hasNoTraining = false;

  // Modal visibility states
  showAddChildModal = false;
  showAddEducationModal = false;
  showAddEligibilityModal = false;
  showAddWorkExperienceModal = false;
  showAddVoluntaryModal = false;
  showAddTrainingModal = false;
  showAddReferenceModal = false;

  // For adding items to arrays
  newChild: PDSChild = { child_name: '', date_of_birth: '' };
  newEducation: PDSEducation = {
    level: 'ELEMENTARY',
    school_name: '',
    degree_course: '',
    period_from: 0,
    period_to: 0,
    highest_level_earned: '',
  };
  newEligibility: PDSEligibility = { career_service: '', license_validity: '' };
  newWorkExperience: PDSWorkExperience = {
    date_from: '',
    position_title: '',
    department_agency: '',
    is_government_service: undefined,
  };
  newVoluntaryWork: PDSVoluntaryWork = {
    organization_name: '',
    date_from: '',
    date_to: '',
    position_nature_of_work: '',
  };
  newTraining: PDSTraining = {
    title: '',
    date_from: '',
    date_to: '',
    conducted_by: '',
  };
  newSkill = '';
  newRecognition = '';
  newMembership = '';
  newReference: PDSReference = { name: '', address: '', telephone_number: '' };

  constructor(
    private pdsService: PDSService,
    private pdfService: PdsPdfService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPDS();
  }

  setPdsField(field: keyof PersonalDataSheet, value: any) {
    this.pds = { ...this.pds, [field]: value };
  }

  private static readonly VALID_CITIZENSHIP_TYPES = ['Filipino', 'Dual Citizenship', 'By Naturalization'];

  /**
   * Native <input type="date"> requires a bare yyyy-MM-dd value; the API returns full ISO timestamps.
   * Also defaults citizenship_type when a previously-corrupted record has it blank/invalid,
   * so the required-field check on submit doesn't silently block the user.
   */
  private normalizePds(pds: PersonalDataSheet): PersonalDataSheet {
    const date_of_birth = pds.date_of_birth ? String(pds.date_of_birth).slice(0, 10) : pds.date_of_birth;
    const citizenship_type = PersonalDataSheetComponent.VALID_CITIZENSHIP_TYPES.includes(pds.citizenship_type as string)
      ? pds.citizenship_type
      : 'Filipino';
    return { ...pds, date_of_birth, citizenship_type };
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadPDS() {
    this.loading.set(true);
    this.pdsService.getPDS().subscribe({
      next: (pdsData) => {
        // Merge: fill empty PDS fields from profile, keep existing PDS values
        this.pdsService.getProfileAsPDS().subscribe({
          next: (profileData) => {
            this.pds = this.normalizePds(mergeWithProfile(pdsData, profileData));
          },
          error: () => {
            this.pds = this.normalizePds(pdsData);
          },
        });
        if (pdsData.photo_path) {
          this.photoPreview.set(`${environment.apiUrl}/../${pdsData.photo_path}`);
        }
        if (pdsData.signature_path) {
          this.signaturePreview.set(`${environment.apiUrl}/../${pdsData.signature_path}`);
        }
        this.loading.set(false);
      },
      error: (error) => {
        if (error.status === 404) {
          // No PDS yet — pre-populate form from profile (no DB write)
          this.pdsService.getProfileAsPDS().subscribe({
            next: (profileData) => {
              this.pds = this.normalizePds(profileData);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
            },
          });
        } else {
          console.error('Error loading PDS:', error);
          this.loading.set(false);
        }
      },
    });
  }

  autoImportFromProfile() {
    // Full overwrite of PDS from profile (saves to DB)
    this.pdsService.importFromProfile().subscribe({
      next: (data) => {
        this.pds = this.normalizePds(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Import error:', error);
        this.loading.set(false);
      },
    });
  }

  autoFillFromProfile() {
    Swal.fire({
      title: 'Import from My Profile?',
      text: 'This will fill in PDS fields with data from your profile. Existing data will be preserved.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, import data',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.pdsService.importFromProfile().subscribe({
          next: (data) => {
            this.pds = this.normalizePds(data);
            Swal.fire({
              icon: 'success',
              title: 'Imported!',
              text: 'Profile data has been imported to PDS',
              confirmButtonColor: '#16a34a',
            });
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Import error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Import Failed',
              text: error.error?.message || 'Failed to import profile data',
              confirmButtonColor: '#dc2626',
            });
            this.loading.set(false);
          },
        });
      }
    });
  }

  savePDS() {
    this.loading.set(true);
    this.pdsService.savePDS(this.pds).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Saved!',
          text: 'Personal Data Sheet saved as draft',
          confirmButtonColor: '#2563eb',
        });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Save error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save Personal Data Sheet',
          confirmButtonColor: '#dc2626',
        });
        this.loading.set(false);
      },
    });
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
      // Persist immediately so the saved photo_path stays in sync with the
      // preview. Without this, the preview looks uploaded but the server
      // still has no photo, and Submit fails with "Please upload a photo".
      this.uploadPhoto();
    }
  }

  onSignatureSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.signatureFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.signaturePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto() {
    if (!this.photoFile) {
      Swal.fire({
        icon: 'warning',
        title: 'No Photo Selected',
        text: 'Please select a photo to upload',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    this.loading.set(true);
    this.pdsService.uploadPhoto(this.photoFile).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Uploaded!',
          text: 'Photo uploaded successfully',
          confirmButtonColor: '#2563eb',
        });
        this.photoFile = null;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Upload error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: error.error?.message || 'Failed to upload photo',
          confirmButtonColor: '#dc2626',
        });
        this.loading.set(false);
      },
    });
  }

  uploadSignature() {
    if (!this.signatureFile) {
      Swal.fire({
        icon: 'warning',
        title: 'No Signature Selected',
        text: 'Please select a signature image to upload',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    this.loading.set(true);
    this.pdsService.uploadSignature(this.signatureFile).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Uploaded!',
          text: 'Signature uploaded successfully',
          confirmButtonColor: '#2563eb',
        });
        this.signatureFile = null;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Upload error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: error.error?.message || 'Failed to upload signature',
          confirmButtonColor: '#dc2626',
        });
        this.loading.set(false);
      },
    });
  }

  submitPDS() {
    Swal.fire({
      title: 'Submit Personal Data Sheet?',
      text: 'Your current data will be saved and submitted for approval.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, submit it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        // Save current form data first, then submit
        this.pdsService.savePDS(this.pds).subscribe({
          next: () => {
            this.pdsService.submitPDS().subscribe({
              next: () => {
                this.isEditMode.set(false);
                Swal.fire({
                  icon: 'success',
                  title: 'Submitted!',
                  text: 'Personal Data Sheet submitted for approval',
                  confirmButtonColor: '#2563eb',
                });
                this.loadPDS();
                this.loading.set(false);
              },
              error: (error) => {
                console.error('Submit error:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Submission Failed',
                  text: error.error?.message || 'Failed to submit Personal Data Sheet',
                  confirmButtonColor: '#dc2626',
                });
                this.loading.set(false);
              },
            });
          },
          error: (error) => {
            console.error('Save before submit error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Save Failed',
              text: 'Could not save your data before submitting. Please try again.',
              confirmButtonColor: '#dc2626',
            });
            this.loading.set(false);
          },
        });
      }
    });
  }

  // Toggle methods for optional sections
  toggleSpouseFields() {
    if (this.hasNoSpouse) {
      const currentPDS = this.pds;
      currentPDS.spouse_surname = 'N/A';
      currentPDS.spouse_first_name = 'N/A';
      currentPDS.spouse_middle_name = 'N/A';
      currentPDS.spouse_occupation = 'N/A';
      currentPDS.spouse_employer = 'N/A';
      currentPDS.spouse_business_address = 'N/A';
      currentPDS.spouse_telephone = 'N/A';
      this.pds = currentPDS;
    } else {
      const currentPDS = this.pds;
      currentPDS.spouse_surname = '';
      currentPDS.spouse_first_name = '';
      currentPDS.spouse_middle_name = '';
      currentPDS.spouse_occupation = '';
      currentPDS.spouse_employer = '';
      currentPDS.spouse_business_address = '';
      currentPDS.spouse_telephone = '';
      this.pds = currentPDS;
    }
  }

  toggleFatherInfo() {
    if (this.fatherInfoNA) {
      const currentPDS = this.pds;
      currentPDS.father_surname = 'N/A';
      currentPDS.father_first_name = 'N/A';
      currentPDS.father_middle_name = 'N/A';
      this.pds = currentPDS;
    } else {
      const currentPDS = this.pds;
      currentPDS.father_surname = '';
      currentPDS.father_first_name = '';
      currentPDS.father_middle_name = '';
      this.pds = currentPDS;
    }
  }

  toggleMotherInfo() {
    if (this.motherInfoNA) {
      const currentPDS = this.pds;
      currentPDS.mother_surname = 'N/A';
      currentPDS.mother_first_name = 'N/A';
      currentPDS.mother_middle_name = 'N/A';
      this.pds = currentPDS;
    } else {
      const currentPDS = this.pds;
      currentPDS.mother_surname = '';
      currentPDS.mother_first_name = '';
      currentPDS.mother_middle_name = '';
      this.pds = currentPDS;
    }
  }

  // Helper methods for managing arrays
  addChild() {
    if (this.newChild.child_name && this.newChild.date_of_birth) {
      const currentPDS = this.pds;
      currentPDS.children = [...(currentPDS.children || []), { ...this.newChild }];
      this.pds = currentPDS;
      this.newChild = { child_name: '', date_of_birth: '' };
    }
  }

  removeChild(index: number) {
    const currentPDS = this.pds;
    currentPDS.children = currentPDS.children?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addEducation() {
    if (this.newEducation.school_name) {
      const currentPDS = this.pds;
      currentPDS.education = [...(currentPDS.education || []), { ...this.newEducation }];
      this.pds = currentPDS;
      this.newEducation = {
        level: 'ELEMENTARY',
        school_name: '',
        degree_course: '',
        period_from: undefined,
        period_to: undefined,
        highest_level_earned: '',
      };
    }
  }

  removeEducation(index: number) {
    const currentPDS = this.pds;
    currentPDS.education = currentPDS.education?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addEligibility() {
    if (this.newEligibility.career_service) {
      const currentPDS = this.pds;
      currentPDS.eligibilities = [...(currentPDS.eligibilities || []), { ...this.newEligibility }];
      this.pds = currentPDS;
      this.newEligibility = { career_service: '', license_validity: '' };
    }
  }

  removeEligibility(index: number) {
    const currentPDS = this.pds;
    currentPDS.eligibilities = currentPDS.eligibilities?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addWorkExperience() {
    if (this.newWorkExperience.position_title && this.newWorkExperience.date_from) {
      const currentPDS = this.pds;
      currentPDS.work_experiences = [
        ...(currentPDS.work_experiences || []),
        { ...this.newWorkExperience },
      ];
      this.pds = currentPDS;
      this.newWorkExperience = {
        date_from: '',
        position_title: '',
        department_agency: '',
        is_government_service: undefined,
      };
    }
  }

  removeWorkExperience(index: number) {
    const currentPDS = this.pds;
    currentPDS.work_experiences = currentPDS.work_experiences?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addVoluntaryWork() {
    if (this.newVoluntaryWork.organization_name) {
      const currentPDS = this.pds;
      currentPDS.voluntary_works = [
        ...(currentPDS.voluntary_works || []),
        { ...this.newVoluntaryWork },
      ];
      this.pds = currentPDS;
      this.newVoluntaryWork = {
        organization_name: '',
        date_from: '',
        date_to: '',
        position_nature_of_work: '',
      };
    }
  }

  removeVoluntaryWork(index: number) {
    const currentPDS = this.pds;
    currentPDS.voluntary_works = currentPDS.voluntary_works?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addTraining() {
    if (this.newTraining.title) {
      const currentPDS = this.pds;
      currentPDS.trainings = [...(currentPDS.trainings || []), { ...this.newTraining }];
      this.pds = currentPDS;
      this.newTraining = {
        title: '',
        date_from: '',
        date_to: '',
        conducted_by: '',
      };
    }
  }

  removeTraining(index: number) {
    const currentPDS = this.pds;
    currentPDS.trainings = currentPDS.trainings?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addSkill() {
    if (this.newSkill) {
      const currentPDS = this.pds;
      currentPDS.other_info = [
        ...(currentPDS.other_info || []),
        { info_type: 'SKILL', details: this.newSkill },
      ];
      this.pds = currentPDS;
      this.newSkill = '';
    }
  }

  addRecognition() {
    if (this.newRecognition) {
      const currentPDS = this.pds;
      currentPDS.other_info = [
        ...(currentPDS.other_info || []),
        { info_type: 'RECOGNITION', details: this.newRecognition },
      ];
      this.pds = currentPDS;
      this.newRecognition = '';
    }
  }

  addMembership() {
    if (this.newMembership) {
      const currentPDS = this.pds;
      currentPDS.other_info = [
        ...(currentPDS.other_info || []),
        { info_type: 'MEMBERSHIP', details: this.newMembership },
      ];
      this.pds = currentPDS;
      this.newMembership = '';
    }
  }

  removeOtherInfo(index: number) {
    const currentPDS = this.pds;
    currentPDS.other_info = currentPDS.other_info?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  addReference() {
    if (this.newReference.name && this.newReference.address) {
      const currentPDS = this.pds;
      currentPDS.references = [...(currentPDS.references || []), { ...this.newReference }];
      this.pds = currentPDS;
      this.newReference = { name: '', address: '', telephone_number: '' };
    }
  }

  removeReference(index: number) {
    const currentPDS = this.pds;
    currentPDS.references = currentPDS.references?.filter((_, i) => i !== index);
    this.pds = currentPDS;
  }

  copyResidentialToPermanent() {
    const currentPDS = this.pds;
    currentPDS.permanent_house_no = currentPDS.residential_house_no;
    currentPDS.permanent_street = currentPDS.residential_street;
    currentPDS.permanent_subdivision = currentPDS.residential_subdivision;
    currentPDS.permanent_barangay = currentPDS.residential_barangay;
    currentPDS.permanent_city = currentPDS.residential_city;
    currentPDS.permanent_province = currentPDS.residential_province;
    currentPDS.permanent_zip_code = currentPDS.residential_zip_code;
    this.pds = currentPDS;
  }

  selectTab(tab: number) {
    this.currentTab.set(tab);
  }

  nextTab() {
    const current = this.currentTab();
    if (current < 11) {
      this.currentTab.set(current + 1);
    }
  }

  previousTab() {
    const current = this.currentTab();
    if (current > 1) {
      this.currentTab.set(current - 1);
    }
  }

  isFormReadonly(): boolean {
    const status = this.pds.status;
    const isSubmittedOrApproved = status === 'submitted' || status === 'approved';
    // Allow editing if edit mode is enabled, otherwise check status
    return isSubmittedOrApproved && !this.isEditMode();
  }

  enableEditMode() {
    this.isEditMode.set(true);
  }

  cancelEditMode() {
    this.isEditMode.set(false);
    // Reload PDS to discard changes
    this.loadPDS();
  }

  getStatusBadgeClass(): string {
    switch (this.pds.status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'returned':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getStatusText(): string {
    switch (this.pds.status) {
      case 'approved':
        return 'APPROVED';
      case 'submitted':
        return 'SUBMITTED';
      case 'returned':
        return 'RETURNED FOR REVISION';
      default:
        return 'DRAFT';
    }
  }

  // Helper methods for filtering other_info by type
  hasSkills(): boolean {
    return (this.pds.other_info || []).some((info) => info.info_type === 'SKILL');
  }

  hasRecognitions(): boolean {
    return (this.pds.other_info || []).some((info) => info.info_type === 'RECOGNITION');
  }

  hasMemberships(): boolean {
    return (this.pds.other_info || []).some((info) => info.info_type === 'MEMBERSHIP');
  }

  async previewPDF() {
    this.loading.set(true);
    try {
      const url = await this.pdfService.generatePreviewUrl(this.pds);
      if (!url) throw new Error('PDF generation returned no output');
      this.pdfPreviewObjectUrl = url;
      this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.showPdfPreview.set(true);
    } catch (error) {
      console.error('PDF preview error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Preview Failed',
        text: 'Failed to generate PDS PDF preview.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.loading.set(false);
    }
  }

  closePdfPreview() {
    this.showPdfPreview.set(false);
    this.pdfPreviewUrl.set(null);
    if (this.pdfPreviewObjectUrl) {
      URL.revokeObjectURL(this.pdfPreviewObjectUrl);
      this.pdfPreviewObjectUrl = null;
    }
  }

  async downloadPDF() {
    this.loading.set(true);
    try {
      await this.pdfService.generateAndDownload(this.pds);
    } catch (error) {
      console.error('PDF generation error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to generate PDS PDF.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Merges existing PDS with profile data.
 * Profile values only fill in fields that are blank/null/empty in the PDS.
 * Existing PDS entries for arrays (education, work_experiences, etc.) are kept as-is.
 */
function mergeWithProfile(pds: PersonalDataSheet, profile: PersonalDataSheet): PersonalDataSheet {
  const merged = { ...pds };
  const scalarFields: (keyof PersonalDataSheet)[] = [
    'surname', 'first_name', 'middle_name', 'name_extension',
    'date_of_birth', 'place_of_birth', 'sex', 'civil_status', 'citizenship_type',
    'residential_street', 'residential_subdivision', 'residential_barangay', 'residential_city',
    'residential_province', 'residential_zip_code',
    'permanent_street', 'permanent_subdivision', 'permanent_barangay', 'permanent_city',
    'permanent_province', 'permanent_zip_code',
    'telephone_no', 'mobile_no', 'email_address',
  ];
  for (const field of scalarFields) {
    const existing = pds[field];
    const isEmpty = existing === null || existing === undefined || existing === '' || existing === 'N/A';
    if (isEmpty && profile[field]) {
      (merged as any)[field] = profile[field];
    }
  }
  // Fill array sections only if PDS has none saved yet
  if (!pds.education?.length && profile.education?.length) merged.education = profile.education;
  if (!pds.work_experiences?.length && profile.work_experiences?.length) merged.work_experiences = profile.work_experiences;
  if (!pds.trainings?.length && profile.trainings?.length) merged.trainings = profile.trainings;
  if (!pds.other_info?.length && profile.other_info?.length) merged.other_info = profile.other_info;
  if (!pds.voluntary_works?.length && profile.voluntary_works?.length) merged.voluntary_works = profile.voluntary_works;
  return merged;
}



