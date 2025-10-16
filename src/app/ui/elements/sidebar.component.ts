import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SidebarItem { label: string; icon?: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="ui-sidebar" [class.collapsed]="collapsed()">
      <button class="collapse-btn" (click)="toggle.emit()" aria-label="Toggle sidebar">
        <i class="fa-solid fa-bars"></i>
      </button>
      <ul class="mt-4">
        @for (it of items(); track it.label) {
          <li class="ui-sidebar__item">
            <span class="icon">{{ it.icon || '•' }}</span>
            <span class="label">{{ it.label }}</span>
          </li>
        }
      </ul>
    </aside>
  `,
  styles: [`:host{display:block}`]
})
export class SidebarComponent {
  collapsed = input<boolean>(false);
  items = input<SidebarItem[]>([]);
  toggle = output<void>();
}
