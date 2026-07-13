import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FacultyRequirementService,
  RequirementSubmission,
  STANDARD_REQUIREMENTS,
} from '../../../services/faculty/faculty-requirement.service';
import { DropdownService, DropdownAcademicYear } from '../../../services/core/dropdown.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-faculty-requirements',
  imports: [CommonModule, FormsModule],
  templateUrl: './requirements.html',
  styleUrl: './requirements.css',
})
export class FacultyRequirements implements OnInit {
  requirements = signal<RequirementSubmission[]>([]);
  standardRequirements = STANDARD_REQUIREMENTS;
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  academicYearsList = signal<DropdownAcademicYear[]>([]);
  selectedAcademicYear: number = 0;
  selectedSemester: string = '';
  selectedStatus: string = '';

  // For submit modal
  showSubmitModal = signal(false);
  submitForm = {
    academic_year_id: 0,
    semester: '',
    requirement_name: '',
    custom_requirement_name: '',
  };
  selectedFiles: File[] = [];
  uploading = signal(false);

  // For add files modal
  showAddFilesModal = signal(false);
  addFilesSubmission = signal<RequirementSubmission | null>(null);
  addFiles: File[] = [];

  // For view modal
  showViewModal = signal(false);
  viewingRequirement = signal<RequirementSubmission | null>(null);

  // For edit modal
  showEditModal = signal(false);
  editingRequirement = signal<RequirementSubmission | null>(null);
  editForm = {
    submission_id: 0,
    academic_year_id: 0,
    semester: '',
    requirement_name: '',
    custom_requirement_name: '',
  };
  editFiles: File[] = [];

  Math = Math;

  constructor(
    private requirementService: FacultyRequirementService,
    private dropdownService: DropdownService,
  ) {}

  ngOnInit() {
    this.loadAcademicYears();
    this.loadRequirements();
  }

  loadAcademicYears() {
    this.dropdownService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYearsList.set(years);
        // Set latest (first) academic year and semester as default
        if (years.length > 0) {
          this.selectedAcademicYear = years[0].academic_year_id;
          this.submitForm.academic_year_id = years[0].academic_year_id;
        }
        this.selectedSemester = '1st Semester';
        this.submitForm.semester = '1st Semester';
      },
      error: (error) => {
        console.error('Error loading academic years:', error);
      },
    });
  }

  loadRequirements() {
    this.loading.set(true);
    this.requirementService
      .getMyRequirements(
        this.currentPage(),
        this.pageSize,
        this.selectedAcademicYear || undefined,
        this.selectedSemester || undefined,
        this.selectedStatus || undefined,
      )
      .subscribe({
        next: (response) => {
          this.requirements.set(response.requirements);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading requirements:', error);
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load requirements',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  filterRequirements() {
    this.currentPage.set(1);
    this.loadRequirements();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadRequirements();
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

  openSubmitModal() {
    this.showSubmitModal.set(true);
    this.submitForm.semester = '';
    this.submitForm.requirement_name = '';
    this.submitForm.custom_requirement_name = '';
    this.selectedFiles = [];
  }

  closeSubmitModal() {
    this.showSubmitModal.set(false);
    this.submitForm.semester = '';
    this.submitForm.requirement_name = '';
    this.submitForm.custom_requirement_name = '';
    this.submitForm.requirement_name = '';
    this.selectedFiles = [];
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      // Check file count limit
      if (files.length > 10) {
        Swal.fire({
          icon: 'warning',
          title: 'Too Many Files',
          text: 'You can upload a maximum of 10 files at once. Please select fewer files.',
          confirmButtonColor: '#2563eb',
        });
        input.value = ''; // Clear the input
        return;
      }
      
      const maxSize = 200 * 1024 * 1024; // 200MB
      const oversizedFiles = files.filter(f => f.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: `Some files exceed the 200MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
          confirmButtonColor: '#2563eb',
        });
        input.value = ''; // Clear the input
        return;
      }
      
      this.selectedFiles = files;
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  submitRequirement() {
    if (
      !this.submitForm.academic_year_id ||
      !this.submitForm.semester ||
      !this.submitForm.requirement_name ||
      this.selectedFiles.length === 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Form',
        text: 'Please fill all fields and select at least one file',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    // Check if "Other Documents" is selected and custom name is required
    if (this.submitForm.requirement_name === 'Other Documents' && !this.submitForm.custom_requirement_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Document Name Required',
        text: 'Please enter a name for your document',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    // Use custom name if "Other Documents" is selected, otherwise use the selected requirement name
    const requirementName = this.submitForm.requirement_name === 'Other Documents' 
      ? this.submitForm.custom_requirement_name 
      : this.submitForm.requirement_name;

    this.uploading.set(true);
    this.requirementService
      .submitRequirement(
        this.submitForm.academic_year_id,
        this.submitForm.semester,
        requirementName,
        this.selectedFiles,
      )
      .subscribe({
        next: (response) => {
          this.uploading.set(false);
          
          // Add the new submission to the list instantly
          if (response.submission) {
            const currentReqs = this.requirements();
            // Add new item at the beginning (since list is sorted DESC by date)
            this.requirements.set([response.submission, ...currentReqs]);
            this.totalItems.set(this.totalItems() + 1);
          }
          
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Portfolio submitted successfully',
            confirmButtonColor: '#2563eb',
            timer: 1500,
            showConfirmButton: false,
          });
          this.closeSubmitModal();
        },
        error: (error) => {
          this.uploading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to submit requirement',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  openAddFilesModal(submission: RequirementSubmission) {
    if (submission.status === 'validated') {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Add Files',
        text: 'Cannot add files to a validated requirement',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    this.addFilesSubmission.set(submission);
    this.showAddFilesModal.set(true);
    this.addFiles = [];
  }

  closeAddFilesModal() {
    this.showAddFilesModal.set(false);
    this.addFilesSubmission.set(null);
    this.addFiles = [];
  }

  onAddFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      // Check file count limit
      if (files.length > 10) {
        Swal.fire({
          icon: 'warning',
          title: 'Too Many Files',
          text: 'You can upload a maximum of 10 files at once. Please select fewer files.',
          confirmButtonColor: '#2563eb',
        });
        input.value = ''; // Clear the input
        return;
      }
      
      const maxSize = 200 * 1024 * 1024; // 200MB
      const oversizedFiles = files.filter(f => f.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: `Some files exceed the 200MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
          confirmButtonColor: '#2563eb',
        });
        input.value = ''; // Clear the input
        return;
      }
      
      this.addFiles = files;
    }
  }

  removeAddFile(index: number) {
    this.addFiles.splice(index, 1);
  }

  submitAddFiles() {
    if (this.addFiles.length === 0 || !this.addFilesSubmission()) {
      Swal.fire({
        icon: 'warning',
        title: 'No Files Selected',
        text: 'Please select at least one file to upload',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    this.uploading.set(true);
    this.requirementService
      .addFiles(this.addFilesSubmission()!.submission_id, this.addFiles)
      .subscribe({
        next: () => {
          this.uploading.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Files added successfully',
            confirmButtonColor: '#2563eb',
          });
          this.closeAddFilesModal();
          this.loadRequirements();
        },
        error: (error) => {
          this.uploading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to add files',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  deleteSubmission(submission_id: number) {
    // Check if trying to delete a validated portfolio
    const requirement = this.requirements().find(r => r.submission_id === submission_id);
    if (requirement && requirement.status === 'validated') {
      Swal.fire({
        icon: 'info',
        title: 'Cannot Delete',
        text: 'Validated portfolios cannot be deleted. Please contact your dean if this needs to be removed.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    
    Swal.fire({
      title: 'Delete Submission?',
      text: 'Are you sure you want to delete this submission? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.requirementService.deleteRequirement(submission_id).subscribe({
          next: () => {
            // Remove from list instantly
            const currentReqs = this.requirements();
            this.requirements.set(currentReqs.filter(r => r.submission_id !== submission_id));
            this.totalItems.set(this.totalItems() - 1);
            
            Swal.fire({
              icon: 'success',
              title: 'Deleted',
              text: 'Submission deleted successfully',
              confirmButtonColor: '#2563eb',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to delete submission',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  downloadFile(submission_id: number) {
    this.requirementService.downloadRequirement(submission_id);
  }

  downloadSingleFile(submission_id: number, file_id: number, fileName: string) {
    this.requirementService.downloadSingleFile(submission_id, file_id, fileName);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'validated':
        return 'Validated';
      case 'pending':
        return 'Pending';
      case 'returned':
        return 'Returned';
      default:
        return status;
    }
  }

  getSemesterLabel(semester: string): string {
    const map: Record<string, string> = {
      '1st Sem': '1st Semester',
      '2nd Sem': '2nd Semester',
      'Midterm 1': '1st Semester',
      'Midterm 2': '2nd Semester',
      Summer: 'Summer 1',
    };
    return map[semester] ?? semester;
  }

  // View requirement
  viewRequirement(requirement: RequirementSubmission) {
    this.viewingRequirement.set(requirement);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.viewingRequirement.set(null);
  }

  // Edit requirement
  editRequirement(requirement: RequirementSubmission) {
    // Check if portfolio is validated
    if (requirement.status === 'validated') {
      Swal.fire({
        icon: 'info',
        title: 'Cannot Edit',
        text: 'Validated portfolios cannot be edited. Please contact your dean if changes are needed.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    
    this.editingRequirement.set(requirement);
    this.editForm = {
      submission_id: requirement.submission_id,
      academic_year_id: requirement.academic_year_id,
      semester: requirement.semester,
      requirement_name: requirement.requirement_name,
      custom_requirement_name: requirement.requirement_name,
    };
    this.editFiles = [];
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingRequirement.set(null);
    this.editFiles = [];
  }

  onEditFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      if (files.length > 10) {
        Swal.fire({
          icon: 'warning',
          title: 'Too Many Files',
          text: 'You can upload a maximum of 10 files at once.',
          confirmButtonColor: '#2563eb',
        });
        input.value = '';
        return;
      }
      
      const maxSize = 200 * 1024 * 1024;
      const oversizedFiles = files.filter(f => f.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: `Some files exceed 200MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
          confirmButtonColor: '#2563eb',
        });
        input.value = '';
        return;
      }
      
      this.editFiles = files;
    }
  }

  removeEditFile(index: number) {
    this.editFiles.splice(index, 1);
  }

  removeExistingFile(submission_id: number, file_id: number) {
    Swal.fire({
      title: 'Remove File?',
      text: 'Are you sure you want to remove this file?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.requirementService.deleteFile(submission_id, file_id).subscribe({
          next: () => {
            // Update the editing requirement files instantly
            const currentEditing = this.editingRequirement();
            if (currentEditing && currentEditing.files) {
              const updatedFiles = currentEditing.files.filter(f => f.file_id !== file_id);
              this.editingRequirement.set({
                ...currentEditing,
                files: updatedFiles
              });
              
              // Also update in the main list
              const currentReqs = this.requirements();
              const index = currentReqs.findIndex(r => r.submission_id === submission_id);
              if (index !== -1) {
                const newReqs = [...currentReqs];
                newReqs[index] = {
                  ...newReqs[index],
                  files: updatedFiles
                };
                this.requirements.set(newReqs);
              }
            }
            
            Swal.fire({
              icon: 'success',
              title: 'Removed',
              text: 'File removed successfully',
              confirmButtonColor: '#2563eb',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to remove file',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  updateRequirement() {
    if (!this.editForm.academic_year_id || !this.editForm.semester || !this.editForm.requirement_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Form',
        text: 'Please fill all required fields',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    // Check if editing requirement has at least one file (existing or new)
    const hasExistingFiles = this.editingRequirement()?.files && this.editingRequirement()!.files!.length > 0;
    if (!hasExistingFiles && this.editFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Files',
        text: 'Portfolio must have at least one file. Please add files.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const requirementName = this.editForm.requirement_name === 'Other Documents'
      ? this.editForm.custom_requirement_name
      : this.editForm.requirement_name;

    this.uploading.set(true);

    // If there are new files to add, add them first
    if (this.editFiles.length > 0) {
      this.requirementService.addFiles(this.editForm.submission_id, this.editFiles).subscribe({
        next: (response) => {
          this.uploading.set(false);
          
          // Update the item in the list instantly
          const currentReqs = this.requirements();
          const index = currentReqs.findIndex(r => r.submission_id === this.editForm.submission_id);
          if (index !== -1) {
            // Reload this specific item from server to get updated files
            this.requirementService.getMyRequirements(1, 1000).subscribe({
              next: (res) => {
                const updated = res.requirements.find(r => r.submission_id === this.editForm.submission_id);
                if (updated) {
                  const newReqs = [...currentReqs];
                  newReqs[index] = updated;
                  this.requirements.set(newReqs);
                }
              }
            });
          }
          
          Swal.fire({
            icon: 'success',
            title: 'Updated',
            text: 'Portfolio updated successfully',
            confirmButtonColor: '#2563eb',
            timer: 1500,
            showConfirmButton: false,
          });
          this.closeEditModal();
        },
        error: (error) => {
          this.uploading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update portfolio',
            confirmButtonColor: '#2563eb',
          });
        },
      });
    } else {
      // No new files, just show success (metadata updates would go here if backend supported it)
      this.uploading.set(false);
      Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: 'Portfolio updated successfully',
        confirmButtonColor: '#2563eb',
        timer: 1500,
        showConfirmButton: false,
      });
      this.closeEditModal();
    }
  }
}
