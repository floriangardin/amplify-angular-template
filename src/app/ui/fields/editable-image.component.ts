import { Component, input, output, signal, computed, effect, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

type Transform = { w?: number; h?: number; fmt?: string };

@Component({
  selector: 'app-editable-image',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <div class="editable-wrapper"
         [class.editable]="isEditable()"
         [class.editing]="editing()"
         (dragover)="onDragOver($event)"
         (drop)="onDrop($event)">

      @if(!editing()){
        <div class="relative shrink-0 w-fit">
          @if(src()){
            <img [src]="src()" [alt]="alt()" class="block max-w-full" [ngClass]="imgClass()"/>
          }@else{
            <div class="w-full aspect-video bg-gray-100 text-gray-400 grid place-items-center rounded">No image</div>
          }
          @if(isEditable()){
            <button type="button" class="icon-button edit-btn absolute top-2 right-2"
                    (click)="startEditing()" aria-label="Edit image">
              <i class="fa fa-pen"></i>
            </button>
          }
        </div>
      }@else{
        <div class="edit-container w-full">
          <div class="w-full flex flex-col gap-2">
            <div class="relative w-full">
              @if(previewUrl()){
                <img [src]="previewUrl()!" [alt]="alt()" class="block max-w-full rounded border" [ngClass]="imgClass()"/>
              }@else if(src()){
                <img [src]="src()!" [alt]="alt()" class="" [ngClass]="imgClass()"/>
              }@else{
                <div class="w-full aspect-video bg-gray-100 text-gray-400 grid place-items-center rounded border">Drop or choose an image</div>
              }
              <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFileChosen($event)"/>
              <div class="mt-2 flex gap-2 color-gray-700 items-center">
                <button type="button" class="small-btn m-auto" (click)="triggerFileDialog()">Choose…</button>
                @if(uploading()){
                  <div class="ml-auto text-sm text-gray-500">Uploading…</div>
                }
                @if(uploadError()){
                  <div class="ml-auto text-sm text-red-600">{{ uploadError() }}</div>
                }
              </div>
            </div>

            <div class="flex gap-2">
              <button type="button" class="icon-button validate-btn" (click)="onValidate()" [disabled]="uploading()" aria-label="Validate image">
                <i class="fa fa-check"></i>
              </button>
              <button type="button" class="icon-button cancel-btn" (click)="onCancel()" [disabled]="uploading()" aria-label="Cancel">
                <i class="fa fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .editable-wrapper { position: relative;}
    .editable-wrapper.editable { border: 1px dashed #888; padding: .25rem .5rem; border-radius: 4px; }
    .icon-button { background: transparent; border: none; cursor: pointer; color: #555; padding: 4px 6px; line-height: 1; border-radius: 6px; }
    .icon-button:hover { color: #111; background: rgba(0,0,0,0.04); }
    .validate-btn { color: #1b7f1b; }
    .validate-btn:hover { color: #0e4d0e; }
    .cancel-btn { color: #aa1a1a; }
    .cancel-btn:hover { color: #6d0f0f; }
    .btn { padding: .35rem .6rem; border: 1px solid #aaa; border-radius: .375rem; background: #fff; }
    .edit-container { display: inline-block; }
  `],
  host: { class: '' }
})
export class EditableImageComponent {

  // Inputs (read-only)
  assetId = input<string | null>(null);
  alt = input<string>('');
  imgClass = input<string>('');
  transform = input<Transform | null>(null);
  isEditable = input<boolean>(false);
  
  

  // Local mirrored state for immediate UI updates
  private currentAssetId = signal<string | null>(null);
  constructor() {
    effect(() => this.currentAssetId.set(this.assetId()));
  }

  // Outputs
  newAssetId = output<string>();

  // State
  editing = signal(false);
  previewUrl = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  uploadError = signal<string | null>(null);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  src = computed(() => {
    const local = this.previewUrl();
    if (local) return local;
    const id = this.currentAssetId();
    if (!id) return '';
    const t = this.transform() ?? {};
    return '/assets/' + id 
  });

  startEditing() {
    if (!this.isEditable()) return;
    this.editing.set(true);
  }

  triggerFileDialog() {
    this.fileInputRef?.nativeElement.click();
  }

  onFileChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.setSelection(file);
    input.value = '';
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); }
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.setSelection(file);
  }

  private setSelection(file: File) {
    this.clearPreview();
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.uploadError.set(null);
  }

  hasSelection(): boolean { return !!this.selectedFile(); }

  clearSelection() {
    this.selectedFile.set(null);
    this.clearPreview();
  }

  private clearPreview() {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewUrl.set(null);
  }

  onCancel() {
    this.clearSelection();
    this.editing.set(false);
  }

  onValidate() {
    if(!this.hasSelection()) this.onCancel();
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    console.log('Uploading file', file);
    
  }
}
