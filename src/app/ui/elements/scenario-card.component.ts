import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Scenario } from '../../models/game-content';
import { UserService } from '../../services/user.service';
import { EditableTextComponent } from '../fields/editable-text.component';
import { EditableImageComponent } from '../fields/editable-image.component';

@Component({
  selector: 'app-scenario-card',
  standalone: true,
  imports: [CommonModule, NgClass, EditableTextComponent, EditableImageComponent],
  template: `
  <div
    class="relative group w-full select-none"
    [ngClass]="{ 'opacity-60 grayscale cursor-not-allowed': locked() }"
    (mouseenter)="onMouseEnter()"
    (mouseleave)="onMouseLeave()"
    (click)="onSelect()"
    role="button"
    [attr.aria-disabled]="locked()"
  >
    <!-- Base tile (thumbnail only) -->
    <div class="relative w-full overflow-hidden rounded-xl bg-black/5 shadow-md transition-shadow duration-200 group-hover:shadow-lg">
      <!-- 16:9 container -->
          @if (hasLogo()) {
            <app-editable-image
              class="cursor-pointer"
              [assetId]="assetPath()"
              [alt]="scenario()?.scenarioTitle || 'Scenario'"
              [imgClass]="'inset-0 h-36 w-64 object-cover'"
              [isEditable]="false"
            ></app-editable-image>
          } @else {
            <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
              <i class="fa-regular fa-image text-3xl"></i>
            </div>
          }

      <!-- Optional small badge on locked -->
      @if (locked()) {
        <div class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-yellow-400/95 px-2 py-0.5 text-[10px] font-bold text-gray-900 shadow">
          <i class="fa-solid fa-lock"></i>
          <span>PRO</span>
        </div>
      }
    </div>

    <!-- Expanded flyout (Netflix-style) -->
    @if (isExpanded()) {
      <div
        class="card absolute z-30 left-0 right-0 -top-2 mx-auto w-full origin-top overflow-visible"
        (click)="$event.stopPropagation()"
      >
        <div class="relative rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-150 ease-out"
             style="transform: scale(1.12);">
          <!-- Top: image 16:9 -->
          <div class="relative w-full" style="padding-top: 56.25%;">
            <div class="absolute inset-0">
              @if (hasLogo()) {
                <app-editable-image
                  [assetId]="assetPath()"
                  [alt]="scenario()?.scenarioTitle || 'Scenario'"
                  [imgClass]="'inset-0 h-36 w-64 object-cover'"
                  [isEditable]="isAdmin()"
                ></app-editable-image>
              } @else {
                <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                  <i class="fa-regular fa-image text-3xl"></i>
                </div>
              }
            </div>
          </div>

          <!-- Details -->
          <div class="p-4 md:p-5">
            <div class="flex items-start justify-between gap-3">
              <app-editable-text
                class="block flex-1"
                [text]="scenario()?.scenarioTitle || scenario()?.title || scenario()?.name || 'Untitled scenario'"
                [isMarkdown]="true"
                [isEditable]="isAdmin()"
                [contentClass]="'prose prose-gray max-w-none text-gray-900 prose-h1:my-0 prose-h1:text-xl md:prose-h1:text-2xl prose-p:my-0'"
              />
              @if (scenarioPlan() === 'pro') {
                <span class="ml-2 shrink-0 self-start rounded-full bg-yellow-500 px-2.5 py-1 text-[11px] font-semibold text-gray-900">PRO</span>
              }
            </div>

            @if (scenario()?.role) {
              <div class="mt-2 text-sm md:text-base text-gray-600">
                <span class="font-medium text-gray-700">Role: </span>
                <span>{{ scenario()?.role }}</span>
              </div>
            }

            @if (scenario()?.description) {
              <div class="mt-3 md:mt-4">
                <app-editable-text
                  [text]="scenario()?.description || ''"
                  [isMarkdown]="true"
                  [isEditable]="isAdmin()"
                  [contentClass]="'text-sm prose prose-sm md:prose-base max-w-none text-gray-700'"
                />
              </div>
            }

            <div class="mt-4 flex items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="locked()"
                (click)="onPlay($event)"
                aria-label="Play scenario"
              >
                <i class="fa-solid fa-play"></i>
                <span>Play</span>
              </button>
              @if (locked()) {
                <div class="text-xs md:text-sm text-gray-500">This scenario requires a Pro plan.</div>
              }
            </div>
          </div>
        </div>
      </div>
    }
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

  // Thumbnail handling
  hasLogo = computed(() => !!this.scenario()?.logoId);
  assetPath = computed(() => this.scenario()?.logoId ? `previews/${this.scenario()!.logoId}` : null);

  // Hover/expand state
  private hoverTimer: any = null;
  isExpanded = signal(false);

  onMouseEnter() {
    if (this.locked()) return; // still allow hover UI? Keep simple: no expand if locked
    this.clearHoverTimer();
    // Delay ~1.2s before expanding (Netflix-like)
    this.hoverTimer = setTimeout(() => {
      this.isExpanded.set(true);
    }, 1200);
  }

  onMouseLeave() {
    this.clearHoverTimer();
    this.isExpanded.set(false);
  }

  private clearHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
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
