import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeanFacultyCredentialsService,
  FacultyWithCredentials,
} from '../../../services/dean/dean-faculty-credentials.service';
import { SweetAlertService } from '../../../shared/services/sweetalert.service';

@Component({
  selector: 'app-dean-faculty-credentials-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faculty-credentials-view.html',
  styleUrls: ['./faculty-credentials-view.css'],
})
export class DeanFacultyCredentialsView implements OnInit {
  facultyList = signal<FacultyWithCredentials[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = signal('');
  pageSize = 10;
  Math = Math;

  showDetailsModal = signal(false);
  selectedFaculty = signal<FacultyWithCredentials | null>(null);

  constructor(
    private credentialsService: DeanFacultyCredentialsService,
    private sweetAlert: SweetAlertService,
  ) {}

  ngOnInit() {
    this.loadFacultyCredentials();
  }

  async loadFacultyCredentials() {
    this.loading.set(true);
    try {
      const response = await this.credentialsService.getAllFacultyCredentials(
        this.currentPage(),
        this.pageSize,
        this.searchQuery(),
      );
      this.facultyList.set(response.credentials);
      this.currentPage.set(response.currentPage);
      this.totalPages.set(response.totalPages);
      this.totalItems.set(response.totalItems);
    } catch (error: any) {
      console.error('Error loading faculty credentials:', error);
      this.sweetAlert.error('Failed to load faculty credentials');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadFacultyCredentials();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadFacultyCredentials();
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
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
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

  viewDetails(faculty: FacultyWithCredentials) {
    this.selectedFaculty.set(faculty);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedFaculty.set(null);
  }

  async downloadDocument(facultyId: number, fileType: 'tor' | 'pds' | 'diploma') {
    try {
      const fileNames = {
        tor: 'Transcript_of_Records.pdf',
        pds: 'Personal_Data_Sheet.pdf',
        diploma: 'Diploma.pdf',
      };
      await this.credentialsService.downloadFile(facultyId, fileType, fileNames[fileType]);
    } catch (error: any) {
      console.error('Download error:', error);
      this.sweetAlert.error('Failed to download file');
    }
  }

  async downloadCertificate(facultyId: number, certificateId: number, certificateName: string) {
    try {
      await this.credentialsService.downloadCertificate(facultyId, certificateId, certificateName);
    } catch (error: any) {
      console.error('Download certificate error:', error);
      this.sweetAlert.error('Failed to download certificate');
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'permanent':
        return 'bg-green-100 text-green-800';
      case 'temporary':
        return 'bg-yellow-100 text-yellow-800';
      case 'part-time':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  hasCredentials(faculty: FacultyWithCredentials): boolean {
    return !!faculty.faculty_credential;
  }
}
