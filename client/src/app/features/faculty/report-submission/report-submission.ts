import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
}

interface FacultyDocument {
  document_id: number;
  document_title: string;
  activity_date: string;
  venue: string;
  participants: number;
  sdgs: number[];
  document_path: string;
  original_filename: string;
  submitted_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  review_comments?: string;
  semester: string;
  AcademicYear?: AcademicYear;
}

@Component({
  selector: 'app-faculty-report-submission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Report Submission</h2>
        <p class="text-gray-600 mt-1">Submit and manage your activity reports</p>
      </div>

      <!-- Submit New Report Button -->
      <div class="mb-6">
        <button
          (click)="showSubmitModal.set(true)"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <i class="fas fa-plus mr-2"></i>
          Submit New Report
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white p-4 rounded-lg shadow mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              [(ngModel)]="selectedAcademicYear"
              (change)="loadDocuments()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Years</option>
              @for (year of academicYears(); track year.academic_year_id) {
                <option [value]="year.academic_year_id">
                  {{ year.year_start }}-{{ year.year_end }}
                </option>
              }
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              [(ngModel)]="selectedSemester"
              (change)="loadDocuments()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer 1">Summer 1</option>
              <option value="Summer 2">Summer 2</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              [(ngModel)]="selectedStatus"
              (change)="loadDocuments()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="revision_needed">Revision Needed</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Documents Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        @if (loading()) {
          <div class="p-8 text-center">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
            <p class="text-gray-600 mt-2">Loading documents...</p>
          </div>
        } @else if (documents().length === 0) {
          <div class="p-8 text-center">
            <i class="fas fa-folder-open text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-600">No documents found</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Activity Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Semester
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Submitted
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (doc of documents(); track doc.document_id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div class="text-sm font-medium text-gray-900">{{ doc.document_title }}</div>
                      @if (doc.venue) {
                        <div class="text-xs text-gray-500">{{ doc.venue }}</div>
                      }
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                      {{ doc.activity_date | date: 'MMM d, y' }}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                      {{ doc.semester }}
                    </td>
                    <td class="px-6 py-4">
                      @if (doc.status === 'approved') {
                        <span
                          class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                        >
                          Approved
                        </span>
                      } @else if (doc.status === 'pending') {
                        <span
                          class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"
                        >
                          Pending
                        </span>
                      } @else if (doc.status === 'rejected') {
                        <span
                          class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"
                        >
                          Rejected
                        </span>
                      } @else if (doc.status === 'revision_needed') {
                        <span
                          class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                        >
                          Revision Needed
                        </span>
                      }
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                      {{ doc.submitted_date | date: 'MMM d, y' }}
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <button
                        (click)="downloadDocument(doc.document_id)"
                        class="text-blue-600 hover:text-blue-800 mr-3"
                        title="Download"
                      >
                        <i class="fas fa-download"></i>
                      </button>
                      @if (doc.review_comments) {
                        <button
                          (click)="viewComments(doc)"
                          class="text-purple-600 hover:text-purple-800"
                          title="View Comments"
                        >
                          <i class="fas fa-comment"></i>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Submit Modal -->
      @if (showSubmitModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold text-gray-900 mb-4">Submit New Report</h3>

            <form (submit)="submitDocument($event)">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <select
                    [(ngModel)]="newDocument.academic_year_id"
                    name="academic_year_id"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">Select Academic Year</option>
                    @for (year of academicYears(); track year.academic_year_id) {
                      <option [value]="year.academic_year_id">
                        {{ year.year_start }}-{{ year.year_end }}
                      </option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
                  <select
                    [(ngModel)]="newDocument.semester"
                    name="semester"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Summer 1">Summer 1</option>
                    <option value="Summer 2">Summer 2</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="newDocument.document_title"
                    name="document_title"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Auto-generated if left blank"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Activity Date
                  </label>
                  <input
                    type="date"
                    [(ngModel)]="newDocument.activity_date"
                    name="activity_date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                  <input
                    type="text"
                    [(ngModel)]="newDocument.venue"
                    name="venue"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Number of Participants
                  </label>
                  <input
                    type="number"
                    [(ngModel)]="newDocument.participants"
                    name="participants"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Sustainable Development Goals (SDGs)
                  </label>
                  <div class="grid grid-cols-3 gap-2">
                    @for (sdg of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; track sdg) {
                      <label class="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          [checked]="newDocument.sdgs.includes(sdg)"
                          (change)="toggleSDG(sdg)"
                          class="rounded text-green-600 focus:ring-green-500"
                        />
                        <span class="text-sm">SDG {{ sdg }}</span>
                      </label>
                    }
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Document *
                  </label>
                  <input
                    type="file"
                    (change)="onFileSelected($event)"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                  </p>
                </div>
              </div>

              <div class="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  (click)="showSubmitModal.set(false)"
                  class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  @if (submitting()) {
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                  }
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Comments Modal -->
      @if (showCommentsModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 class="text-xl font-bold text-gray-900 mb-4">Review Comments</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-gray-700">{{ selectedDocument()?.review_comments }}</p>
            </div>
            <div class="flex justify-end mt-6">
              <button
                (click)="showCommentsModal.set(false)"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FacultyReportSubmission implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/faculty/documents`;

  documents = signal<FacultyDocument[]>([]);
  academicYears = signal<AcademicYear[]>([]);
  loading = signal(false);
  submitting = signal(false);
  showSubmitModal = signal(false);
  showCommentsModal = signal(false);
  selectedDocument = signal<FacultyDocument | null>(null);

  selectedAcademicYear = '';
  selectedSemester = '';
  selectedStatus = '';

  newDocument = {
    academic_year_id: '',
    semester: '',
    document_title: '',
    activity_date: '',
    venue: '',
    participants: null as number | null,
    sdgs: [] as number[],
  };

  selectedFile: File | null = null;

  ngOnInit() {
    this.loadAcademicYears();
    this.loadDocuments();
  }

  loadAcademicYears() {
    this.http.get<{ academicYears: AcademicYear[] }>(`${environment.apiUrl}/dropdown/academic-years`)
      .subscribe({
        next: (response) => {
          this.academicYears.set(response.academicYears);
        },
        error: (error) => {
          console.error('Error loading academic years:', error);
        },
      });
  }

  loadDocuments() {
    this.loading.set(true);
    const params: any = {};
    if (this.selectedAcademicYear) params.academic_year_id = this.selectedAcademicYear;
    if (this.selectedSemester) params.semester = this.selectedSemester;
    if (this.selectedStatus) params.status = this.selectedStatus;

    this.http.get<{ documents: FacultyDocument[] }>(this.apiUrl, { params })
      .subscribe({
        next: (response) => {
          this.documents.set(response.documents);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.loading.set(false);
        },
      });
  }

  toggleSDG(sdg: number) {
    const index = this.newDocument.sdgs.indexOf(sdg);
    if (index > -1) {
      this.newDocument.sdgs.splice(index, 1);
    } else {
      this.newDocument.sdgs.push(sdg);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  submitDocument(event: Event) {
    event.preventDefault();
    if (!this.selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    this.submitting.set(true);
    const formData = new FormData();
    formData.append('document', this.selectedFile);
    formData.append('academic_year_id', this.newDocument.academic_year_id);
    formData.append('semester', this.newDocument.semester);
    if (this.newDocument.document_title) formData.append('document_title', this.newDocument.document_title);
    if (this.newDocument.activity_date) formData.append('activity_date', this.newDocument.activity_date);
    if (this.newDocument.venue) formData.append('venue', this.newDocument.venue);
    if (this.newDocument.participants) formData.append('participants', this.newDocument.participants.toString());
    if (this.newDocument.sdgs.length > 0) formData.append('sdgs', JSON.stringify(this.newDocument.sdgs));

    this.http.post(this.apiUrl, formData)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showSubmitModal.set(false);
          this.resetForm();
          this.loadDocuments();
          alert('Document submitted successfully!');
        },
        error: (error) => {
          console.error('Error submitting document:', error);
          this.submitting.set(false);
          alert('Error submitting document. Please try again.');
        },
      });
  }

  downloadDocument(documentId: number) {
    window.open(`${this.apiUrl}/${documentId}/download`, '_blank');
  }

  viewComments(doc: FacultyDocument) {
    this.selectedDocument.set(doc);
    this.showCommentsModal.set(true);
  }

  resetForm() {
    this.newDocument = {
      academic_year_id: '',
      semester: '',
      document_title: '',
      activity_date: '',
      venue: '',
      participants: null,
      sdgs: [],
    };
    this.selectedFile = null;
  }
}
