import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Scenario } from '../../models/game-content';
import { UserService } from '../../services/user.service';
import { EditableTextComponent } from '../fields/editable-text.component';

@Component({
  selector: 'app-scenario-card',
  standalone: true,
  imports: [CommonModule, NgClass, EditableTextComponent],
  template: `
  <div
    class="group relative w-full overflow-hidden rounded-2xl border bg-white shadow-md transition-all duration-200 hover:shadow-xl"
    [ngClass]="{ 'opacity-60 grayscale cursor-not-allowed': locked() }"
    (click)="onSelect()"
    role="button"
    [attr.aria-disabled]="locked()"
  >
    <!-- Left illustration -->
    <div class="flex flex-row">
      <div class="relative hidden md:block w-[28%] lg:w-[26%] xl:w-[24%] shrink-0 bg-gray-50">
        <div class="h-full w-full overflow-hidden flex items-center justify-center bg-gray-50">
          @if (imageSrc()) {
            <img
              [src]="imageSrc()!"
              [alt]="scenario()?.scenarioTitle || 'Scenario'"
              class="h-32 object-center transition-transform duration-300 group-hover:scale-[1.03]"
              (error)="onImgError($event)"
            />
          } @else {
            <div class="h-full w-full grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
              <i class="fa-regular fa-image text-3xl"></i>
            </div>
          }
        </div>
        <!-- Locked ribbon -->
        @if (locked()) {
          <div class="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-yellow-400/95 px-3 py-1 text-xs font-semibold text-gray-900 shadow">
            <i class="fa-solid fa-lock"></i>
            <span>PRO</span>
          </div>
        }
      </div>

      <!-- Right content -->
      <div class="flex-1 p-5 md:p-6 lg:p-7">
        <div class="flex items-start justify-between gap-3">
          <!-- Title (Markdown, editable) -->
          <app-editable-text
            class="block flex-1"
            [text]="scenario()?.scenarioTitle || scenario()?.title || scenario()?.name || 'Untitled scenario'"
            [isMarkdown]="true"
            [isEditable]="isAdmin()"
            class="text-3xl"
            [contentClass]="'prose prose-gray max-w-none text-gray-900 prose-h1:my-0 prose-h1:text-2xl md:prose-h1:text-3xl prose-p:my-0'"
          />

          <!-- Quick chip for plan -->
          @if (scenarioPlan() === 'pro') {
            <span class="ml-2 shrink-0 self-start rounded-full bg-yellow-500 px-2.5 py-1 text-[11px] font-semibold text-gray-900">PRO</span>
          }
        </div>

        <!-- Role line -->
        @if (scenario()?.role) {
          <div class="mt-2 text-sm md:text-base text-gray-600">
            <span class="font-medium text-gray-700">Role: </span>
            <span>{{ scenario()?.role }}</span>
          </div>
        }

        <!-- Intro (Markdown, editable) -->
        @if (scenario()?.description) {
          <div class="mt-3 md:mt-4">
            <app-editable-text
              [text]="scenario()?.description || ''"
              [isMarkdown]="true"
              [isEditable]="isAdmin()"
              [contentClass]="'text-sm prose prose-sm md:prose-base lg:prose-lg max-w-none text-gray-700'"
            />
          </div>
        }

        <!-- CTA row -->
        <div class="mt-5 md:mt-6 flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm md:text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            [disabled]="locked()"
            (click)="onPlay($event)"
            aria-label="Play scenario"
          >
            <i class="fa-solid fa-play"></i>
            <span>Play</span>
          </button>

          @if (locked()) {
            <div class="text-xs md:text-sm text-gray-500">
              This scenario requires a Pro plan.
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Hover aura -->
    <div class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 transition duration-200 group-hover:ring-black/10"></div>
  </div>
  `
})
export class ScenarioCardComponent {

  // Inputs
  scenario = input<Scenario | null>(null);
  // Optional explicit disabled override
  disabled = input<boolean | null>(null);

  // Outputs
  select = output<void>();
  play = output<void>();

  isAdmin = input<boolean>(false);
  isPro = input<boolean>(false);


  scenarioPlan = computed(() => (this.scenario() as any)?.plan as string | undefined);

  locked = computed(() => {
    const explicit = this.disabled();
    if (explicit !== null) return !!explicit;
    const plan = this.scenarioPlan();
    const isPro = this.isPro();
    // Locked if scenario is pro-only and user isn't pro or pro_cancelling
    return plan === 'pro' && !isPro;
  });

  imageSrc = computed(() => {
    const id = this.scenario()?.logo?.assetId || this.scenario()?.logoCompany?.assetId || '';
    return id ? `/assets/${id}` : '';
  });

  onImgError(ev: Event) {
    const el = ev.target as HTMLImageElement;
    el.onerror = null;
    el.style.display = 'none';
  }

  onSelect() {
    if (this.locked()) return;
    this.select.emit();
  }

  onPlay(ev: MouseEvent) {
    ev.stopPropagation();
    if (this.locked()) return;
    this.play.emit();
  }
}
