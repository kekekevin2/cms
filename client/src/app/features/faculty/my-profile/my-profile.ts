import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import {
  FacultyProfileService,
  PersonalProfile,
  AcademicProfile,
  EmploymentProfile,
  ProfessionalMembership,
  Award,
  SeminarTraining,
  ResearchActivity,
  ExtensionActivity,
} from '../../../services/faculty/faculty-profile.service';
import { SweetAlertService } from '../../../shared/services/sweetalert.service';

@Component({
  selector: 'app-faculty-my-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 0.5rem;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class FacultyMyProfile implements OnInit {
  private profileService = inject(FacultyProfileService);
  private sweetAlert = inject(SweetAlertService);

  apiUrl = environment.apiUrl;
  loading = signal(false);
  activeSection = signal<string>('personal');

  // Personal Profile
  personalProfile = signal<PersonalProfile>({});
  personalForm = signal<PersonalProfile>({});
  isEditingPersonal = signal(false);
  selectedProfilePhoto: File | null = null;
  selectedPassportPhoto: File | null = null;

  // Academic Profiles
  academicProfiles = signal<AcademicProfile[]>([]);
  academicForm = signal<AcademicProfile>({});
  showAcademicModal = signal(false);
  isEditingAcademic = signal(false);

  // Employment Profiles
  employmentProfiles = signal<EmploymentProfile[]>([]);
  employmentForm = signal<EmploymentProfile>({});
  showEmploymentModal = signal(false);
  isEditingEmployment = signal(false);

  // Professional Memberships
  memberships = signal<ProfessionalMembership[]>([]);
  membershipForm = signal<ProfessionalMembership>({});
  showMembershipModal = signal(false);
  isEditingMembership = signal(false);

  // Awards
  awards = signal<Award[]>([]);
  awardForm = signal<Award>({});
  showAwardModal = signal(false);
  isEditingAward = signal(false);
  selectedAwardFile: File | null = null;

  // Seminars/Trainings
  seminars = signal<SeminarTraining[]>([]);
  seminarForm = signal<SeminarTraining>({});
  showSeminarModal = signal(false);
  isEditingSeminar = signal(false);
  selectedSeminarFile: File | null = null;

  // Research Activities
  researchActivities = signal<ResearchActivity[]>([]);
  researchForm = signal<ResearchActivity>({});
  showResearchModal = signal(false);
  isEditingResearch = signal(false);
  selectedResearchFile: File | null = null;

  // Extension Activities
  extensionActivities = signal<ExtensionActivity[]>([]);
  extensionForm = signal<ExtensionActivity>({});
  showExtensionModal = signal(false);
  isEditingExtension = signal(false);
  selectedExtensionFile: File | null = null;

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.loadPersonalProfile();
    this.loadAcademicProfiles();
    this.loadEmploymentProfiles();
    this.loadMemberships();
    this.loadAwards();
    this.loadSeminars();
    this.loadResearchActivities();
    this.loadExtensionActivities();
  }

  selectSection(section: string) {
    this.activeSection.set(section);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // ==================== PERSONAL PROFILE ====================

  loadPersonalProfile() {
    this.loading.set(true);
    this.profileService.getPersonalProfile().subscribe({
      next: (response) => {
        this.personalProfile.set(response.profile || {});
        this.personalForm.set({ ...(response.profile || {}) });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading personal profile:', error);
        this.loading.set(false);
      },
    });
  }

  startEditingPersonal() {
    this.personalForm.set({ ...this.personalProfile() });
    this.isEditingPersonal.set(true);
  }

  onProfilePhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedProfilePhoto = input.files[0];
    }
  }

  onPassportPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedPassportPhoto = input.files[0];
    }
  }

  savePersonalProfile() {
    const formData = new FormData();
    const form = this.personalForm();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof PersonalProfile];
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString());
      }
    });

    // Append profile photo if selected
    if (this.selectedProfilePhoto) {
      formData.append('profile_picture', this.selectedProfilePhoto);
    }

    // Append passport photo if selected
    if (this.selectedPassportPhoto) {
      formData.append('passport_photo', this.selectedPassportPhoto);
    }

    this.profileService.upsertPersonalProfile(formData).subscribe({
      next: (response) => {
        this.sweetAlert.success('Personal profile saved successfully');
        this.personalProfile.set(response.profile);
        this.isEditingPersonal.set(false);
        this.selectedProfilePhoto = null;
        this.selectedPassportPhoto = null;
      },
      error: (error) => {
        console.error('Error saving personal profile:', error);
        this.sweetAlert.error('Failed to save personal profile');
      },
    });
  }

  cancelPersonalEdit() {
    this.isEditingPersonal.set(false);
    this.personalForm.set({ ...this.personalProfile() });
    this.selectedProfilePhoto = null;
    this.selectedPassportPhoto = null;
  }

  // ==================== ACADEMIC PROFILE ====================

  loadAcademicProfiles() {
    this.profileService.getAcademicProfiles().subscribe({
      next: (response) => {
        this.academicProfiles.set(response.profiles || []);
      },
      error: (error) => {
        console.error('Error loading academic profiles:', error);
      },
    });
  }

  openAcademicModal(profile?: AcademicProfile) {
    if (profile) {
      this.academicForm.set({ ...profile });
      this.isEditingAcademic.set(true);
    } else {
      this.academicForm.set({});
      this.isEditingAcademic.set(false);
    }
    this.showAcademicModal.set(true);
  }

  saveAcademicProfile() {
    const form = this.academicForm();

    if (this.isEditingAcademic() && form.id) {
      this.profileService.updateAcademicProfile(form.id, form).subscribe({
        next: () => {
          this.sweetAlert.success('Academic profile updated successfully');
          this.loadAcademicProfiles();
          this.showAcademicModal.set(false);
        },
        error: (error) => {
          console.error('Error updating academic profile:', error);
          this.sweetAlert.error('Failed to update academic profile');
        },
      });
    } else {
      this.profileService.createAcademicProfile(form).subscribe({
        next: () => {
          this.sweetAlert.success('Academic profile created successfully');
          this.loadAcademicProfiles();
          this.showAcademicModal.set(false);
        },
        error: (error) => {
          console.error('Error creating academic profile:', error);
          this.sweetAlert.error('Failed to create academic profile');
        },
      });
    }
  }

  deleteAcademicProfile(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this academic profile?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteAcademicProfile(id).subscribe({
            next: () => {
              this.sweetAlert.success('Academic profile deleted successfully');
              this.loadAcademicProfiles();
            },
            error: (error) => {
              console.error('Error deleting academic profile:', error);
              this.sweetAlert.error('Failed to delete academic profile');
            },
          });
        }
      });
  }

  // ==================== EMPLOYMENT PROFILE ====================

  loadEmploymentProfiles() {
    this.profileService.getEmploymentProfiles().subscribe({
      next: (response) => {
        this.employmentProfiles.set(response.profiles || []);
      },
      error: (error) => {
        console.error('Error loading employment profiles:', error);
      },
    });
  }

  openEmploymentModal(profile?: EmploymentProfile) {
    if (profile) {
      this.employmentForm.set({ ...profile });
      this.isEditingEmployment.set(true);
    } else {
      this.employmentForm.set({});
      this.isEditingEmployment.set(false);
    }
    this.showEmploymentModal.set(true);
  }

  saveEmploymentProfile() {
    const form = this.employmentForm();

    if (this.isEditingEmployment() && form.id) {
      this.profileService.updateEmploymentProfile(form.id, form).subscribe({
        next: () => {
          this.sweetAlert.success('Employment profile updated successfully');
          this.loadEmploymentProfiles();
          this.showEmploymentModal.set(false);
        },
        error: (error) => {
          console.error('Error updating employment profile:', error);
          this.sweetAlert.error('Failed to update employment profile');
        },
      });
    } else {
      this.profileService.createEmploymentProfile(form).subscribe({
        next: () => {
          this.sweetAlert.success('Employment profile created successfully');
          this.loadEmploymentProfiles();
          this.showEmploymentModal.set(false);
        },
        error: (error) => {
          console.error('Error creating employment profile:', error);
          this.sweetAlert.error('Failed to create employment profile');
        },
      });
    }
  }

  deleteEmploymentProfile(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this employment profile?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteEmploymentProfile(id).subscribe({
            next: () => {
              this.sweetAlert.success('Employment profile deleted successfully');
              this.loadEmploymentProfiles();
            },
            error: (error) => {
              console.error('Error deleting employment profile:', error);
              this.sweetAlert.error('Failed to delete employment profile');
            },
          });
        }
      });
  }

  // ==================== PROFESSIONAL MEMBERSHIP ====================

  loadMemberships() {
    this.profileService.getProfessionalMemberships().subscribe({
      next: (response) => {
        this.memberships.set(response.memberships || []);
      },
      error: (error) => {
        console.error('Error loading memberships:', error);
      },
    });
  }

  openMembershipModal(membership?: ProfessionalMembership) {
    if (membership) {
      this.membershipForm.set({ ...membership });
      this.isEditingMembership.set(true);
    } else {
      this.membershipForm.set({});
      this.isEditingMembership.set(false);
    }
    this.showMembershipModal.set(true);
  }

  saveMembership() {
    const form = this.membershipForm();

    if (this.isEditingMembership() && form.id) {
      this.profileService.updateProfessionalMembership(form.id, form).subscribe({
        next: () => {
          this.sweetAlert.success('Membership updated successfully');
          this.loadMemberships();
          this.showMembershipModal.set(false);
        },
        error: (error) => {
          console.error('Error updating membership:', error);
          this.sweetAlert.error('Failed to update membership');
        },
      });
    } else {
      this.profileService.createProfessionalMembership(form).subscribe({
        next: () => {
          this.sweetAlert.success('Membership created successfully');
          this.loadMemberships();
          this.showMembershipModal.set(false);
        },
        error: (error) => {
          console.error('Error creating membership:', error);
          this.sweetAlert.error('Failed to create membership');
        },
      });
    }
  }

  deleteMembership(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this membership?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteProfessionalMembership(id).subscribe({
            next: () => {
              this.sweetAlert.success('Membership deleted successfully');
              this.loadMemberships();
            },
            error: (error) => {
              console.error('Error deleting membership:', error);
              this.sweetAlert.error('Failed to delete membership');
            },
          });
        }
      });
  }

  // ==================== AWARDS ====================

  loadAwards() {
    this.profileService.getAwards().subscribe({
      next: (response) => {
        this.awards.set(response.awards || []);
      },
      error: (error) => {
        console.error('Error loading awards:', error);
      },
    });
  }

  openAwardModal(award?: Award) {
    if (award) {
      this.awardForm.set({ ...award });
      this.isEditingAward.set(true);
    } else {
      this.awardForm.set({});
      this.isEditingAward.set(false);
    }
    this.selectedAwardFile = null;
    this.showAwardModal.set(true);
  }

  onAwardFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedAwardFile = input.files[0];
    }
  }

  saveAward() {
    const form = this.awardForm();
    const formData = new FormData();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof Award];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        key !== 'id' &&
        key !== 'faculty_id'
      ) {
        formData.append(key, value.toString());
      }
    });

    // Append certificate file if selected
    if (this.selectedAwardFile) {
      formData.append('certificate_file', this.selectedAwardFile);
    }

    if (this.isEditingAward() && form.id) {
      this.profileService.updateAward(form.id, formData).subscribe({
        next: () => {
          this.sweetAlert.success('Award updated successfully');
          this.loadAwards();
          this.showAwardModal.set(false);
        },
        error: (error) => {
          console.error('Error updating award:', error);
          this.sweetAlert.error('Failed to update award');
        },
      });
    } else {
      this.profileService.createAward(formData).subscribe({
        next: () => {
          this.sweetAlert.success('Award created successfully');
          this.loadAwards();
          this.showAwardModal.set(false);
        },
        error: (error) => {
          console.error('Error creating award:', error);
          this.sweetAlert.error('Failed to create award');
        },
      });
    }
  }

  deleteAward(id: number) {
    this.sweetAlert.confirm('Are you sure you want to delete this award?').then((result: any) => {
      if (result.isConfirmed) {
        this.profileService.deleteAward(id).subscribe({
          next: () => {
            this.sweetAlert.success('Award deleted successfully');
            this.loadAwards();
          },
          error: (error) => {
            console.error('Error deleting award:', error);
            this.sweetAlert.error('Failed to delete award');
          },
        });
      }
    });
  }

  // ==================== SEMINARS/TRAININGS ====================

  loadSeminars() {
    this.profileService.getSeminarsTrainings().subscribe({
      next: (response) => {
        this.seminars.set(response.seminars || []);
      },
      error: (error) => {
        console.error('Error loading seminars:', error);
      },
    });
  }

  openSeminarModal(seminar?: SeminarTraining) {
    if (seminar) {
      this.seminarForm.set({ ...seminar });
      this.isEditingSeminar.set(true);
    } else {
      this.seminarForm.set({});
      this.isEditingSeminar.set(false);
    }
    this.selectedSeminarFile = null;
    this.showSeminarModal.set(true);
  }

  onSeminarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedSeminarFile = input.files[0];
    }
  }

  saveSeminar() {
    const form = this.seminarForm();
    const formData = new FormData();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof SeminarTraining];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        key !== 'id' &&
        key !== 'faculty_id'
      ) {
        formData.append(key, value.toString());
      }
    });

    // Append certificate file if selected
    if (this.selectedSeminarFile) {
      formData.append('certificate_file', this.selectedSeminarFile);
    }

    if (this.isEditingSeminar() && form.id) {
      this.profileService.updateSeminarTraining(form.id, formData).subscribe({
        next: () => {
          this.sweetAlert.success('Seminar/training updated successfully');
          this.loadSeminars();
          this.showSeminarModal.set(false);
        },
        error: (error) => {
          console.error('Error updating seminar:', error);
          this.sweetAlert.error('Failed to update seminar/training');
        },
      });
    } else {
      this.profileService.createSeminarTraining(formData).subscribe({
        next: () => {
          this.sweetAlert.success('Seminar/training created successfully');
          this.loadSeminars();
          this.showSeminarModal.set(false);
        },
        error: (error) => {
          console.error('Error creating seminar:', error);
          this.sweetAlert.error('Failed to create seminar/training');
        },
      });
    }
  }

  deleteSeminar(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this seminar/training?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteSeminarTraining(id).subscribe({
            next: () => {
              this.sweetAlert.success('Seminar/training deleted successfully');
              this.loadSeminars();
            },
            error: (error) => {
              console.error('Error deleting seminar:', error);
              this.sweetAlert.error('Failed to delete seminar/training');
            },
          });
        }
      });
  }

  // ==================== RESEARCH ACTIVITIES ====================

  loadResearchActivities() {
    this.profileService.getResearchActivities().subscribe({
      next: (response) => {
        this.researchActivities.set(response.activities || []);
      },
      error: (error) => {
        console.error('Error loading research activities:', error);
      },
    });
  }

  openResearchModal(activity?: ResearchActivity) {
    if (activity) {
      this.researchForm.set({ ...activity });
      this.isEditingResearch.set(true);
    } else {
      this.researchForm.set({});
      this.isEditingResearch.set(false);
    }
    this.selectedResearchFile = null;
    this.showResearchModal.set(true);
  }

  onResearchFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedResearchFile = input.files[0];
    }
  }

  saveResearch() {
    const form = this.researchForm();
    const formData = new FormData();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof ResearchActivity];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        key !== 'id' &&
        key !== 'faculty_id'
      ) {
        formData.append(key, value.toString());
      }
    });

    // Append certificate file if selected
    if (this.selectedResearchFile) {
      formData.append('certificate_file', this.selectedResearchFile);
    }

    if (this.isEditingResearch() && form.id) {
      this.profileService.updateResearchActivity(form.id, formData).subscribe({
        next: () => {
          this.sweetAlert.success('Research activity updated successfully');
          this.loadResearchActivities();
          this.showResearchModal.set(false);
        },
        error: (error) => {
          console.error('Error updating research activity:', error);
          this.sweetAlert.error('Failed to update research activity');
        },
      });
    } else {
      this.profileService.createResearchActivity(formData).subscribe({
        next: () => {
          this.sweetAlert.success('Research activity created successfully');
          this.loadResearchActivities();
          this.showResearchModal.set(false);
        },
        error: (error) => {
          console.error('Error creating research activity:', error);
          this.sweetAlert.error('Failed to create research activity');
        },
      });
    }
  }

  deleteResearch(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this research activity?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteResearchActivity(id).subscribe({
            next: () => {
              this.sweetAlert.success('Research activity deleted successfully');
              this.loadResearchActivities();
            },
            error: (error) => {
              console.error('Error deleting research activity:', error);
              this.sweetAlert.error('Failed to delete research activity');
            },
          });
        }
      });
  }

  // ==================== EXTENSION ACTIVITIES ====================

  loadExtensionActivities() {
    this.profileService.getExtensionActivities().subscribe({
      next: (response) => {
        this.extensionActivities.set(response.activities || []);
      },
      error: (error) => {
        console.error('Error loading extension activities:', error);
      },
    });
  }

  openExtensionModal(activity?: ExtensionActivity) {
    if (activity) {
      this.extensionForm.set({ ...activity });
      this.isEditingExtension.set(true);
    } else {
      this.extensionForm.set({});
      this.isEditingExtension.set(false);
    }
    this.selectedExtensionFile = null;
    this.showExtensionModal.set(true);
  }

  onExtensionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedExtensionFile = input.files[0];
    }
  }

  saveExtension() {
    const form = this.extensionForm();
    const formData = new FormData();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof ExtensionActivity];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        key !== 'id' &&
        key !== 'faculty_id'
      ) {
        formData.append(key, value.toString());
      }
    });

    // Append documentation file if selected
    if (this.selectedExtensionFile) {
      formData.append('documentation_file', this.selectedExtensionFile);
    }

    if (this.isEditingExtension() && form.id) {
      this.profileService.updateExtensionActivity(form.id, formData).subscribe({
        next: () => {
          this.sweetAlert.success('Extension activity updated successfully');
          this.loadExtensionActivities();
          this.showExtensionModal.set(false);
        },
        error: (error) => {
          console.error('Error updating extension activity:', error);
          this.sweetAlert.error('Failed to update extension activity');
        },
      });
    } else {
      this.profileService.createExtensionActivity(formData).subscribe({
        next: () => {
          this.sweetAlert.success('Extension activity created successfully');
          this.loadExtensionActivities();
          this.showExtensionModal.set(false);
        },
        error: (error) => {
          console.error('Error creating extension activity:', error);
          this.sweetAlert.error('Failed to create extension activity');
        },
      });
    }
  }

  deleteExtension(id: number) {
    this.sweetAlert
      .confirm('Are you sure you want to delete this extension activity?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.profileService.deleteExtensionActivity(id).subscribe({
            next: () => {
              this.sweetAlert.success('Extension activity deleted successfully');
              this.loadExtensionActivities();
            },
            error: (error) => {
              console.error('Error deleting extension activity:', error);
              this.sweetAlert.error('Failed to delete extension activity');
            },
          });
        }
      });
  }
}
