import { Component, OnDestroy, signal, effect, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { ClientService } from '../services/client.service';
import type { Schema } from '../../../amplify/data/resource';
import { ProgressService, ProgressSummary } from '../services/progress.service';
import { UserService } from '../services/user.service';
import { Scenario } from '../models/game-content';
import { ConfirmDialogComponent } from '../ui/elements/confirm-dialog.component';
import { Router } from '@angular/router';
import {StripeService} from '../services/stripe.service'
import { GameStateService } from './games/bestcdo/services/game-state.service';
import { StateService } from '../services/state.service';
import { MainLoadingComponent } from '../ui/elements/main-loading.component';
import { ImageCacheService } from '../services/image-cache.service';
import { CarouselComponent } from '../ui/elements/carousel.component';
import { ResponsiveService } from '../services/responsive.service';
import { ProgressComponent } from '../components/progress.component';
import { ProgressPerScenarioComponent } from '../components/progress-per-scenario.component';
import { ScenarioCardComponent } from '../ui/elements/scenario-card.component';
// UI KIT HOME PAGE DEMO
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ConfirmDialogComponent,
    MainLoadingComponent,
    CarouselComponent,
    ProgressComponent,
    ProgressPerScenarioComponent,
    ScenarioCardComponent
  ],
  template: `
  @if(loading()) {
    <app-main-loading [text]="'Building your data governance experience'"></app-main-loading>
  } @else {
    <app-header></app-header>

    <div class=" my-4 md:my-8 px-4 md:px-[3.25rem]">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <!-- Left column: Progress + Play -->
        <div class="order-2 lg:order-1">

          <div class="hidden lg:block"></div>
          <h1 class="text-2xl space-y-4 md:space-y-8 font-semibold text-white mb-4 md:mb-8 spectral-font">Play</h1>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 mb-8">
            @for(scenario of scenarios(); track scenario.nameId) {
              <app-scenario-card
                [scenario]="scenario"
                [isAdmin]="isAdmin()"
                (play)="onPlay(scenario)"
                (leaderboard)="onLeaderboard(scenario)"
                (deleteScenario)="promptDelete(scenario)"
                [completed]="completedIds()[scenario.nameId] || false"
                [profit]="profitByScenario()[scenario.nameId] || undefined"
                [isPro]="isPro()">
              </app-scenario-card>
            }
            </div>
                      @if(totalRuns() > 0 || totalProfit() !== null){
            <h1 class="text-2xl space-y-4 md:space-y-8 font-semibold text-white mb-4 md:mb-8 spectral-font">Your progress</h1>
            <div class="flex flex-wrap gap-2 mb-8">
              <app-progress [progressSummary]="progressSummary()"></app-progress>
            </div>
          }

        </div>

        <!-- Right column: Leaderboards -->
        <div class="order-1 lg:order-2">
          <h1 class="text-2xl space-y-4 md:space-y-8 font-semibold text-white mb-4 md:mb-8 spectral-font">The leaderboards</h1>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            <app-progress-per-scenario 
              (clickedScenarioLeaderboard)="onLeaderboard($event)"
              [currentUserId]="currentUserId()" [scenarios]="scenarios()" [progressSummary]="progressSummary()">
            </app-progress-per-scenario>
          </div>
        </div>
      </div>
    </div>

    

    @if(showConfirm()){
      <app-confirm-dialog
        [title]="'Delete scenario'"
        [message]="confirmMessage()"
        [confirmLabel]="deleting() ? 'Deleting…' : 'Delete'"
        [cancelLabel]="'Cancel'"
        (confirmed)="confirmDelete()"
        (cancelled)="cancelDelete()"
      />
    }
  }
  `,
  styles: [`
    :host { display: block; width: 100vw; height: 100vh;}
  `]
})
export class HomeComponent implements OnInit{

  clientService = inject(ClientService);
  stripeService = inject(StripeService);
  stateService = inject(StateService);
  gameStateService = inject(GameStateService);
  userService = inject(UserService);
  imageCache = inject(ImageCacheService);
  responsiveService = inject(ResponsiveService);
  progressService = inject(ProgressService);
  isAdmin = this.userService.isAdmin;
  isPro = this.userService.isPro;
  planName = this.userService.planName;
  email = this.userService.email;
  router = inject(Router);
  scenarios = signal<Scenario[]>([]);
  progressSummary = signal<ProgressSummary | null>(null);
  currentUserId = this.userService.currentUserId;
  
  // Progress metrics for wrapper visibility
  totalRuns = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return 0;
    const entries = Object.values(summary.byScenario || {});
    return entries.reduce((acc, p: any) => acc + (Number(p?.runs) || 0), 0);
  });

  totalProfit = computed(() => {
    const summary = this.progressSummary();
    const val = summary?.totals?.['profit'];
    return typeof val === 'number' ? val : null;
  });
  
  progressMap = computed(() => this.progressSummary()?.byScenario || {});
  completedIds = computed(() => {
    const map = this.progressMap();
    const res: Record<string, boolean> = {};
    Object.values(map).forEach(p => {
      if (p && p.scenarioNameId) res[p.scenarioNameId] = !!p.completed;
    });
    return res;
  });
  profitByScenario = computed(() => {
    const map = this.progressMap();
    console.log('Computing profit by scenario from progress map', map);
    const res: Record<string, number | undefined> = {};
    Object.values(map).forEach(p => {
      if (!p?.scenarioNameId) return;
      const profitEntry = (p.indicatorScores || []).find((s: any): s is any => !!s && s.indicatorNameId === 'profit');
      const profit = profitEntry?.value as number | undefined;
      if (typeof profit === 'number') res[p.scenarioNameId] = profit;
    });
    return res;
  });
  pageSize = this.responsiveService.carouselPageSize;
  // Loading state gates initial render until user & scenarios fetched
  loading = signal<boolean>(true);
  showConfirm = signal(false);
  deleting = signal(false);
  scenarioToDelete = signal<Scenario | null>(null);
  confirmMessage = signal<string>('Are you sure you want to delete this scenario? This action cannot be undone.');

  async onSettings() {
    this.router.navigate(['/settings']);
  }
  
  async ngOnInit(): Promise<void> {
    // USER
    // Detect return from Stripe checkout to refresh token/groups immediately
    try {
      const url = new URL(window.location.href);
      const payment = url.searchParams.get('payment');
      const sessionId = url.searchParams.get('session_id');
      if (payment === 'success' || !!sessionId) {
        if (sessionId) {
          try { await this.stripeService.verifySubscription(sessionId); } catch {}
        }
        await this.userService.refreshNow();
        
        // Clean URL params so we don't retrigger
        url.searchParams.delete('payment');
        url.searchParams.delete('session_id');
        const newSearch = url.searchParams.toString();
        history.replaceState({}, '', url.pathname + (newSearch ? `?${newSearch}` : '') + url.hash);
      }

    } catch {}


    // SCENARIOS

    try {
      await this.userService.init();
      const scenarios = await this.stateService.getScenarios();
      // Sort scenario to free first.
      //scenarios.sort((a, b) => ((a as any)?.card?.plan === 'free' ? -1 : 1));
      // Create 10 copies of scenarios
      //const scenarioCopies = scenarios.flatMap(scenario => Array(4).fill({ ...scenario }));

      this.scenarios.set(scenarios as Scenario[]);

      // Wait until the first visible images are ready (decoded) before leaving loading.
      // Limit to a reasonable number to avoid long initial waits.
      const firstVisible = scenarios
        .slice(0, 8)
        .map(s => (s as any).logoId as string | undefined)
        .filter((id): id is string => !!id)
        .map(id => `previews/${id}`);
      try {
        await this.imageCache.awaitReady(firstVisible, { timeoutMs: 8000, limit: 8 });
      } catch {}

      // Everything ready: user, plan, scenarios and above-the-fold images available
      // Load user progress AFTER scenarios (so we can map scenario cards)
      try {
        const summary = await this.progressService.listMyProgress();
        this.progressSummary.set(summary);
      } catch(err) {
      }
      this.loading.set(false);
    } catch (err) {
      // Keep loading until data can be fetched properly, as requested
    }
    
  }

  onSignOut() {
    signOut();
  }

  promptDelete(scenario: Scenario){
    this.scenarioToDelete.set(scenario);
    this.confirmMessage.set(`Are you sure you want to delete "${scenario.card.title}"? This action cannot be undone.`);
    this.showConfirm.set(true);
  }

  cancelDelete(){
    if(this.deleting()) return; // prevent closing while deleting
    this.showConfirm.set(false);
    this.scenarioToDelete.set(null);
  }

  async confirmDelete(){
    const target = this.scenarioToDelete();
    if(!target) return;
    this.deleting.set(true);
    try{
      await this.clientService.client.models.Scenario.delete({ nameId: target.nameId });
      // Optimistically remove from UI
      this.scenarios.update(list => list.filter(s => s.nameId !== target.nameId));
      this.showConfirm.set(false);
      this.scenarioToDelete.set(null);
    }catch(err){
      console.error('Failed to delete scenario', err);
      // Keep dialog open; user can cancel
    }finally{
      this.deleting.set(false);
    }
  }

  goPro(){
    this.stripeService.startCheckout().catch(err => {
      console.error('Stripe checkout failed', err);
      // optionally show a toast
    });
  }
  
  onPlay(scenario: Scenario){
    // Navigate with scenario id in query params; game will fetch content based on id
    console.log('Play scenario', scenario);
    this.router.navigate(['/games/bestcdo/play'], { queryParams: { nameId: scenario.nameId } });
  }
  
  onLeaderboard(scenario: Scenario){
    console.log('Leaderboard scenario', scenario);
    this.router.navigate(['/leaderboard', scenario.nameId] );
  }

  onUpgrade(){
    // Intermediary screen before checkout
    this.router.navigate(['/plans']);
  }
  




}
