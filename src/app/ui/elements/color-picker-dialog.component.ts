import { Component, input, output, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Simple hex validation regex (#RRGGBB)
const HEX_REGEX = /^#([0-9a-fA-F]{6})$/;

@Component({
  selector: 'app-color-picker-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true" (keydown.escape)="onCancel()">
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" (click)="onCancel()"></div>
    <form (submit)="submit($event)" class="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 p-6 focus:outline-none" tabindex="-1">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ title() }}</h2>
      @if (message()) {<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ message() }}</p>}

      <div class="flex items-center gap-4 mb-4">
        <div class="flex flex-col gap-2 grow">
          <label for="colorInput" class="text-sm font-medium text-gray-700 dark:text-gray-300">Hex Color</label>
          <input id="colorInput" type="text" class="w-full text-white rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono" [(ngModel)]="hexValue" name="hexValue" maxlength="7" placeholder="#3366FF" (input)="onHexChange()"/>
          <p class="text-xs" [class.text-red-500]="!isValid()" [class.text-gray-500]="isValid()">{{ validationMessage() }}</p>
        </div>
        <div class="flex flex-col items-center gap-2">
          <label for="nativePicker" class="text-sm font-medium text-gray-700 dark:text-gray-300">Picker</label>
          <input id="nativePicker" type="color" class="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-600 bg-transparent" [ngModel]="hexValue" (ngModelChange)="onNativePick($event)" name="nativePicker"/>
          <div class="h-6 w-14 rounded border border-gray-300 dark:border-gray-600" [style.background]="hexValue || '#ffffff'"></div>
        </div>
      </div>

      <div class="mb-5">
        <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Presets</p>
        <div class="grid grid-cols-8 gap-2">
          @for(c of presets; track c){
            <button type="button" class="h-7 w-7 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400" [style.background]="c" (click)="selectPreset(c)" [attr.aria-label]="'Choose ' + c">
              <span class="sr-only">{{ c }}</span>
            </button>
          }
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 mt-6">
        <button type="button" class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" (click)="onCancel()" aria-label="Cancel color selection">{{ cancelLabel() }}</button>
        <button type="submit" class="px-4 py-2 text-sm font-semibold rounded-md bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-50" [disabled]="!isValid()" aria-label="Confirm color selection">{{ confirmLabel() }}</button>
      </div>
    </form>
  </div>
  `,
  styles: []
})
export class ColorPickerDialogComponent {
  title = input<string>('Pick a Color');
  message = input<string>('Choose a hex color for this item.');
  confirmLabel = input<string>('Select');
  cancelLabel = input<string>('Cancel');
  defaultColor = input<string>('#3366ff');
  presetsInput = input<string[] | undefined>();

  confirmed = output<string>();
  cancelled = output<void>();

  // local state
  hexValue: string = '';
  presets: string[] = [
    '#000000', '#ffffff', '#3366ff', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
    '#2563eb', '#4b5563', '#1f2937', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777'
  ];

  ngOnInit(){
  const val = (this.defaultColor() || '').trim();
  const norm = this.normalize(val);
  this.hexValue = norm && this.isHex(norm) ? norm : '#3366ff';
    const providedPresets = this.presetsInput();
    if(providedPresets && providedPresets.length){
      // Filter invalid and merge unique
      const filtered = providedPresets
        .map(p => this.normalize(p))
        .filter((p): p is string => !!p && this.isHex(p));
      this.presets = Array.from(new Set([...filtered, ...this.presets]));
    }
  }

  normalize(v: string | undefined | null): string | undefined {
    if(!v) return undefined;
    v = v.trim();
    if(!v) return undefined;
    if(v.startsWith('#')) v = v; else if(/^[0-9a-fA-F]{6}$/.test(v)) v = '#' + v;
    return v.toLowerCase();
  }

  isHex(v: string): boolean {
    return HEX_REGEX.test(v);
  }

  isValid(): boolean {
    return this.isHex(this.hexValue);
  }

  validationMessage(): string {
    if(!this.hexValue) return 'Enter a hex color like #3366ff';
    return this.isValid() ? 'Looks good' : 'Invalid hex color (#RRGGBB)';
  }

  onHexChange(){
    if(this.hexValue && this.hexValue.length === 7){
      const norm = this.normalize(this.hexValue);
      if(norm && this.isHex(norm)){
        this.hexValue = norm;
      }
    }
  }

  onNativePick(color: string){
    this.hexValue = this.normalize(color) || '#000000';
  }

  selectPreset(color: string){
    this.hexValue = color;
  }

  submit(evt: Event){
    evt.preventDefault();
    if(!this.isValid()) return;
    this.confirmed.emit(this.hexValue);
  }

  onCancel(){
    this.cancelled.emit();
  }
}
