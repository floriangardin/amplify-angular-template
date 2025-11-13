import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgClass } from '@angular/common';


@Component({
  selector: 'app-button',
  standalone: true,

  imports: [NgClass, CommonModule],
  template: `
    <button
            class="w-full flex items-center px-4"
            [ngClass]="contentClass()"
          >
            <span class="ml-2 flex-1 text-center">Let's go</span>
            <svg class="icon icon--arrow-right w-8 h-8 ml-3 mr-2" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
                <use xlink:href="cta-arrow.svg#icon-cta-right"></use>
            </svg>
    </button>
  `,

})
export class ButtonComponent {

    contentClass = input<string>('');
  
}
