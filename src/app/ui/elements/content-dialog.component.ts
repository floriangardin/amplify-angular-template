import { Component, effect, input, output, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { getUrl } from 'aws-amplify/storage';

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
  url = input<URL | null>(null);

  closed = output<void>();

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  html = signal<SafeHtml>('' as SafeHtml);
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor(){
    effect(() => {
      const path = this.url();
      this.load(path ? path.toString() : '');
    });
  }

  private load(url: string){
    this.loading.set(true);
    this.error.set('');
    this.html.set('' as SafeHtml);
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: async (res: string) => {
        try {
          const rewritten = await this.rewriteImageSrcToSignedUrls(res);
          this.html.set(this.sanitizer.bypassSecurityTrustHtml(rewritten));
        } catch (e: any) {
          // Fall back to raw HTML if rewriting fails
          this.html.set(this.sanitizer.bypassSecurityTrustHtml(res));
          this.error.set(e?.message || 'Failed to rewrite image URLs');
        } finally {
          this.loading.set(false);
        }
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Unknown error');
        this.loading.set(false);
      }
    });
  }

  /**
   * Replace relative <img src> URLs in HTML to signed Amplify Storage URLs under static_images/ prefix.
   * - Leaves absolute URLs (http, https, data, blob, //, leading /) untouched
   * - Maps any relative path to static_images/<basename>
   */
  private async rewriteImageSrcToSignedUrls(html: string): Promise<string> {
    // Create a container to manipulate DOM without rendering
    const container = document.createElement('div');
    container.innerHTML = html;

    const imgs = Array.from(container.querySelectorAll('img[src]')) as HTMLImageElement[];
    if (imgs.length === 0) return container.innerHTML;

    function isRelativeCandidate(src: string): boolean {
      if (!src) return false;
      const lower = src.toLowerCase();
      // ignore absolute or protocol-relative and data/blob URLs
      if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('blob:') || src.startsWith('//') || src.startsWith('/')) {
        return false;
      }
      return true;
    }

    function toStaticImagePath(src: string): string {
      const parts = src.split('/');
      const filename = parts[parts.length - 1];
      return `static_images/${filename}`; // preserve extension
    }

    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute('src') || '';
        if (!isRelativeCandidate(src)) return;
        const path = toStaticImagePath(src);
        try {
          // Use path to avoid implicit public/protected/private prefixes
          const { url } = await getUrl({ path, options: { expiresIn: 60 * 60 } }); // 1 hour
          img.setAttribute('src', url.toString());
        } catch (e) {
          // If generating URL fails, keep original src
        }
      })
    );

    return container.innerHTML;
  }

  onClose(){
    this.closed.emit();
  }
}
