import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { installGlobalTooltips } from './shared/utils/tooltip.util';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');

  constructor() {
    // Every `title` attribute in the app shows the styled tooltip instead of the browser's plain one
    installGlobalTooltips();
  }
}
