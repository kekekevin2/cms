import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DeanPDSService,
  PersonalDataSheet,
  PDSChild,
  PDSEducation,
  PDSEligibility,
  PDSWorkExperience,
  PDSVoluntaryWork,
  PDSTraining,
  PDSOtherInfo,
  PDSReference,
} from '../../../services/dean/dean-pds.service';
import { PdsPdfService } from '../../../services/core/pds-pdf.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-personal-data-sheet',
  imports: [CommonModule, FormsModule],
  templateUrl: './personal-data-sheet.html',
  styleUrl: './personal-data-sheet.css',
})
export class DeanPersonalDataSheetComponent implements OnInit {
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
  photoFile: File | null = null;
  signatureFile: File | null = null;
  photoPreview = signal<string>('');
  signaturePreview = signal<string>('');

  // Checkbox states for optional sections
  hasNoSpouse = false;
  hasNoChildren = false;
  fatherInfoNA = false;
  motherInfoNA = false;
  hasNoWorkExperience = false;
  hasNoVoluntaryWork = false;
  hasNoTraining = false;

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
    private pdsService: DeanPDSService,
    private pdfService: PdsPdfService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadPDS();
  }

  loadPDS() {
    this.loading.set(true);
    this.pdsService.getPDS().subscribe({
      next: (data) => {
        this.pds = data;
        if (data.photo_path) {
          this.photoPreview.set(`${environment.apiUrl}/../${data.photo_path}`);
        }
        if (data.signature_path) {
          this.signaturePreview.set(`${environment.apiUrl}/../${data.signature_path}`);
        }
        this.loading.set(false);
      },
      error: (error) => {
        if (error.status === 404) {
          this.autoImportFromProfile();
        } else {
          console.error('Error loading PDS:', error);
          this.loading.set(false);
        }
      },
    });
  }

  autoImportFromProfile() {
    this.pdsService.importFromProfile().subscribe({
      next: (data) => {
        this.pds = data;
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Import error:', error);

        // Show detailed error about missing profile fields
        if (error.error?.missingInProfile) {
          const missingFields = Object.keys(error.error.missingInProfile).filter(
            (key) => error.error.missingInProfile[key] === true,
          );

          if (missingFields.length > 0) {
            Swal.fire({
              icon: 'warning',
              title: 'Profile Incomplete',
              html: `
                <p>Your profile is missing required information:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                  ${missingFields.map((field) => `<li><strong>${field.replace(/_/g, ' ')}</strong></li>`).join('')}
                </ul>
                <p>Please go to <strong>My Profile</strong> and fill in these fields first.</p>
              `,
              confirmButtonColor: '#2563eb',
              confirmButtonText: 'Go to My Profile',
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/dean/my-profile']);
              }
            });
          }
        }

        // If import fails, just start with empty PDS
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
            this.pds = data;
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

            // Show detailed error about missing profile fields
            if (error.error?.missingInProfile) {
              const missingFields = Object.keys(error.error.missingInProfile).filter(
                (key) => error.error.missingInProfile[key] === true,
              );

              if (missingFields.length > 0) {
                Swal.fire({
                  icon: 'warning',
                  title: 'Profile Incomplete',
                  html: `
                    <div style="text-align: left;">
                      <p>Your profile is missing required information:</p>
                      <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                        ${missingFields.map((field) => `<li><strong>${field.replace(/_/g, ' ').toUpperCase()}</strong></li>`).join('')}
                      </ul>
                      <p><strong>What to do:</strong></p>
                      <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>Go to <strong>My Profile</strong></li>
                        <li>Click <strong>Edit</strong> on Personal Information</li>
                        <li>Fill in the missing fields above</li>
                        <li>Click <strong>Save</strong></li>
                        <li>Come back here and import again</li>
                      </ol>
                    </div>
                  `,
                  confirmButtonColor: '#2563eb',
                  confirmButtonText: 'Go to My Profile',
                  showCancelButton: true,
                  cancelButtonText: 'Stay Here',
                }).then((result) => {
                  if (result.isConfirmed) {
                    this.router.navigate(['/dean/my-profile']);
                  }
                });
              }
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Import Failed',
                text: error.error?.message || 'Failed to import profile data',
                confirmButtonColor: '#dc2626',
              });
            }

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

        // Show detailed error message
        let errorMessage = 'Failed to save Personal Data Sheet';

        if (error.error?.missingFields && error.error.missingFields.length > 0) {
          const fields = error.error.missingFields.join(', ');
          errorMessage = `Missing required fields: ${fields}. Please fill in all required fields or import from your profile.`;
        } else if (error.error?.invalidFields && error.error.invalidFields.length > 0) {
          const fields = error.error.invalidFields.map((f: any) => f.field).join(', ');
          errorMessage = `Invalid fields: ${fields}. Please check the values.`;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: errorMessage,
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
      text: 'Your current data will be saved and submitted for approval. Make sure all information is accurate.',
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
    currentPDS.children = currentPDS.children?.filter((_: any, i: number) => i !== index);
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
    currentPDS.education = currentPDS.education?.filter((_: any, i: number) => i !== index);
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
    currentPDS.eligibilities = currentPDS.eligibilities?.filter((_: any, i: number) => i !== index);
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
    currentPDS.work_experiences = currentPDS.work_experiences?.filter((_: any, i: number) => i !== index);
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
    currentPDS.voluntary_works = currentPDS.voluntary_works?.filter((_: any, i: number) => i !== index);
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
    currentPDS.trainings = currentPDS.trainings?.filter((_: any, i: number) => i !== index);
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
    currentPDS.other_info = currentPDS.other_info?.filter((_: any, i: number) => i !== index);
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
    currentPDS.references = currentPDS.references?.filter((_: any, i: number) => i !== index);
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
    return this.pds.status === 'submitted' || this.pds.status === 'approved';
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
    return (this.pds.other_info || []).some((info: any) => info.info_type === 'SKILL');
  }

  hasRecognitions(): boolean {
    return (this.pds.other_info || []).some((info: any) => info.info_type === 'RECOGNITION');
  }

  hasMemberships(): boolean {
    return (this.pds.other_info || []).some((info: any) => info.info_type === 'MEMBERSHIP');
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

  goBack() {
    this.router.navigate(['/dean']);
  }
}

