import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeanFacultyNotificationService,
  FacultyMember,
  NotificationRequest,
} from '../../../services/dean/dean-faculty-notification.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-faculty-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './faculty-notifications.html',
  styleUrl: './faculty-notifications.css',
})
export class FacultyNotificationsComponent implements OnInit {
  facultyList = signal<FacultyMember[]>([]);
  filteredFacultyList = signal<FacultyMember[]>([]);
  selectedFacultyIds = signal<Set<number>>(new Set());
  searchQuery = signal('');
  
  subject = signal('');
  message = signal('');
  
  isLoading = signal(false);
  isSending = signal(false);
  
  selectAll = signal(false);

  constructor(private notificationService: DeanFacultyNotificationService) {}

  ngOnInit(): void {
    this.loadFacultyList();
  }

  /**
   * Load faculty list from the server
   */
  loadFacultyList(): void {
    this.isLoading.set(true);
    
    this.notificationService.getFacultyList().subscribe({
      next: (response) => {
        this.facultyList.set(response.faculty);
        this.filteredFacultyList.set(response.faculty);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading faculty list:', error);
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load faculty list. Please try again.',
        });
      },
    });
  }

  /**
   * Filter faculty list based on search query
   */
  filterFaculty(): void {
    const query = this.searchQuery().toLowerCase().trim();
    
    if (!query) {
      this.filteredFacultyList.set(this.facultyList());
      return;
    }

    const filtered = this.facultyList().filter(
      (faculty) =>
        faculty.full_name.toLowerCase().includes(query) ||
        faculty.employee_id.toLowerCase().includes(query) ||
        faculty.email.toLowerCase().includes(query)
    );

    this.filteredFacultyList.set(filtered);
  }

  /**
   * Toggle faculty selection
   */
  toggleFacultySelection(facultyId: number): void {
    const selected = new Set(this.selectedFacultyIds());
    
    if (selected.has(facultyId)) {
      selected.delete(facultyId);
    } else {
      selected.add(facultyId);
    }
    
    this.selectedFacultyIds.set(selected);
    this.updateSelectAllState();
  }

  /**
   * Check if faculty is selected
   */
  isFacultySelected(facultyId: number): boolean {
    return this.selectedFacultyIds().has(facultyId);
  }

  /**
   * Toggle select all faculty
   */
  toggleSelectAll(): void {
    const newSelectAll = !this.selectAll();
    this.selectAll.set(newSelectAll);

    if (newSelectAll) {
      // Select all filtered faculty
      const allIds = new Set(this.filteredFacultyList().map((f) => f.faculty_id));
      this.selectedFacultyIds.set(allIds);
    } else {
      // Deselect all
      this.selectedFacultyIds.set(new Set());
    }
  }

  /**
   * Update select all checkbox state
   */
  updateSelectAllState(): void {
    const filteredIds = this.filteredFacultyList().map((f) => f.faculty_id);
    const allSelected = filteredIds.length > 0 && 
      filteredIds.every((id) => this.selectedFacultyIds().has(id));
    this.selectAll.set(allSelected);
  }

  /**
   * Get count of selected faculty
   */
  getSelectedCount(): number {
    return this.selectedFacultyIds().size;
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.selectedFacultyIds.set(new Set());
    this.selectAll.set(false);
  }

  /**
   * Validate form before sending
   */
  validateForm(): boolean {
    if (this.selectedFacultyIds().size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Recipients',
        text: 'Please select at least one faculty member to send the notification.',
      });
      return false;
    }

    if (!this.subject().trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Subject Required',
        text: 'Please enter a subject for the notification.',
      });
      return false;
    }

    if (!this.message().trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Message Required',
        text: 'Please enter a message for the notification.',
      });
      return false;
    }

    return true;
  }

  /**
   * Send notification to selected faculty
   */
  sendNotification(): void {
    if (!this.validateForm()) {
      return;
    }

    // Confirmation dialog
    Swal.fire({
      title: 'Send Notification?',
      html: `
        <p>You are about to send this notification to <strong>${this.getSelectedCount()} faculty member(s)</strong>.</p>
        <p class="mt-2 text-sm text-gray-600">Subject: <strong>${this.subject()}</strong></p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Send',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.performSendNotification();
      }
    });
  }

  /**
   * Perform the actual notification sending
   */
  private performSendNotification(): void {
    this.isSending.set(true);

    const notificationData: NotificationRequest = {
      faculty_ids: Array.from(this.selectedFacultyIds()),
      subject: this.subject().trim(),
      message: this.message().trim(),
    };

    this.notificationService.sendNotification(notificationData).subscribe({
      next: (response) => {
        this.isSending.set(false);

        if (response.results.failed > 0) {
          // Some emails failed
          Swal.fire({
            icon: 'warning',
            title: 'Partially Sent',
            html: `
              <p>Notification sent to <strong>${response.results.successful}</strong> faculty member(s).</p>
              <p class="text-red-600 mt-2"><strong>${response.results.failed}</strong> email(s) failed to send.</p>
            `,
            confirmButtonColor: '#2563eb',
          });
        } else {
          // All emails sent successfully
          Swal.fire({
            icon: 'success',
            title: 'Notification Sent!',
            text: `Successfully sent notification to ${response.results.successful} faculty member(s).`,
            timer: 3000,
            showConfirmButton: false,
          });
        }

        // Reset form
        this.resetForm();
      },
      error: (error) => {
        this.isSending.set(false);
        console.error('Error sending notification:', error);
        
        Swal.fire({
          icon: 'error',
          title: 'Send Failed',
          text: error.error?.message || 'Failed to send notification. Please try again.',
          confirmButtonColor: '#2563eb',
        });
      },
    });
  }

  /**
   * Reset the form
   */
  resetForm(): void {
    this.subject.set('');
    this.message.set('');
    this.clearSelections();
  }

  /**
   * Insert template text into message
   */
  insertTemplate(template: string): void {
    const templates: { [key: string]: string } = {
      reminder: `Dear Faculty Member,

This is a friendly reminder regarding the upcoming deadline for submitting your requirements.

Please ensure all documents are submitted before the deadline to avoid any delays in processing.

If you have any questions or concerns, please don't hesitate to reach out.

Thank you for your cooperation.`,
      
      meeting: `Dear Faculty Member,

You are invited to attend an important meeting.

Date: [Please specify date]
Time: [Please specify time]
Venue: [Please specify venue]

Your attendance is highly appreciated.

Thank you.`,
      
      announcement: `Dear Faculty Member,

We would like to inform you about an important announcement.

[Please provide details here]

For any questions or clarifications, feel free to contact us.

Thank you.`,
    };

    this.message.set(templates[template] || '');
  }
}
