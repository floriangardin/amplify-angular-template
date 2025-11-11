import { Component, OnDestroy, signal, effect, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { ClientService } from '../services/client.service';
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
// Note: sign-in is handled by the Authenticator in AppComponent via external provider

// UI KIT HOME PAGE DEMO
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
  @if(loading()) {
    <app-main-loading [text]="'Preparing your data governance experience'"></app-main-loading>
  } @else {
    <app-header></app-header>

    <div class="my-8">
        <h1 class="pl-[3.25rem] text-2xl space-y-8 font-bold text-white mb-8">For data stewards ...</h1>
        <app-carousel [scenarios]="scenarios()" [isAdmin]="isAdmin()"
          (playScenario)="onPlay($event)"
          (leaderboardScenario)="onLeaderboard($event)"
          (upgrade)="onUpgrade()"
          [pageSize]="pageSize()"

          [isPro]="isPro()"></app-carousel>
    </div>
      <div class="my-8">
        <h1 class="pl-[3.25rem] text-2xl space-y-8 font-bold text-white mb-8">Based on your profile</h1>
        <app-carousel [scenarios]="scenarios()" [isAdmin]="isAdmin()"
          (playScenario)="onPlay($event)"
          [pageSize]="pageSize()"
          (leaderboardScenario)="onLeaderboard($event)"
          (upgrade)="onUpgrade()"
          [isPro]="isPro()"></app-carousel>
          
        
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
  host: { class: 'w-full block' },
  styles: [`
    :host { display: block; width: 100vw; height: 100vh;}
  `],
  imports: [
    CommonModule,
    HeaderComponent,
    ConfirmDialogComponent,
    MainLoadingComponent,
    CarouselComponent
  ],
})
export class HomeComponent implements OnInit{

  clientService = inject(ClientService);
  stripeService = inject(StripeService);
  stateService = inject(StateService);
  gameStateService = inject(GameStateService);
  userService = inject(UserService);
  imageCache = inject(ImageCacheService);
  responsiveService = inject(ResponsiveService);
  isAdmin = this.userService.isAdmin;
  isPro = this.userService.isPro;
  planName = this.userService.planName;
  email = this.userService.email;
  router = inject(Router);
  scenarios = signal<Scenario[]>([]);
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
      scenarios.sort((a, b) => ((a as any)?.card?.plan === 'free' ? -1 : 1));
      // Create 10 copies of scenarios
      const scenarioCopies = scenarios.flatMap(scenario => Array(4).fill({ ...scenario }));

      this.scenarios.set(scenarioCopies as Scenario[]);

      // Wait until the first visible images are ready (decoded) before leaving loading.
      // Limit to a reasonable number to avoid long initial waits.
      const firstVisible = scenarioCopies
        .slice(0, 8)
        .map(s => (s as any).logoId as string | undefined)
        .filter((id): id is string => !!id)
        .map(id => `previews/${id}`);
      try {
        await this.imageCache.awaitReady(firstVisible, { timeoutMs: 8000, limit: 8 });
        console.log('Initial images ready');
      } catch {}

      // Everything ready: user, plan, scenarios and above-the-fold images available
      this.loading.set(false);
    } catch (err) {
      console.error('Failed to load initial data', err);
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
      await this.clientService.client.models.Scenario.delete({ id: target.id });
      // Optimistically remove from UI
      this.scenarios.update(list => list.filter(s => s.id !== target.id));
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
    this.router.navigate(['/games/bestcdo/play'], { queryParams: { id: scenario.id } });
    console.log('Play scenario', scenario);
  }
  
  onLeaderboard(scenario: Scenario){
    this.router.navigate(['/leaderboard', scenario.id]);
  }

  onUpgrade(){
    // Intermediary screen before checkout
    this.router.navigate(['/plans']);
  }
  




}
