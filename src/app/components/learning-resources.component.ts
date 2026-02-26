import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-learning-resources',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="containerClass()">
      <a href="https://en.wikipedia.org/wiki/Data_governance"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">📚</span>
        <span class="underline">Learn the core principles of data governance</span>
      </a>
      <a href="https://en.wikipedia.org/wiki/Data_quality"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">🔐</span>
        <span class="underline">Understand what makes data trustworthy and reliable</span>
      </a>
      <a href="https://en.wikipedia.org/wiki/Chief_data_officer"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">🏛️</span>
        <span class="underline">Discover what a CDO does and why it matters</span>
      </a>
    </div>
  `
})
export class LearningResourcesComponent {
  variant = input<'light' | 'dark'>('light');

  containerClass() {
    return 'flex flex-col space-y-3 mb-4';
  }

  linkClass() {
    const base = 'flex items-center gap-2 px-3 py-2 rounded-lg transition';
    if (this.variant() === 'dark') {
      return `${base} bg-black/20 hover:bg-black/10 text-white border border-black/30`;
    }
    return `${base} bg-white border border-gray-200 text-primary-600 hover:bg-gray-50`;
  }
}
