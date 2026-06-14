import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OrganizationEventService,
  OrganizationEvent,
  EventGuest,
} from '../../../services/organization/organization-event.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-organization-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-events.html',
})
export class OrganizationEventsComponent implements OnInit {
  private eventService = inject(OrganizationEventService);

  events = signal<OrganizationEvent[]>([]);
  loading = signal(false);
  showEventModal = signal(false);
  isEditing = signal(false);

  selectedFile: File | null = null;

  eventForm = signal<OrganizationEvent>({
    title: '',
    date_implemented: '',
    status: 'Planned',
    start_time: '',
    end_time: '',
    description: '',
    sdgs: [],
    guests: [],
  });

  sdgList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  selectedSDGs = signal<number[]>([]);
  guestsList = signal<EventGuest[]>([]);
  newGuest = signal<EventGuest>({ guest_name: '', guest_title: '', guest_affiliation: '' });

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
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Load events error:', error);
        this.loading.set(false);
      },
    });
  }

  openEventModal(event?: OrganizationEvent) {
    if (event) {
      this.isEditing.set(true);
      this.eventForm.set({ ...event });
      this.selectedSDGs.set(event.sdgs || []);
      this.guestsList.set(event.guests || []);
      this.selectedFile = null;
    } else {
      this.isEditing.set(false);
      this.eventForm.set({
        title: '',
        date_implemented: '',
        status: 'Planned',
        start_time: '',
        end_time: '',
        description: '',
        sdgs: [],
        guests: [],
      });
      this.selectedSDGs.set([]);
      this.guestsList.set([]);
      this.selectedFile = null;
    }
    this.showEventModal.set(true);
  }

  toggleSDG(sdg: number) {
    const current = this.selectedSDGs();
    if (current.includes(sdg)) {
      this.selectedSDGs.set(current.filter((s) => s !== sdg));
    } else {
      this.selectedSDGs.set([...current, sdg]);
    }
  }

  addGuest() {
    const guest = this.newGuest();
    if (guest.guest_name.trim()) {
      this.guestsList.set([...this.guestsList(), { ...guest }]);
      this.newGuest.set({ guest_name: '', guest_title: '', guest_affiliation: '' });
    }
  }

  removeGuest(index: number) {
    this.guestsList.set(this.guestsList().filter((_, i) => i !== index));
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please select a PDF file',
        confirmButtonColor: '#dc2626',
      });
      event.target.value = '';
      this.selectedFile = null;
    }
  }

  saveEvent() {
    const form = this.eventForm();
    const formData = new FormData();

    // Add basic event data
    formData.append('title', form.title);
    formData.append('date_implemented', form.date_implemented);
    formData.append('status', form.status);
    if (form.start_time) formData.append('start_time', form.start_time);
    if (form.end_time) formData.append('end_time', form.end_time);
    if (form.description) formData.append('description', form.description);

    // Add SDGs
    formData.append('sdgs', JSON.stringify(this.selectedSDGs()));

    // Add guests
    formData.append('guests', JSON.stringify(this.guestsList()));

    // Add file if selected
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    if (this.isEditing() && form.id) {
      this.eventService.updateEvent(form.id, formData).subscribe({
        next: () => {
          this.showEventModal.set(false);
          this.selectedFile = null;
          this.loadEvents();
        },
        error: (error) => console.error('Update event error:', error),
      });
    } else {
      this.eventService.createEvent(formData).subscribe({
        next: () => {
          this.showEventModal.set(false);
          this.selectedFile = null;
          this.loadEvents();
        },
        error: (error) => console.error('Create event error:', error),
      });
    }
  }

  deleteEvent(id: number) {
    Swal.fire({
      title: 'Delete Event?',
      text: 'Are you sure you want to delete this event? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.eventService.deleteEvent(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Event has been deleted successfully',
              confirmButtonColor: '#16a34a',
              timer: 2000,
              showConfirmButton: false,
            });
            this.loadEvents();
          },
          error: (error) => {
            console.error('Delete event error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to delete event',
              confirmButtonColor: '#dc2626',
            });
          },
        });
      }
    });
  }

  downloadFile(eventId: number) {
    this.eventService.downloadEventFile(eventId);
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

  openSDGModal(event: OrganizationEvent) {
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
}
