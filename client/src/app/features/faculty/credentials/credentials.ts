import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacultyCredentialsService } from '../../../services/faculty/faculty-credentials.service';
import { SweetAlertService } from '../../../shared/services/sweetalert.service';

interface Certificate {
  id: string;
  name: string;
  file: File | null;
  filePath?: string; // Path to existing file in database
}

@Component({
  selector: 'app-faculty-credentials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4">
      <!-- Display Saved Credentials -->
      @if (savedCredentials() && !isEditing()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Saved Credentials</h3>
            <button
              type="button"
              (click)="startEditing()"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <i class="fas fa-edit mr-2"></i>Edit
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-600">Education:</p>
              <p class="text-gray-900">{{ savedCredentials()?.education }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Where Obtained:</p>
              <p class="text-gray-900">{{ savedCredentials()?.education_obtained_where }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">When Obtained:</p>
              <p class="text-gray-900">{{ savedCredentials()?.education_obtained_when }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Specialization:</p>
              <p class="text-gray-900">{{ savedCredentials()?.specialization }}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-sm font-medium text-gray-600">Subjects to Teach:</p>
              <p class="text-gray-900">{{ savedCredentials()?.subjects_to_teach }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Appointment Nature:</p>
              <p class="text-gray-900">{{ savedCredentials()?.appointment_nature }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Status:</p>
              <p class="text-gray-900">{{ savedCredentials()?.status }}</p>
            </div>
            @if (savedCredentials()?.professional_license) {
              <div class="md:col-span-2">
                <p class="text-sm font-medium text-gray-600">Professional License:</p>
                <p class="text-gray-900">{{ savedCredentials()?.professional_license }}</p>
              </div>
            }
          </div>

          <!-- Documents Section -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-sm font-medium text-gray-600 mb-3">Uploaded Documents:</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                (click)="downloadDocument('tor')"
                class="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-blue-700"
              >
                <i class="fas fa-file-pdf"></i>
                <span class="text-sm font-medium">Transcript of Records</span>
                <i class="fas fa-download ml-auto"></i>
              </button>
              <button
                type="button"
                (click)="downloadDocument('pds')"
                class="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-blue-700"
              >
                <i class="fas fa-file-alt"></i>
                <span class="text-sm font-medium">Personal Data Sheet</span>
                <i class="fas fa-download ml-auto"></i>
              </button>
              <button
                type="button"
                (click)="downloadDocument('diploma')"
                class="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-blue-700"
              >
                <i class="fas fa-file-image"></i>
                <span class="text-sm font-medium">Diploma</span>
                <i class="fas fa-download ml-auto"></i>
              </button>
            </div>
          </div>

          <!-- Additional Certificates -->
          @if (
            savedCredentials()?.credential_certificates &&
            savedCredentials()!.credential_certificates!.length > 0
          ) {
            <div class="mt-6 pt-6 border-t border-gray-200">
              <p class="text-sm font-medium text-gray-600 mb-3">Additional Certificates:</p>
              <div class="space-y-2">
                @for (cert of savedCredentials()?.credential_certificates; track cert.id) {
                  <div
                    class="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div class="flex items-center gap-2">
                      <i class="fas fa-certificate text-green-600"></i>
                      <span class="text-sm font-medium text-gray-900">{{
                        cert.certificate_name
                      }}</span>
                    </div>
                    <button
                      type="button"
                      (click)="downloadCertificate(cert.id.toString())"
                      class="text-blue-600 hover:text-blue-800"
                      title="Download certificate"
                    >
                      <i class="fas fa-download"></i>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Form -->
      @if (!savedCredentials() || isEditing()) {
        <form (ngSubmit)="saveCredentials()" class="space-y-6">
          <!-- Personal Information Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Education -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Education <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.education"
                  name="education"
                  required
                  placeholder="e.g., Master of Science in Computer Science"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Education Obtained Where -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Education Obtained Where <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.educationObtainedWhere"
                  name="educationObtainedWhere"
                  required
                  placeholder="e.g., University of the Philippines"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Education Obtained When -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Education Obtained When <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.educationObtainedWhen"
                  name="educationObtainedWhen"
                  required
                  placeholder="e.g., 2020 or June 2020"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Professional License -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Professional License Number and PRC ID Expiration Date
                  <span class="text-gray-500 text-xs">(if applicable)</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.professionalLicense"
                  name="professionalLicense"
                  placeholder="e.g., License No: 123456, PRC ID Exp: 12/31/2025"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Field of Specialization -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Field of Specialization <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.specialization"
                  name="specialization"
                  required
                  placeholder="e.g., Software Engineering, Data Science"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Subjects to be taught -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Subjects to be Taught <span class="text-red-500">*</span>
                </label>
                <textarea
                  [(ngModel)]="formData.subjectsToTeach"
                  name="subjectsToTeach"
                  required
                  rows="3"
                  placeholder="List subjects separated by commas"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                ></textarea>
              </div>

              <!-- Nature of Appointment -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nature of Appointment <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.appointmentNature"
                  name="appointmentNature"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Visiting">Visiting</option>
                </select>
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.status"
                  name="status"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Documents Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <!-- Transcript of Records -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Transcript of Records (TOR)
                @if (!isEditing()) {
                  <span class="text-red-500">* PDF only</span>
                } @else {
                  <span class="text-gray-500 text-sm">(Upload new file to replace existing)</span>
                }
              </label>
              @if (isEditing() && savedCredentials()?.tor_file_path) {
                <div
                  class="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
                >
                  <div class="flex items-center gap-2 text-blue-700">
                    <i class="fas fa-file-pdf"></i>
                    <span class="text-sm">Current file uploaded</span>
                  </div>
                  <button
                    type="button"
                    (click)="downloadDocument('tor')"
                    class="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <i class="fas fa-download mr-1"></i>View
                  </button>
                </div>
              }
              <input
                type="file"
                (change)="onTORUpload($event)"
                accept=".pdf"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              @if (formData.torFile) {
                <p class="mt-2 text-sm text-green-600">
                  <i class="fas fa-check-circle mr-1"></i>
                  New file selected: {{ formData.torFile.name }}
                </p>
              }
            </div>

            <!-- PDS -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Personal Data Sheet (PDS)
                @if (!isEditing()) {
                  <span class="text-red-500">*</span>
                } @else {
                  <span class="text-gray-500 text-sm">(Upload new file to replace existing)</span>
                }
              </label>
              @if (isEditing() && savedCredentials()?.pds_file_path) {
                <div
                  class="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
                >
                  <div class="flex items-center gap-2 text-blue-700">
                    <i class="fas fa-file-alt"></i>
                    <span class="text-sm">Current file uploaded</span>
                  </div>
                  <button
                    type="button"
                    (click)="downloadDocument('pds')"
                    class="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <i class="fas fa-download mr-1"></i>View
                  </button>
                </div>
              }
              <input
                type="file"
                (change)="onPDSUpload($event)"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              @if (formData.pdsFile) {
                <p class="mt-2 text-sm text-green-600">
                  <i class="fas fa-check-circle mr-1"></i>
                  New file selected: {{ formData.pdsFile.name }}
                </p>
              }
            </div>

            <!-- Diploma -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Photocopy of Diploma
                @if (!isEditing()) {
                  <span class="text-red-500">*</span>
                } @else {
                  <span class="text-gray-500 text-sm">(Upload new file to replace existing)</span>
                }
              </label>
              @if (isEditing() && savedCredentials()?.diploma_file_path) {
                <div
                  class="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
                >
                  <div class="flex items-center gap-2 text-blue-700">
                    <i class="fas fa-file-image"></i>
                    <span class="text-sm">Current file uploaded</span>
                  </div>
                  <button
                    type="button"
                    (click)="downloadDocument('diploma')"
                    class="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <i class="fas fa-download mr-1"></i>View
                  </button>
                </div>
              }
              <input
                type="file"
                (change)="onDiplomaUpload($event)"
                accept=".pdf,.jpg,.jpeg,.png"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              @if (formData.diplomaFile) {
                <p class="mt-2 text-sm text-green-600">
                  <i class="fas fa-check-circle mr-1"></i>
                  New file selected: {{ formData.diplomaFile.name }}
                </p>
              }
            </div>
          </div>

          <!-- Certificates Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm text-gray-600">
                Certificates of Trainings/Seminars Attended (optional)
              </p>
              <button
                type="button"
                (click)="addCertificate()"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <i class="fas fa-plus"></i>
                Add Certificate
              </button>
            </div>

            @if (certificates().length === 0) {
              <div class="text-center py-8 text-gray-500">
                <i class="fas fa-certificate text-4xl mb-3"></i>
                <p>No certificates added yet. Click "Add Certificate" to begin.</p>
              </div>
            }

            @for (cert of certificates(); track cert.id) {
              <div class="border border-gray-300 rounded-lg p-4 mb-4">
                <div class="flex items-start gap-4">
                  <div class="flex-1 space-y-3">
                    <!-- Certificate Name -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Certificate Name/Title
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="cert.name"
                        [name]="'certName_' + cert.id"
                        placeholder="e.g., Web Development Training Certificate"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <!-- Certificate File -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Certificate File
                        @if (cert.filePath) {
                          (Optional - file already uploaded)
                        }
                      </label>

                      @if (cert.filePath && !cert.file) {
                        <div
                          class="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between"
                        >
                          <div class="flex items-center gap-2">
                            <i class="fas fa-file-pdf text-blue-600"></i>
                            <span class="text-sm text-blue-800">Current certificate uploaded</span>
                          </div>
                          <button
                            type="button"
                            (click)="downloadCertificate(cert.id)"
                            class="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition flex items-center gap-1"
                          >
                            <i class="fas fa-eye"></i>
                            View
                          </button>
                        </div>
                      }

                      <input
                        type="file"
                        (change)="onCertificateFileChange($event, cert.id)"
                        accept=".pdf,.jpg,.jpeg,.png"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      @if (cert.file) {
                        <p class="mt-1 text-sm text-blue-600">
                          <i class="fas fa-check-circle mr-1"></i>
                          New file selected: {{ cert.file.name }}
                        </p>
                      }
                    </div>
                  </div>

                  <!-- Remove Button -->
                  <button
                    type="button"
                    (click)="removeCertificate(cert.id)"
                    class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3">
            @if (isEditing()) {
              <button
                type="button"
                (click)="cancelEditing()"
                class="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            }
            <button
              type="button"
              (click)="resetForm()"
              class="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Reset
            </button>
            <button
              type="submit"
              [disabled]="isSubmitting()"
              class="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              @if (isSubmitting()) {
                <i class="fas fa-spinner fa-spin"></i>
                <span>{{ isEditing() ? 'Updating...' : 'Submitting...' }}</span>
              } @else {
                <i class="fas fa-save"></i>
                <span>{{ isEditing() ? 'Update Credentials' : 'Save Credentials' }}</span>
              }
            </button>
          </div>
        </form>
      }

      <!-- Success/Error Messages -->
      @if (successMessage()) {
        <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <i class="fas fa-check-circle mr-2"></i>
          {{ successMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <i class="fas fa-exclamation-circle mr-2"></i>
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
  styles: [],
})
export class FacultyCredentials implements OnInit {
  private credentialsService: FacultyCredentialsService = inject(FacultyCredentialsService);
  private sweetAlert: SweetAlertService = inject(SweetAlertService);

  formData = {
    education: '',
    educationObtainedWhere: '',
    educationObtainedWhen: '',
    professionalLicense: '',
    specialization: '',
    subjectsToTeach: '',
    appointmentNature: '',
    status: '',
    torFile: null as File | null,
    pdsFile: null as File | null,
    diplomaFile: null as File | null,
  };

  certificates = signal<Certificate[]>([]);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  savedCredentials = signal<any>(null);
  isEditing = signal(false);
  isLoading = signal(true);

  ngOnInit() {
    this.loadExistingCredentials();
  }

  async loadExistingCredentials() {
    try {
      this.isLoading.set(true);
      const credentials = await this.credentialsService.getCredentials();
      this.savedCredentials.set(credentials);
      this.isLoading.set(false);
    } catch (error: any) {
      // No credentials found yet, that's okay
      if (error.status === 404) {
        this.savedCredentials.set(null);
      } else {
        console.error('Error loading credentials:', error);
      }
      this.isLoading.set(false);
    }
  }

  startEditing() {
    const saved = this.savedCredentials();
    if (saved) {
      // Populate form with saved data
      this.formData = {
        education: saved.education,
        educationObtainedWhere: saved.education_obtained_where,
        educationObtainedWhen: saved.education_obtained_when,
        professionalLicense: saved.professional_license || '',
        specialization: saved.specialization,
        subjectsToTeach: saved.subjects_to_teach,
        appointmentNature: saved.appointment_nature,
        status: saved.status,
        torFile: null,
        pdsFile: null,
        diplomaFile: null,
      };

      // Populate certificates with existing data
      if (saved.credential_certificates && saved.credential_certificates.length > 0) {
        const existingCerts: Certificate[] = saved.credential_certificates.map((cert: any) => ({
          id: cert.id.toString(),
          name: cert.certificate_name,
          file: null,
          filePath: cert.file_path,
        }));
        this.certificates.set(existingCerts);
      }
    }
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.isEditing.set(false);
    this.resetForm();
  }

  addCertificate() {
    const newCert: Certificate = {
      id: Date.now().toString(),
      name: '',
      file: null,
    };
    this.certificates.update((certs) => [...certs, newCert]);
  }

  removeCertificate(id: string) {
    this.certificates.update((certs) => certs.filter((c) => c.id !== id));
  }

  onTORUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.sweetAlert.warning('TOR must be a PDF file');
        event.target.value = '';
        return;
      }
      this.formData.torFile = file;
      this.errorMessage.set('');
    }
  }

  onPDSUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.formData.pdsFile = file;
    }
  }

  onDiplomaUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.formData.diplomaFile = file;
    }
  }

  onCertificateFileChange(event: any, certId: string) {
    const file = event.target.files[0];
    if (file) {
      this.certificates.update((certs) => certs.map((c) => (c.id === certId ? { ...c, file } : c)));
    }
  }

  async saveCredentials() {
    // Validate required fields
    if (
      !this.formData.education ||
      !this.formData.educationObtainedWhere ||
      !this.formData.educationObtainedWhen ||
      !this.formData.specialization ||
      !this.formData.subjectsToTeach ||
      !this.formData.appointmentNature ||
      !this.formData.status
    ) {
      this.sweetAlert.warning('Please fill in all required fields');
      return;
    }

    // Only require files if not editing (creating new)
    if (
      !this.isEditing() &&
      (!this.formData.torFile || !this.formData.pdsFile || !this.formData.diplomaFile)
    ) {
      this.sweetAlert.warning('Please upload all required documents (TOR, PDS, Diploma)');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formData = new FormData();

      // Add text fields
      formData.append('education', this.formData.education);
      formData.append('educationObtainedWhere', this.formData.educationObtainedWhere);
      formData.append('educationObtainedWhen', this.formData.educationObtainedWhen);
      formData.append('professionalLicense', this.formData.professionalLicense || '');
      formData.append('specialization', this.formData.specialization);
      formData.append('subjectsToTeach', this.formData.subjectsToTeach);
      formData.append('appointmentNature', this.formData.appointmentNature);
      formData.append('status', this.formData.status);

      // Add files
      if (this.formData.torFile) {
        formData.append('tor', this.formData.torFile);
      }
      if (this.formData.pdsFile) {
        formData.append('pds', this.formData.pdsFile);
      }
      if (this.formData.diplomaFile) {
        formData.append('diploma', this.formData.diplomaFile);
      }

      // Add certificates
      const allCerts = this.certificates().filter((c) => c.name);
      allCerts.forEach((cert, index) => {
        formData.append(`certificate_${index}_name`, cert.name);
        // If cert has filePath, it's an existing certificate - send the ID
        if (cert.filePath) {
          formData.append(`certificate_${index}_id`, cert.id);
        }
        // If cert has a new file, send it
        if (cert.file) {
          formData.append(`certificate_${index}_file`, cert.file);
        }
      });
      formData.append('certificateCount', allCerts.length.toString());

      await this.credentialsService.saveCredentials(formData);

      this.sweetAlert.success('Credentials saved successfully!');
      this.isEditing.set(false);
      await this.loadExistingCredentials();
      this.resetForm();
    } catch (error: any) {
      console.error('Save credentials error:', error);
      this.sweetAlert.error(error.error?.message || error.message || 'Failed to save credentials');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm() {
    this.formData = {
      education: '',
      educationObtainedWhere: '',
      educationObtainedWhen: '',
      professionalLicense: '',
      specialization: '',
      subjectsToTeach: '',
      appointmentNature: '',
      status: '',
      torFile: null,
      pdsFile: null,
      diplomaFile: null,
    };
    this.certificates.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async downloadDocument(fileType: 'tor' | 'pds' | 'diploma') {
    try {
      const fileNames = {
        tor: 'Transcript_of_Records.pdf',
        pds: 'Personal_Data_Sheet.pdf',
        diploma: 'Diploma.pdf',
      };
      await this.credentialsService.downloadFile(fileType, fileNames[fileType]);
    } catch (error: any) {
      this.sweetAlert.error('Failed to download file');
      console.error('Download error:', error);
    }
  }

  async downloadCertificate(certificateId: string) {
    try {
      const cert = this.savedCredentials()?.credential_certificates?.find(
        (c: any) => c.id.toString() === certificateId,
      );
      if (!cert) {
        this.sweetAlert.error('Certificate not found');
        return;
      }
      await this.credentialsService.downloadCertificate(certificateId, cert.certificate_name);
    } catch (error: any) {
      this.sweetAlert.error('Failed to download certificate');
      console.error('Download error:', error);
    }
  }
}
