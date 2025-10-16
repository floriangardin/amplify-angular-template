import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sound-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      type="button" 
      (click)="toggle.emit()" 
      class="bg-transparent rounded-full w-6 h-6 flex items-center justify-center text-lg hover:bg-primary-50/20 md:w-8 md:h-8 md:text-lg"
    >
      {{ isMuted() ? '🔇' : '🔊' }}
    </button>
  `
})
export class SoundToggleComponent {
  isMuted = input.required<boolean>();
  toggle = output<void>();
}
