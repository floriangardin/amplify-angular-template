import { Component, EventEmitter, Input, OnInit, Output, signal, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCDOComponent } from './base.component';
import { EditableTextComponent } from '../../../ui/fields/editable-text.component';
import { LoadingComponent } from '../../../ui/elements/loading.component';
import { EditableImageComponent } from '../../../ui/fields/editable-image.component';


@Component({
  selector: 'app-bestcdo-start',
  standalone: true,
  imports: [CommonModule, EditableTextComponent, LoadingComponent, EditableImageComponent],
  template: `
  <div class="min-h-screen min-w-screen flex items-center justify-center flex flex-col">
  <div class="relative max-w-2xl w-full max-h-full bg-white shadow shadow-lg rounded-lg md:m-6 p-6 md:px-16 md:py-8 flex flex-col items-center gap-4">
    @if(loading()){
        <app-loading [text]="'game'"></app-loading>}
    @else{
      <div class="flex flex-col md:flex-row items-center gap-4">
        <app-editable-image
        [assetId]="'previews/' +content()['nameId'] || null"
        alt="Data Stewardship Simulator logo"
        [imgClass]="'w-20 h-20 rounded-full object-cover'"
        [transform]="{ w: 256, h: 256, fmt: 'png' }"
        [isEditable]="isEditable()"
        class="flex-shrink-0">
        </app-editable-image>

        <div class="flex flex-col items-center">
        <app-editable-text 
        contentClass="text-3xl md:text-4xl font-bold text-primary-500 text-center" 
        [isEditable]="isEditable()" [text]="content().card.title" 
        class="text-gray-700 text-center mb-2"></app-editable-text>
      </div>

        <button (click)="toggleMute()" class="absolute top-2 right-2 w-9 h-9 p-4 flex items-center justify-center rounded-full border bg-gray-100">
          {{ muted() ? '🔇' : '🔊' }}
        </button>
      </div>
      <app-editable-text [contentClass]="'text-gray-700 text-justify pb-4 leading-relaxed'"
       [isEditable]="isEditable()" [text]="content().card.shortDescription || ''"
       class="text-gray-700 text-center mb-4"></app-editable-text>
      <div class="w-full p-6 card-bg rounded-lg border border-primary-200 mb-8">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-1">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex flex-col">
            <h2 class="text-lg font-semibold text-primary-700 mb-2">Skills involved</h2>
            @for(skill of content().card.skillsAcquired; track skill){
              <li class="text-gray-700 text-sm">
                {{ skill }}
            </li>
            } 

          </div>
          <div class="flex-1">
        </div>
      </div>
      </div>
      <button
      (click)="onStart()"
        class="w-full btn-cta"
      >
        <span class="flex items-center justify-center gap-2" >
          <i class="fa-solid fa-gamepad"></i>
          Play Now !
        </span>
      </button>
    }
    </div>
      </div>
  `,
  styles: [`
    
    `]
})
export class BestCDOStartComponent extends BaseCDOComponent implements OnInit  {
  isEditable = input<boolean>(false);
  loading = computed(() => !this.content());
  audioReady = signal(false);
  muted = this.sounds.muted$;

  override ngOnInit() {
    console.log('Start init; content present?', !!this.gameStateService.content());
    const enableAudio = () => {
      this.sounds.playMusic('main_menu.mp3', true, 0.3);
      this.audioReady.set(true);
      document.removeEventListener('click', enableAudio);
    };
    document.addEventListener('click', enableAudio, { once: true });

  }

  calculateAdminPath(): string | null {
    if(this.stateService.isAdmin()){
      // URL is /t/tenant/dashboard/bestcdo/1/start
      // We need to replace 'dashboard' with 'admin'
      const url = this.router.url;
      const parts = url.split('/');
      const dashboardIndex = parts.indexOf('dashboard');
      if (dashboardIndex !== -1) {
        parts[dashboardIndex] = 'admin';
        return parts.join('/');
      }
    }
    return null;
  }

  onStart() {
    this.router.navigate(['../play'], { relativeTo: this.activatedRoute, queryParamsHandling: 'preserve' });
  }



  setDifficulty(d: 'easy' | 'hard') {
    this.gameStateService.difficulty.set(d);
  }
  goToWebsite(){
    const url = "https://www.maketools.ai";
    if(url){
      window .open(url, '_blank');
    }
  }

}