import { Component, computed, input, output, signal, OnInit, OnDestroy, ElementRef, ViewChild, TemplateRef, inject, ViewContainerRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Scenario } from '../../models/game-content';
import { EditableImageComponent } from '../fields/editable-image.component';
import { OverlayModule, Overlay, OverlayRef, ConnectedPosition } from '@angular/cdk/overlay';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { ScenarioFlyoutRegistryService } from '../utils/scenario-flyout-registry.service';

@Component({
  selector: 'app-scenario-card',
  standalone: true,
  imports: [CommonModule, NgClass, EditableImageComponent, OverlayModule, PortalModule],
  template: `
  <div
    #anchor
    class="relative group w-full select-none"
    [ngClass]="{ 'cursor-not-allowed': locked(), 'z-40': isExpanded() }"
    (mouseenter)="onMouseEnter()"
    (mouseleave)="onMouseLeave()"
    (click)="onSelect()"
    role="button"
    [attr.aria-disabled]="locked()"
  >
    <!-- Base tile (thumbnail only) -->
    <div class="relative w-full overflow-hidden rounded-xl bg-transparent shadow-md transition-shadow duration-200 group-hover:shadow-lg" [ngClass]="{ 'opacity-60 grayscale': locked() }">
      <!-- 16:9 container -->
      <div class="relative w-full aspect-[16/9]">
        @if (hasLogo()) {
          <app-editable-image
            class="cursor-pointer"
            [assetId]="assetPath()"
            [alt]="scenario()!.card.title || 'Scenario'"
            [imgClass]="'block h-full w-full object-cover'"
            [isEditable]="isAdmin()"
          ></app-editable-image>
        } @else {
          <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
            <i class="fa-regular fa-image text-3xl"></i>
          </div>
        }
      </div>

      <!-- Optional small badge on locked -->
      @if (locked()) {
        <div class="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-yellow-400/95 px-2 py-0.5 text-[10px] font-bold text-gray-900 shadow">
          <i class="fa-solid fa-lock"></i>
          <span>PRO</span>
        </div>
      }
      <!-- Completion tick -->
      @if (completed()) {
        <div class="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <i class="fa-solid fa-check"></i>
          <span>Done</span>
        </div>
      }
      <!-- Profit badge if available -->
      @if (profit() !== undefined) {
        <div class="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
          <i class="fa-solid fa-coins"></i>
          <span>{{ profit() | number:'1.0-0' }}</span>
          @if (medalEmoji()) {
            <span class="ml-1">{{ medalEmoji() }}</span>
          }
        </div>
      }
    </div>

    <!-- Overlay template (rendered via CDK Overlay when expanded) -->
    <ng-template #flyoutTpl>
      <div class="relative md:rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-y-scroll w-[100vw] h-[100vh] md:h-auto md:w-[640px] lg:w-[800px] md:max-h-[80vh] flyout-enter"
           (mouseenter)="onOverlayEnter()" (mouseleave)="onOverlayLeave()" (click)="$event.stopPropagation()">
        <!-- Mobile header -->
        <div class="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button type="button" class="inline-flex items-center gap-2 text-gray-700" (click)="onBackClick($event)" aria-label="Close details">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Back</span>
          </button>
          @if (scenarioPlan() === 'pro') {
            <span class="ml-2 shrink-0 self-start rounded-full bg-yellow-500 px-2.5 py-1 text-[11px] font-semibold text-gray-900">PRO</span>
          }
        </div>
        <!-- Image -->
        <div class="relative w-full bg-black">
          <div class="relative w-full md:w-1/2 align-middle md:align-top mx-auto">
            @if (hasLogo()) {
              <app-editable-image
                [assetId]="assetPath()"
                [alt]="scenario()!.card.title || 'Scenario'"
                [imgClass]="'block h-full w-full object-cover object-center'"
                [isEditable]="isAdmin()"
              ></app-editable-image>
            } @else {
              <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                <i class="fa-regular fa-image text-3xl"></i>
              </div>
            }
            @if (!isAdmin()) {
              <button type="button" class="absolute inset-0" [disabled]="locked()" (click)="onPlay($event)" aria-label="Play from image"></button>
            }
          </div>
        </div>
        <!-- Details -->
        <div class="p-4 md:p-5 md:overflow-y-auto md:max-h-[calc(80vh-4rem)]">
          @if (locked()) {
            <div class="text-xs md:text-sm text-gray-500 mt-4">This scenario requires a Pro plan.</div>
          }
          <div class="mt-4 flex items-center gap-3">
            @if (!locked()) {
              <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" [disabled]="locked()" (click)="onPlay($event)" aria-label="Play scenario">
                <i class="fa-solid fa-play"></i>
                <span>Play</span>
              </button>
            }@else {
              <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" 
              (click)="onUpgrade($event)" aria-label="Play scenario">
                <i class="fa-solid fa-arrow-up"></i>
                <span>Upgrade</span>
              </button>
            }
            <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" (click)="onLeaderboard($event)" aria-label="View leaderboard">
              <i class="fa-solid fa-ranking-star"></i>
              <span>Leaderboard</span>
            </button>
          </div>
          <!-- Card info -->
          @if (scenario()?.card) {
            <div class="mt-4 space-y-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 border border-gray-200" *ngIf="scenario()?.card?.difficulty as diff">
                  <i class="fa-solid fa-signal mr-1"></i>{{ diff }}
                </span>
                <span class="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 border border-primary-200" *ngIf="scenario()?.card?.metadata?.category as cat">
                  <i class="fa-solid fa-hashtag mr-1"></i>{{ cat }}
                </span>
                <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200" *ngIf="scenario()?.card?.metadata?.estimatedDurationMinutes as dur">
                  <i class="fa-regular fa-clock mr-1"></i>{{ dur }} min
                </span>
              </div>
              <div class="text-sm md:text-sm font-semibold text-gray-900">{{ scenario()?.card?.title }}</div>
              <div  class="text-xs md:text-sm text-gray-700">{{ scenario()?.card?.shortDescription }}</div>
              <div>
                <div class="text-xs font-medium text-gray-600 mb-1">Skills you will practice</div>
                <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li *ngFor="let s of scenario()?.card?.skillsAcquired">{{ s }}</li>
                </ul>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="rounded-lg border border-gray-200 p-3" *ngIf="scenario()?.card?.context?.program as prog">
                  <div class="text-xs font-semibold text-gray-600 mb-1">Program</div>
                  <div class="text-sm text-gray-800">{{ prog }}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3" *ngIf="scenario()?.card?.context?.domains as domains">
                  <div class="text-xs font-semibold text-gray-600 mb-1">Domains</div>
                  <div class="text-sm text-gray-800">{{ domains }}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3" *ngIf="scenario()?.card?.context?.roleFocus as rf">
                  <div class="text-xs font-semibold text-gray-600 mb-1">Role focus</div>
                  <div class="text-sm text-gray-800">{{ rf }}</div>
                </div>
                <div class="rounded-lg border border-gray-200 p-3" *ngIf="scenario()?.card?.context?.objective as obj">
                  <div class="text-xs font-semibold text-gray-600 mb-1">Objective</div>
                  <div class="text-sm text-gray-800">{{ obj }}</div>
                </div>
              </div>
            </div>
          }


        </div>
      </div>
    </ng-template>
  </div>
  `
  ,
  styles: [`
    :host { display: block; }
    /* Smooth enter animation for the expanded card */
    @keyframes flyoutIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    .flyout-enter { animation: flyoutIn 1000ms ease-out; }
  `]
})
export class ScenarioCardComponent implements OnInit, OnDestroy {

  // Inputs
  scenario = input<Scenario | null>(null);
  // Optional explicit disabled override
  disabled = input<boolean | null>(null);

  // Outputs
  select = output<void>();
  play = output<void>();
  upgrade = output<void>();
  leaderboard = output<void>();

  isAdmin = input<boolean>(false);
  isPro = input<boolean>(false);
  // Progress inputs
  completed = input<boolean>(false);
  profit = input<number | undefined>(undefined);
  medals = computed(() => (this.scenario() as any)?.medals as { name: string; threshold: number }[] | undefined);
  medalEmoji = computed(() => {
    const profit = this.profit();
    console.log('Calculating medal emoji for profit', profit);
    if (profit == null) return '';
    const medals = this.medals() || [];
    // Sort medals descending by threshold so we pick highest achieved
    const sorted = [...medals].sort((a,b) => b.threshold - a.threshold);
    for (const m of sorted) {
      if (profit >= m.threshold) {
        switch (m.name) {
          case 'gold': return '🥇';
          case 'silver': return '🥈';
          case 'bronze': return '🥉';
        }
      }
    }
    return '';
  });


  scenarioPlan = computed(() => (this.scenario() as any)?.card?.plan as string | undefined);

  locked = computed(() => {
    const explicit = this.disabled();
    if (explicit !== null) return !!explicit;
    const plan = this.scenarioPlan();
    const isPro = this.isPro();
    // Locked if scenario is pro-only and user isn't pro or pro_cancelling
    return plan === 'pro' && !isPro;
  });

  // Thumbnail handling
  hasLogo = computed(() => !!this.scenario()?.nameId);
  assetPath = computed(() => this.scenario()?.nameId ? `previews/${this.scenario()!.nameId}` : null);

  // Hover/expand state
  private hoverTimer: any = null;
  isExpanded = signal(false);

  // Overlay & hover coordination
  @ViewChild('anchor', { static: true }) anchorRef!: ElementRef<HTMLElement>;
  @ViewChild('flyoutTpl', { static: true }) flyoutTpl!: TemplateRef<any>;
  private overlay = inject(Overlay);
  private vcr = inject(ViewContainerRef);
  private flyoutRegistry = inject(ScenarioFlyoutRegistryService);
  private overlayRef: OverlayRef | null = null;
  private portal: TemplatePortal<any> | null = null;
  private closeTimer: any = null;
  private overOverlay = signal(false);
  private overCard = signal(false);

  ngOnInit(): void {
    // No manual scroll listeners needed; CDK reposition strategy will handle
  }

  ngOnDestroy(): void {
    this.clearHoverTimer();
    this.clearCloseTimer();
    this.destroyOverlay();
  }

  onMouseEnter() {
    this.overCard.set(true);
    this.clearHoverTimer();
    // Delay ~1.2s before expanding (Netflix-like)
    this.hoverTimer = setTimeout(() => {
      this.openOverlay();
    }, 500);
  }

  onMouseLeave() {
    this.overCard.set(false);
    this.clearHoverTimer();
    this.startCloseTimer();
  }

  private clearHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  onSelect() {
    // First click opens the hover menu; don't launch the game yet
    if (!this.isExpanded()) {
      this.clearHoverTimer();
      this.openOverlay();
      return;
    }
    // If already expanded, treat click as play for convenience
    if (this.locked()) return;
    this.play.emit();
  }

  onPlay(ev: MouseEvent) {
    ev.stopPropagation();
    if (this.locked()) return;
    this.play.emit();
  }

  onLeaderboard(ev: MouseEvent) {
    ev.stopPropagation();
    // Allow viewing leaderboard even if locked (so user can see scores before upgrading)
    this.leaderboard.emit();
  }

  close() {
    this.clearHoverTimer();
    this.isExpanded.set(false);
    this.destroyOverlay();
    this.flyoutRegistry.notifyClosed(this);
  }

  onBackClick(ev: MouseEvent) {
    ev.stopPropagation();
    this.close();
  }

  // Desktop overlay hover handlers
  onOverlayEnter() {
    console.log("Scenario", this.scenario(), this.profit(), this.medals());
    this.overOverlay.set(true);
    this.clearCloseTimer();
  }

  onOverlayLeave() {
    this.overOverlay.set(false);
    this.startCloseTimer();
  }

  private startCloseTimer() {
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => {
      if (this.recentlyOpened) return; // ignore early transient leaves
      if (!this.overCard() && !this.overOverlay()) {
        this.close();
      }
    }, 120);
  }

  private clearCloseTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private openOverlay() {
    if (this.overlayRef) return;
    this.flyoutRegistry.requestOpen(this);
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const position = this.overlay.position().global().top('0').left('0');
      this.overlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: 'bg-black/40',
        positionStrategy: position,
        scrollStrategy: this.overlay.scrollStrategies.block(),
        width: '100vw',
        height: '100vh'
      });
      this.overlayRef.backdropClick().subscribe(() => this.close());
    } else {
            const positions: ConnectedPosition[] = [
        // Prefer above with a smaller gap
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -4 },
        // Fallback below with a smaller gap
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 4 }
      ];
      const positionStrategy = this.overlay
        .position()
        .flexibleConnectedTo(this.anchorRef.nativeElement)
        .withPositions(positions)
        .withPush(true)
        .withViewportMargin(4);
      this.overlayRef = this.overlay.create({
        hasBackdrop: false,
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition()
      });
    }
    this.portal = new TemplatePortal(this.flyoutTpl, this.vcr);
    this.overlayRef.attach(this.portal);
    // Global listeners for outside click & ESC
    document.addEventListener('click', this.onDocClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    this.isExpanded.set(true);
    this.recentlyOpened = true;
    setTimeout(() => (this.recentlyOpened = false), 320);
  }

  private destroyOverlay() {
    if (this.overlayRef) {
      try { this.overlayRef.detach(); } catch {}
      try { this.overlayRef.dispose(); } catch {}
      this.overlayRef = null;
    }
    this.portal = null;
    document.removeEventListener('click', this.onDocClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
  }

  private onDocClick = (e: MouseEvent) => {
    if (!this.isExpanded()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (this.anchorRef.nativeElement.contains(target)) return;
    if (this.overlayRef && this.overlayRef.overlayElement.contains(target)) return;
    this.close();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isExpanded()) {
      e.stopPropagation();
      this.close();
    }
  };

  onUpgrade(ev: MouseEvent) {
    ev.stopPropagation();
    this.upgrade.emit();
  }

  // Guard to prevent flicker close right after opening while animation stabilizes
  private recentlyOpened = false;
}
