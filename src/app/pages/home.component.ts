import { Component, OnDestroy, signal, effect, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { ClientService } from '../services/client.service';
import { UserService } from '../services/user.service';
import { Scenario } from '../models/game-content';
import { ConfirmDialogComponent } from '../ui/elements/confirm-dialog.component';
import { ScenarioCardComponent } from '../ui/elements/scenario-card.component';
import { Router } from '@angular/router';
import {StripeService} from '../services/stripe.service'
import { GameStateService } from './games/bestcdo/services/game-state.service';
import { StateService } from '../services/state.service';
// Note: sign-in is handled by the Authenticator in AppComponent via external provider

// UI KIT HOME PAGE DEMO
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
  <app-header></app-header>

  <div class="mx-32 my-8">
      <h1 class="text-2xl space-y-8 font-bold text-white mb-8 w-full">For data stewards ...</h1>
      <div class="p-0 md:p-0 space-x-8 flex flex-row justify-left max-w-4xl">
        @for(scenario of scenarios(); track scenario) {
          <div class="relative">
            <app-scenario-card
              [scenario]="scenario"
              (play)="onPlay(scenario)"
              (select)="onPlay(scenario)"
              [isAdmin]="isAdmin()"
            />
            @if(isAdmin()){
              <button
                type="button"
                class="absolute top-2 left-2 text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                aria-label="Delete scenario"
                (click)="promptDelete(scenario)"
                title="Delete"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            }
          </div>
        }
    </div>
  </div>
    <div class="mx-32 my-8">
      <h1 class="text-2xl space-y-8 font-bold text-white mb-8 w-full">Based on your profile</h1>
      <div class="p-0 md:p-0 space-x-8 flex flex-row justify-left max-w-4xl">
        @for(scenario of scenarios(); track scenario) {
          <div class="relative">
            <app-scenario-card
              [scenario]="scenario"
              (play)="onPlay(scenario)"
              [isAdmin]="isAdmin()"
            />
            @if(isAdmin()){
              <button
                type="button"
                class="absolute top-2 left-2 text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                aria-label="Delete scenario"
                (click)="promptDelete(scenario)"
                title="Delete"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            }
          </div>
        }
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
  `,
  host: { class: 'w-full block' },
  styles: [`
    :host { display: block; width: 100vw; height: 100vh;}
  `],
  imports: [
    CommonModule,
    HeaderComponent,
    ConfirmDialogComponent,
    ScenarioCardComponent,
  ],
})
export class HomeComponent implements OnInit{

  clientService = inject(ClientService);
  stripeService = inject(StripeService);
  stateService = inject(StateService);
  gameStateService = inject(GameStateService);
  userService = inject(UserService);
  isAdmin = this.userService.isAdmin;
  isPro = this.userService.isPro;
  planName = this.userService.planName;
  email = this.userService.email;
  router = inject(Router);
  scenarios = signal<Scenario[]>([]);
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

    await this.userService.init();
    let scenarios = await this.stateService.getScenarios();

    // Sort scenario to free first.
    scenarios.sort((a, b) => (a.plan === 'free' ? -1 : 1));

    this.scenarios.set(scenarios as Scenario[]);
    console.log('Loaded scenarios', scenarios);
    
  }

  onSignOut() {
    signOut();
  }

  promptDelete(scenario: Scenario){
    this.scenarioToDelete.set(scenario);
    this.confirmMessage.set(`Are you sure you want to delete "${scenario.title}"? This action cannot be undone.`);
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
    this.router.navigate(['/games/bestcdo/start'], { queryParams: { id: scenario.id } });
    console.log('Play scenario', scenario);
  }
  




}
