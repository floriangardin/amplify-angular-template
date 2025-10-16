import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" (keydown.escape)="onCancel()">
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" (click)="onCancel()"></div>
    <form (submit)="submit($event)" class="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 p-6 focus:outline-none" tabindex="-1">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ title() }}</h2>
  @if (message()) {<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ message() }}</p>}
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" [for]="id">{{ label() }}</label>
      <input [id]="id" type="text" class="w-full text-white rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" [(ngModel)]="value" name="value" required minlength="2" maxlength="80" placeholder="Enter name" autofocus />
  @if (hint()) {<p class="mt-2 text-xs text-gray-500">{{ hint() }}</p>}
      <div class="flex items-center justify-end gap-3 mt-6">
        <button type="button" class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" (click)="onCancel()" aria-label="Cancel input">{{ cancelLabel() }}</button>
        <button type="submit" class="px-4 py-2 text-sm font-semibold rounded-md bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-50" [disabled]="!isValid()" aria-label="Confirm input">{{ confirmLabel() }}</button>
      </div>
    </form>
  </div>
  `,
  styles: []
})
export class InputDialogComponent {
  id = `input-${Math.random().toString(36).slice(2)}`;
  title = input<string>('Create Game');
  message = input<string>('Provide a name for the new game.');
  label = input<string>('Game Name');
  hint = input<string>('2-80 characters. You can change it later.');
  confirmLabel = input<string>('Create');
  cancelLabel = input<string>('Cancel');
  defaultValue = input<string>('');

  confirmed = output<string>();
  cancelled = output<void>();

  value: string = '';

  ngOnInit(){
    this.value = this.defaultValue();
  }

  isValid(){
    return this.value && this.value.trim().length >= 2 && this.value.trim().length <= 80;
  }

  submit(evt: Event){
    evt.preventDefault();
    if(!this.isValid()) return;
    this.confirmed.emit(this.value.trim());
  }

  onCancel(){
    this.cancelled.emit();
  }
}
