import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeanOrganizationEventsService,
  DeanOrganizationEvent,
} from '../../../services/dean/dean-organization-events.service';

@Component({
  selector: 'app-dean-organization-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-organization-events.html',
})
export class DeanOrganizationEventsComponent implements OnInit {
  private eventService = inject(DeanOrganizationEventsService);

  events = signal<DeanOrganizationEvent[]>([]);
  filteredEvents = signal<DeanOrganizationEvent[]>([]);
  loading = signal(false);

  // Filters
  searchTerm = signal('');
  filterStatus = signal<string>('all');
  filterOrganization = signal<string>('all');

  organizations = signal<string[]>([]);

  // SDG Modal
  showSDGModal = signal(false);
  selectedEventSDGs = signal<number[]>([]);
  selectedEventTitle = signal('');

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.filteredEvents.set(data);

        // Extract unique organizations
        const uniqueOrgs = [...new Set(data.map((e) => e.organization_name))];
        this.organizations.set(uniqueOrgs);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Load events error:', error);
        this.loading.set(false);
      },
    });
  }

  applyFilters() {
    let filtered = this.events();

    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(search) ||
          e.organization_name.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search),
      );
    }

    // Status filter
    if (this.filterStatus() !== 'all') {
      filtered = filtered.filter((e) => e.status === this.filterStatus());
    }

    // Organization filter
    if (this.filterOrganization() !== 'all') {
      filtered = filtered.filter((e) => e.organization_name === this.filterOrganization());
    }

    this.filteredEvents.set(filtered);
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusChange() {
    this.applyFilters();
  }

  onOrganizationChange() {
    this.applyFilters();
  }

  downloadFile(eventId: number) {
    this.eventService.downloadEventFile(eventId);
  }

  openSDGModal(event: DeanOrganizationEvent) {
    this.selectedEventSDGs.set(event.sdgs || []);
    this.selectedEventTitle.set(event.title);
    this.showSDGModal.set(true);
  }

  getSDGName(sdg: number): string {
    const names: { [key: number]: string } = {
      1: 'No Poverty',
      2: 'Zero Hunger',
      3: 'Good Health and Well-being',
      4: 'Quality Education',
      5: 'Gender Equality',
      6: 'Clean Water and Sanitation',
      7: 'Affordable and Clean Energy',
      8: 'Decent Work and Economic Growth',
      9: 'Industry, Innovation and Infrastructure',
      10: 'Reduced Inequalities',
      11: 'Sustainable Cities and Communities',
      12: 'Responsible Consumption and Production',
      13: 'Climate Action',
      14: 'Life Below Water',
      15: 'Life on Land',
      16: 'Peace, Justice and Strong Institutions',
      17: 'Partnerships for the Goals',
    };
    return names[sdg] || `SDG ${sdg}`;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      Planned: 'bg-blue-100 text-blue-800',
      Ongoing: 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  getSDGColor(sdg: number): string {
    const colors: { [key: number]: string } = {
      1: '#E5243B',
      2: '#DDA63A',
      3: '#4C9F38',
      4: '#C5192D',
      5: '#FF3A21',
      6: '#26BDE2',
      7: '#FCC30B',
      8: '#A21942',
      9: '#FD6925',
      10: '#DD1367',
      11: '#FD9D24',
      12: '#BF8B2E',
      13: '#3F7E44',
      14: '#0A97D9',
      15: '#56C02B',
      16: '#00689D',
      17: '#19486A',
    };
    return colors[sdg] || '#666666';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
