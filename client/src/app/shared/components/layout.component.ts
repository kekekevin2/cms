import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Sidebar Toggle Button (Mobile) -->
    <button
      (click)="toggleSidebar()"
      type="button"
      class="text-gray-900 bg-transparent border border-transparent hover:bg-gray-200 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg ms-3 mt-3 text-sm p-2 focus:outline-none inline-flex sm:hidden"
    >
      <span class="sr-only">Open sidebar</span>
      <svg
        class="w-6 h-6"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          d="M5 7h14M5 12h14M5 17h10"
        />
      </svg>
    </button>

    <!-- Sidebar -->
    <aside
      [class.translate-x-0]="isSidebarOpen()"
      [class.-translate-x-full]="!isSidebarOpen()"
      class="fixed top-0 left-0 z-40 w-64 max-w-[85vw] h-full transition-transform sm:translate-x-0 bg-white border-r border-gray-200"
      aria-label="Sidebar"
    >
      <div class="h-full px-3 py-4 overflow-y-auto">
        <!-- Logo/Brand -->
        <div class="mb-6 px-2 flex flex-col items-center">
          <img src="/assets/logo.png" alt="Logo" class="h-10 sm:h-24 w-auto mb-2 sm:mb-3" />
          @if (authService.currentUser()?.role === 'admin') {
            <h2 class="text-xl font-bold text-gray-900 text-center">Admin Portal</h2>
          } @else {
            <h2 class="text-lg font-bold text-gray-900 text-center">Faculty Portal</h2>
            <p class="text-xs text-gray-500 text-center mt-0.5">
              {{ authService.currentUser()?.profile?.first_name }}
              {{ authService.currentUser()?.profile?.last_name }}
            </p>
          }
        </div>

        @if (authService.currentUser()?.role === 'admin') {
          <ul class="space-y-2 font-medium">
            <li>
              <button
                (click)="selectTab('dean')"
                [class.bg-green-50]="activeTab() === 'dean'"
                [class.text-green-600]="activeTab() === 'dean'"
                [class.dark:bg-green-900]="activeTab() === 'dean'"
                [class.dark:text-green-300]="activeTab() === 'dean'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    d="M4.5 17H4a1 1 0 0 1-1-1 3 3 0 0 1 3-3h1m0-3.05A2.5 2.5 0 1 1 9 5.5M19.5 17h.5a1 1 0 0 0 1-1 3 3 0 0 0-3-3h-1m0-3.05a2.5 2.5 0 1 0-2-4.45m.5 13.5h-7a1 1 0 0 1-1-1 3 3 0 0 1 3-3h3a3 3 0 0 1 3 3 1 1 0 0 1-1 1Zm-1-9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Dean</span>
              </button>
            </li>

            <li>
              <button
                (click)="selectTab('faculty')"
                [class.bg-green-50]="activeTab() === 'faculty'"
                [class.text-green-600]="activeTab() === 'faculty'"
                [class.dark:bg-green-900]="activeTab() === 'faculty'"
                [class.dark:text-green-300]="activeTab() === 'faculty'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    d="M16 19h4a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-2m-2.236-4a3 3 0 1 0 0-4M3 18v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm8-10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Faculty</span>
              </button>
            </li>

            <li>
              <button
                (click)="selectTab('organizations')"
                [class.bg-green-50]="activeTab() === 'organizations'"
                [class.text-green-600]="activeTab() === 'organizations'"
                [class.dark:bg-green-900]="activeTab() === 'organizations'"
                [class.dark:text-green-300]="activeTab() === 'organizations'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.143 4H4.857A.857.857 0 0 0 4 4.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 10 9.143V4.857A.857.857 0 0 0 9.143 4Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 20 9.143V4.857A.857.857 0 0 0 19.143 4Zm-10 10H4.857a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286A.857.857 0 0 0 9.143 14Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286a.857.857 0 0 0-.857-.857Z"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Organizations</span>
              </button>
            </li>

            <li class="pt-4 mt-4 border-t border-gray-200"></li>

            <li>
              <button
                (click)="selectTab('departments')"
                [class.bg-green-50]="activeTab() === 'departments'"
                [class.text-green-600]="activeTab() === 'departments'"
                [class.dark:bg-green-900]="activeTab() === 'departments'"
                [class.dark:text-green-300]="activeTab() === 'departments'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 4h12M6 4v16M6 4H5m13 0v16m0-16h1m-1 16H6m12 0h1M6 20H5M9 7h1v1H9V7Zm5 0h1v1h-1V7Zm-5 4h1v1H9v-1Zm5 0h1v1h-1v-1Zm-3 4h2a1 1 0 0 1 1 1v4h-4v-4a1 1 0 0 1 1-1Z"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Departments</span>
              </button>
            </li>

            <li>
              <button
                (click)="selectTab('programs')"
                [class.bg-green-50]="activeTab() === 'programs'"
                [class.text-green-600]="activeTab() === 'programs'"
                [class.dark:bg-green-900]="activeTab() === 'programs'"
                [class.dark:text-green-300]="activeTab() === 'programs'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6.03v13m0-13c-2.819-.831-4.715-1.076-8.029-1.023A.99.99 0 0 0 3 6v11c0 .563.466 1.014 1.03 1.007 3.122-.043 5.018.212 7.97 1.023m0-13c2.819-.831 4.715-1.076 8.029-1.023A.99.99 0 0 1 21 6v11c0 .563-.466 1.014-1.03 1.007-3.122-.043-5.018.212-7.97 1.023"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Programs</span>
              </button>
            </li>

            <li>
              <button
                (click)="selectTab('sections')"
                [class.bg-green-50]="activeTab() === 'sections'"
                [class.text-green-600]="activeTab() === 'sections'"
                [class.dark:bg-green-900]="activeTab() === 'sections'"
                [class.dark:text-green-300]="activeTab() === 'sections'"
                class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  class="shrink-0 w-5 h-5 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-3 5h3m-6 0h.01M12 16h3m-6 0h.01M10 3v4h4V3h-4Z"
                  />
                </svg>
                <span class="flex-1 ms-3 whitespace-nowrap text-left">Sections</span>
              </button>
            </li>

            <li class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700"></li>

            <!-- Bottom Section: Profile -->
            <li class="flex items-center gap-2">
              <!-- Admin Profile Dropdown -->
              <div class="relative flex-1">
                <button
                  (click)="toggleDropdown()"
                  class="flex items-center justify-between w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
                >
                  <div class="flex items-center">
                    <svg
                      class="shrink-0 w-5 h-5 transition duration-75"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    <span class="flex-1 ms-3 whitespace-nowrap text-left">
                      {{ authService.currentUser()?.profile?.first_name }}
                      {{ authService.currentUser()?.profile?.last_name }}
                    </span>
                  </div>
                  <svg
                    class="w-4 h-4 transition-transform"
                    [class.rotate-180]="isDropdownOpen()"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>

                @if (isDropdownOpen()) {
                  <div
                    class="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
                  >
                    <a
                      href="#"
                      class="flex items-center px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg"
                    >
                      <svg
                        class="shrink-0 w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        ></path>
                      </svg>
                      <span class="whitespace-nowrap text-xs">Profile</span>
                    </a>
                    <button
                      (click)="themeService.toggleTheme()"
                      class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      @if (themeService.isDarkMode()) {
                        <i class="pi pi-sun shrink-0 w-5 h-5 mr-2 text-yellow-500 text-xs"></i>
                        <span class="whitespace-nowrap text-xs">Light Mode</span>
                      } @else {
                        <i
                          class="pi pi-moon shrink-0 w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400 text-xs"
                        ></i>
                        <span class="whitespace-nowrap text-xs">Dark Mode</span>
                      }
                    </button>
                    <button
                      (click)="logout()"
                      class="flex items-center w-full px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-lg"
                    >
                      <svg
                        class="shrink-0 w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        ></path>
                      </svg>
                      <span class="whitespace-nowrap text-xs">Sign Out</span>
                    </button>
                  </div>
                }
              </div>
            </li>
          </ul>
        } @else {
          <ul class="space-y-1 font-medium">
            <li>
              <a
                [routerLink]="['/' + authService.currentUser()?.role + '/dashboard']"
                routerLinkActive="bg-green-50 text-green-600"
                (click)="isSidebarOpen.set(false)"
                class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
              >
                <i class="pi pi-chart-pie shrink-0 text-sm w-5 text-center"></i>
                <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">Dashboard</span>
              </a>
            </li>

            <li class="pt-2 mt-2 border-t border-gray-200"></li>

            @if (authService.currentUser()?.role === 'faculty') {
              <li>
                <a
                  routerLink="/faculty/requirements"
                  routerLinkActive="bg-green-50 text-green-600"
                  (click)="isSidebarOpen.set(false)"
                  class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
                >
                  <i class="fas fa-award shrink-0 text-sm w-5 text-center"></i>
                  <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">Accomplishments</span>
                </a>
              </li>
              <li>
                <a
                  routerLink="/faculty/announcements"
                  routerLinkActive="bg-green-50 text-green-600"
                  (click)="isSidebarOpen.set(false)"
                  class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
                >
                  <i class="pi pi-bell shrink-0 text-sm w-5 text-center"></i>
                  <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">Announcements</span>
                </a>
              </li>
              <li>
                <a
                  routerLink="/faculty/personal-data-sheet"
                  routerLinkActive="bg-green-50 text-green-600"
                  (click)="isSidebarOpen.set(false)"
                  class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
                >
                  <i class="pi pi-id-card shrink-0 text-sm w-5 text-center"></i>
                  <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm"
                    >Personal Data Sheet</span
                  >
                </a>
              </li>
            }

            <li class="pt-2 mt-2 border-t border-gray-200"></li>

            <!-- Bottom Section: Sign Out -->
            <li>
              <div class="relative flex-1">
                <button
                  (click)="toggleDropdown()"
                  class="flex items-center justify-between w-full px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
                >
                  <div class="flex items-center">
                    <i class="pi pi-user shrink-0 text-sm w-5 text-center"></i>
                    <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">
                      {{ authService.currentUser()?.profile?.first_name }}
                      {{ authService.currentUser()?.profile?.last_name }}
                    </span>
                  </div>
                  <i
                    class="pi pi-chevron-down text-xs transition-transform"
                    [class.rotate-180]="isDropdownOpen()"
                  ></i>
                </button>

                @if (isDropdownOpen()) {
                  <div
                    class="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg"
                  >
                    <button
                      (click)="themeService.toggleTheme()"
                      class="inline-flex items-center gap-2 w-full px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      @if (themeService.isDarkMode()) {
                        <i class="pi pi-sun text-xs text-yellow-500"></i>
                        <span class="whitespace-nowrap text-xs">Light Mode</span>
                      } @else {
                        <i class="pi pi-moon text-xs text-indigo-600"></i>
                        <span class="whitespace-nowrap text-xs">Dark Mode</span>
                      }
                    </button>
                    <button
                      (click)="logout()"
                      class="inline-flex items-center gap-2 w-full px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-b-lg"
                    >
                      <i class="pi pi-sign-out text-xs"></i>
                      <span class="whitespace-nowrap text-xs">Sign Out</span>
                    </button>
                  </div>
                }
              </div>
            </li>
          </ul>
        }
      </div>
    </aside>

    @if (isSidebarOpen()) {
      <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
    }

    <!-- Main Content -->
    <div class="p-4 sm:ml-64 bg-gray-50 min-h-screen">
      <ng-content></ng-content>
    </div>
  `,
  styles: [],
})
export class LayoutComponent {
  isSidebarOpen = signal(false);
  activeTab = signal<string>('dean');
  isDropdownOpen = signal(false);

  @Output() tabChange = new EventEmitter<string>();

  constructor(
    public authService: Auth,
    public themeService: ThemeService,
  ) {}

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleDropdown() {
    this.isDropdownOpen.set(!this.isDropdownOpen());
  }

  selectTab(tab: string) {
    this.activeTab.set(tab);
    this.tabChange.emit(tab);
  }

  logout() {
    this.authService.logout();
  }
}
