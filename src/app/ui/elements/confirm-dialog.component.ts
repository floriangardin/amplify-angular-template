import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
  <div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" (keydown.escape)="onCancel()">
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" (click)="onCancel()"></div>
    <div class="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 p-6 focus:outline-none" tabindex="-1">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ title() }}</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">{{ message() }}</p>
      <div class="flex items-center justify-end gap-3">
        <button type="button" class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          (click)="onCancel()" aria-label="Cancel deletion">{{ cancelLabel() }}</button>
        <button type="button" class="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white shadow-sm hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50" (click)="onConfirm()" aria-label="Confirm deletion">{{ confirmLabel() }}</button>
      </div>
    </div>
  </div>
  `,
  styles: []
})
export class ConfirmDialogComponent {
  title = input<string>('Confirm Deletion');
  message = input<string>('Are you sure you want to delete this item? This action cannot be undone.');
  confirmLabel = input<string>('Delete');
  cancelLabel = input<string>('Cancel');

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(){
    this.confirmed.emit();
  }
  onCancel(){
    this.cancelled.emit();
  }
}
