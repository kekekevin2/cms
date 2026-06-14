import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnnouncementService,
  Announcement,
  AnnouncementsResponse,
} from '../../../services/core/announcement.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
})
export class DeanAnnouncementsComponent implements OnInit {
  private announcementService = inject(AnnouncementService);

  announcements = signal<Announcement[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  selectedAnnouncement = signal<Announcement | null>(null);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  limit = 10;

  // Form data
  announcementForm = {
    title: '',
    content: '',
  };

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.loading.set(true);
    this.announcementService.getDeanAnnouncements(this.currentPage(), this.limit).subscribe({
      next: (response: AnnouncementsResponse) => {
        this.announcements.set(response.announcements);
        this.currentPage.set(response.currentPage);
        this.totalPages.set(response.totalPages);
        this.totalItems.set(response.totalItems);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Load announcements error:', error);
        Swal.fire('Error', 'Failed to load announcements', 'error');
        this.loading.set(false);
      },
    });
  }

  openCreateModal() {
    this.announcementForm = { title: '', content: '' };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.announcementForm = { title: '', content: '' };
  }

  createAnnouncement() {
    if (!this.announcementForm.title.trim() || !this.announcementForm.content.trim()) {
      Swal.fire('Error', 'Please fill in all fields', 'error');
      return;
    }

    this.loading.set(true);
    this.announcementService
      .createAnnouncement(this.announcementForm.title, this.announcementForm.content)
      .subscribe({
        next: (response) => {
          Swal.fire('Success', response.message, 'success');
          this.closeCreateModal();
          this.loadAnnouncements();
        },
        error: (error) => {
          console.error('Create announcement error:', error);
          Swal.fire('Error', 'Failed to create announcement', 'error');
          this.loading.set(false);
        },
      });
  }

  openEditModal(announcement: Announcement) {
    this.selectedAnnouncement.set(announcement);
    this.announcementForm = {
      title: announcement.title,
      content: announcement.content,
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedAnnouncement.set(null);
    this.announcementForm = { title: '', content: '' };
  }

  updateAnnouncement() {
    const announcement = this.selectedAnnouncement();
    if (!announcement) return;

    if (!this.announcementForm.title.trim() || !this.announcementForm.content.trim()) {
      Swal.fire('Error', 'Please fill in all fields', 'error');
      return;
    }

    this.loading.set(true);
    this.announcementService
      .updateAnnouncement(
        announcement.announcement_id,
        this.announcementForm.title,
        this.announcementForm.content,
      )
      .subscribe({
        next: (response) => {
          Swal.fire('Success', response.message, 'success');
          this.closeEditModal();
          this.loadAnnouncements();
        },
        error: (error) => {
          console.error('Update announcement error:', error);
          Swal.fire('Error', 'Failed to update announcement', 'error');
          this.loading.set(false);
        },
      });
  }

  deleteAnnouncement(announcement: Announcement) {
    Swal.fire({
      title: 'Delete Announcement?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.announcementService.deleteAnnouncement(announcement.announcement_id).subscribe({
          next: (response) => {
            Swal.fire('Deleted!', response.message, 'success');
            this.loadAnnouncements();
          },
          error: (error) => {
            console.error('Delete announcement error:', error);
            Swal.fire('Error', 'Failed to delete announcement', 'error');
            this.loading.set(false);
          },
        });
      }
    });
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadAnnouncements();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadAnnouncements();
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getReadCount(announcement: Announcement): number {
    return announcement.reads ? announcement.reads.length : 0;
  }

  getTotalReads(): number {
    return this.announcements().reduce((total, ann) => total + this.getReadCount(ann), 0);
  }

  getEngagementRate(): number {
    const total = this.announcements().length;
    if (total === 0) return 0;
    const withReads = this.announcements().filter((ann) => this.getReadCount(ann) > 0).length;
    return Math.round((withReads / total) * 100);
  }
}
