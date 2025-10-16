import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block" (keydown.escape)="open.set(false)">
      <button type="button" class="btn-select" (click)="toggle()">
        <span>{{ selectedLabel() }}</span>
        <i class="fa-solid" [class.fa-chevron-down]="!open()" [class.fa-chevron-up]="open()"></i>
      </button>
      @if (open()) {
        <ul class="dropdown-panel" role="listbox">
          @for (opt of options(); track opt.value) {
            <li>
              <button type="button" class="dropdown-item" [class.active]="opt.value === value()" (click)="choose(opt)">{{ opt.label }}</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`:host{display:inline-block}`]
})
export class DropdownComponent {
  options = input<DropdownOption[]>([]);
  value = input<string>('');
  valueChange = output<string>();
  open = signal(false);

  selectedLabel(): string {
    const v = this.value();
    return this.options().find(o => o.value === v)?.label || 'Select';
  }

  toggle(){ this.open.set(!this.open()); }
  choose(opt: DropdownOption){
    this.valueChange.emit(opt.value);
    this.open.set(false);
  }
}
