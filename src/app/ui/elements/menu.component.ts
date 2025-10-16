import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
  label: string;
  href?: string;
  active?: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="ui-menu" aria-label="Main menu">
      <ul class="flex items-center gap-2">
        @for (item of items(); track item.label) {
          <li>
            <a
              [href]="item.href || '#'"
              (click)="onClick($event, item)"
              class="menu-link"
              [class.active]="!!item.active"
            >
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class MenuComponent {
  items = input<MenuItem[]>([]);
  navigate = output<MenuItem>();

  onClick(evt: Event, item: MenuItem) {
    evt.preventDefault();
    this.navigate.emit(item);
  }
}
