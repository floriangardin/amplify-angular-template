import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-learning-resources',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="containerClass()">
      <a href="https://moodle.arup.com/course/view.php?id=8395"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">🎓</span>
        <span class="underline">Learn data fundamentals with our Introduction to Data Course!</span>
      </a>
      <a href="https://teams.microsoft.com/l/app/f6405520-7907-4464-8f6e-9889e2fb7d8f?source=app-header-share-entrypoint&templateInstanceId=84c82f5c-e85e-4f98-8453-eeccb8583698&environment=503fd5b2-326c-ebe4-a05d-2661519175a2"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">🤖</span>
        <span class="underline">Ask Data & AI questions to Lexi, our agent!</span>
      </a>
      <a href="https://arup.sharepoint.com/sites/essentials-global-digital-technology/SitePages/Data-Literacy.aspx"
         target="_blank"
         rel="noopener noreferrer"
         [ngClass]="linkClass()">
        <span class="text-lg">🧪</span>
        <span class="underline">Attend Data Labs, live virtual collaborative sessions!</span>
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
