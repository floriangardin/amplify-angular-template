import { Component, effect, input, output, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-content-dialog',
  standalone: true,
  template: `
  <div class="fixed inset-0 z-[1000] flex justify-center items-stretch md:items-center" role="dialog" aria-modal="true" (keydown.escape)="onClose()">
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" (click)="onClose()"></div>
    <div class="relative w-full md:w-[95vw] max-w-6xl h-[100dvh] md:h-auto md:max-h-[85vh] overflow-hidden rounded-none md:rounded-2xl bg-white shadow-xl ring-gray-200 focus:outline-none flex flex-col">
      <div class="flex items-center bg-primary text-white justify-between px-5 py-3 border-b border-gray-200 ">
        <h2 class="text-lg font-semibold truncate">{{ title() }}</h2>
        <button type="button" class="p-2 rounded-md hover:text-gray-300" (click)="onClose()" aria-label="Close dialog">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="min-h-0 h-[100vh] flex-1 overflow-auto p-4 md:p-16">
        @if(loading()) {
          <div class="flex items-center gap-3 text-gray-500">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading content…</span>
          </div>
        } @else if(error()) {
          <div class="text-red-600">
            <p class="font-semibold mb-1">Failed to load content</p>
            <p class="text-sm">{{ error() }}</p>
          </div>
        } @else {
          <div class="prose max-w-none" [innerHTML]="html()"></div>
        }
      </div>
    </div>
  </div>
  `,
  styles: []
})
export class ContentDialogComponent {
  title = input<string>('Resource');
  /** Relative path under /content, e.g. 'overview_data_governance.html' */
  href = input<string>('');

  closed = output<void>();

  private http = inject(HttpClient);
  html = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor(){
    effect(() => {
      const path = this.href();
      if(!path) { return; }
  // Build absolute URL so the API interceptor doesn't prefix it
  const abs = new URL(`/content/${path}`, window.location.origin).toString();
  this.load(abs);
    });
  }

  private load(url: string){
    this.loading.set(true);
    this.error.set('');
    this.html.set('');
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (res: string) => {
        this.html.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Unknown error');
        this.loading.set(false);
      }
    });
  }

  onClose(){
    this.closed.emit();
  }
}
