import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CollegeDepartmentProfileService,
  CollegeDepartmentProfile,
  PEO,
  Program,
  CareerOpportunity,
} from '../../../services/dean/college-department-profile.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-my-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  styles: [],
})
export class DeanMyProfile implements OnInit {
  loading = signal(false);
  saving = signal(false);
  isEditing = signal(false);
  uploadingPicture = signal(false);

  profile = signal<CollegeDepartmentProfile>({});
  form = signal<CollegeDepartmentProfile>({});

  // parsed arrays
  peos = signal<PEO[]>([]);
  programs = signal<Program[]>([]);
  careerOpportunities = signal<CareerOpportunity[]>([]);
  programOutcomes = signal<string[]>([]);

  constructor(private profileService: CollegeDepartmentProfileService) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading.set(true);
    this.profileService.getProfile().subscribe({
      next: (res) => {
        const r = res.record;
        this.profile.set(r);
        this.peos.set(this.parseJSON<PEO[]>(r.peos, []));
        this.programs.set(this.parseJSON<Program[]>(r.programs, []));
        this.careerOpportunities.set(
          this.parseJSON<CareerOpportunity[]>(r.career_opportunities, []),
        );
        this.programOutcomes.set(this.parseJSON<string[]>(r.program_outcomes, []));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private parseJSON<T>(val: any, fallback: T): T {
    if (!val) return fallback;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return val as T;
  }

  startEdit() {
    this.form.set({ ...this.profile() });
    this.isEditing.set(true);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  save() {
    this.saving.set(true);
    const f = this.form();
    const payload = {
      ...f,
      peos: this.peos(),
      programs: this.programs(),
      career_opportunities: this.careerOpportunities(),
      program_outcomes: this.programOutcomes(),
    };
    this.profileService.updateProfile(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Saved',
          text: 'Profile updated successfully',
          timer: 1500,
          showConfirmButton: false,
        });
        this.isEditing.set(false);
        this.saving.set(false);
        this.loadProfile();
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save profile' });
        this.saving.set(false);
      },
    });
  }

  // PEO CRUD
  addPEO() {
    this.peos.update((p) => [...p, { title: '', description: '' }]);
  }
  removePEO(i: number) {
    this.peos.update((p) => p.filter((_, idx) => idx !== i));
  }
  updatePEO(i: number, field: keyof PEO, val: string) {
    this.peos.update((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));
  }

  // Program CRUD
  addProgram() {
    this.programs.update((p) => [...p, { name: '', description: '', icon_color: 'green' }]);
  }
  removeProgram(i: number) {
    this.programs.update((p) => p.filter((_, idx) => idx !== i));
  }
  updateProgram(i: number, field: keyof Program, val: string) {
    this.programs.update((p) =>
      p.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );
  }

  // Career Opportunity CRUD
  addCareer() {
    this.careerOpportunities.update((c) => [...c, { program: '', careers: '' }]);
  }
  removeCareer(i: number) {
    this.careerOpportunities.update((c) => c.filter((_, idx) => idx !== i));
  }
  updateCareer(i: number, field: keyof CareerOpportunity, val: string) {
    this.careerOpportunities.update((c) =>
      c.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );
  }

  // Program Outcomes CRUD
  addOutcome() {
    this.programOutcomes.update((o) => [...o, '']);
  }
  removeOutcome(i: number) {
    this.programOutcomes.update((o) => o.filter((_, idx) => idx !== i));
  }
  updateOutcome(i: number, val: string) {
    this.programOutcomes.update((o) => o.map((item, idx) => (idx === i ? val : item)));
  }

  updateFormField(field: keyof CollegeDepartmentProfile, value: any) {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  onProfilePictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingPicture.set(true);
    this.profileService.uploadProfilePicture(file).subscribe({
      next: (res) => {
        this.profile.update((p) => ({ ...p, profile_picture: res.profile_picture }));
        this.uploadingPicture.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Done',
          text: 'Profile picture updated',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: () => {
        this.uploadingPicture.set(false);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to upload picture' });
      },
    });
  }

  trackByIndex(index: number) {
    return index;
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
