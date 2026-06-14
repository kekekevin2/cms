import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dean-sidebar',
  imports: [CommonModule],
  templateUrl: './dean-sidebar.html',
  styleUrls: ['./dean-sidebar.css'],
})
export class DeanSidebar {
  isOpen = input.required<boolean>();
  activeTab = input.required<string>();

  tabChange = output<string>();

  selectTab(tab: string) {
    this.tabChange.emit(tab);
  }
}
