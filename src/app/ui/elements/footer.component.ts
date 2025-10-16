import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="ui-footer">
      <p>© {{ year }} Makertools · <a class="underline" href="https://maketools.ai" target="_blank" rel="noopener">Website</a></p>
      <div class="flex items-center gap-3 text-sm">
        <a href="#" class="hover:underline">Privacy</a>
        <a href="#" class="hover:underline">Terms</a>
        <a href="#" class="hover:underline">Support</a>
      </div>
    </footer>
  `,
  styles: [`:host{display:block}`]
})
export class FooterComponent {
  year = new Date().getFullYear();
}
