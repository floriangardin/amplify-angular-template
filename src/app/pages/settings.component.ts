import { Component, OnDestroy, signal, effect, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { ClientService } from '../services/client.service';
import { Scenario } from '../models/game-content';
import { ConfirmDialogComponent } from '../ui/elements/confirm-dialog.component';
import { deleteUser } from 'aws-amplify/auth';
import { PlanName } from '../models/user';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { PlanComponent } from '../ui/elements/plan.component';
import { UserService } from '../services/user.service';
import {StripeService} from '../services/stripe.service'

// UI KIT HOME PAGE DEMO
@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
  <app-header></app-header>
  <div class="card-dark p-0 space-y-8 flex flex-col items-center mt-8 md:m-16 p-8">
    
    <h1 class="text-3xl font-bold mb-8">Account Settings</h1>
    <div class="flex flex-row items-center gap-4">
      <p>Your current plan:</p>
  <app-plan [showCancel]="true" [planName]="planName()" [periodEnd]="periodEnd()" (goPro)="goPro()" (managePlan)="managePlan()" (cancelCancelSubscription)="cancelCancelSubscription()"></app-plan>
    </div>
    @if(invoices().length){
      <div class="w-full max-w-3xl">
        <h2 class="text-xl font-semibold mt-6 mb-2">Recent invoices</h2>
        <ul class="space-y-2">
          @for(inv of invoices(); track inv.id){
            <li class="flex items-center justify-between p-3 rounded border border-gray-700 bg-gray-900">
              <div class="text-sm">
                <div class="font-medium">Invoice {{ inv.number || inv.id }}</div>
                <div class="text-gray-400">{{ inv.created | date:'mediumDate' }} · {{ inv.total/100 | currency:inv.currency.toUpperCase() }}</div>
              </div>
              <div class="flex gap-3">
                @if(inv.hostedInvoiceUrl){
                  <a class="text-blue-400 hover:underline" [href]="inv.hostedInvoiceUrl" target="_blank" rel="noopener">View</a>
                }
                @if(inv.invoicePdf){
                  <a class="text-blue-400 hover:underline" [href]="inv.invoicePdf" target="_blank" rel="noopener">PDF</a>
                }
              </div>
            </li>
          }
        </ul>
      </div>
    }
    <h1 class="text-3xl font-bold mb-8">Danger Zone</h1>

    <button
      type="button"
      [disabled]="planName()=='pro'"
      class="bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded hover:bg-red-700"
      (click)="promptDeleteAccount()"
    >
      Delete Account
    </button>
    @if(planName() == 'pro'){
      <div class="text-yellow-400  text-sm mt-2 max-w-md text-center ">
        You must be on the free plan to delete your account. Please cancel your subscription first.
      </div>
    }
  </div>
  @if(showConfirm()){
    <app-confirm-dialog
      [title]="'Delete Account'"
      [message]="confirmMessage()"
      [confirmLabel]="deleting() ? 'Deleting…' : 'Delete'"
      [cancelLabel]="'Cancel'"
      (confirmed)="confirmDeleteAccount()"
      (cancelled)="cancelDeleteAccount()"
    />
  }
  @if(showCancelConfirm()){
    <app-confirm-dialog
      [title]="'Cancel Subscription'"
      [message]="cancelConfirmMessage()"
      [confirmLabel]="cancelling() ? 'Cancelling…' : 'Yes, cancel'"
      [cancelLabel]="'Keep subscription'"
      (confirmed)="confirmCancelSubscription()"
      (cancelled)="closeCancelDialog()"
    />
  }
  @if(toastMessage()){
    <div class="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded shadow-lg border border-gray-700">
      {{ toastMessage() }}
    </div>
  }
  `,
  host: { class: 'w-full block' },
  styles: [`
    :host { display: block; width: 100vw; height: 100vh; }
  `],
  imports: [
    CommonModule,
    HeaderComponent,
    ConfirmDialogComponent,
    PlanComponent
  ],
})
export class SettingsComponent implements OnInit{

  clientService = inject(ClientService);
  userService = inject(UserService);
  stripeService = inject(StripeService);

  constructor(){
    this.userService.init();
  }

  async ngOnInit(): Promise<void> {
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
        this.showToast('Your subscription status has been updated.');
        // Clean URL params so we don't retrigger
        url.searchParams.delete('payment');
        url.searchParams.delete('session_id');
        const newSearch = url.searchParams.toString();
        history.replaceState({}, '', url.pathname + (newSearch ? `?${newSearch}` : '') + url.hash);
      }
    } catch {}

    // Fetch invoices (best-effort)
    try {
      const list = await this.stripeService.listInvoices();
      this.invoices.set(list || []);
    } catch {}
  }

  email = this.userService.email;
  isAdmin = this.userService.isAdmin;
  isPro = this.userService.isPro;
  planName = this.userService.planName;
  periodEnd = this.userService.periodEnd;

  showConfirm = signal(false);
  deleting = signal(false);
  confirmMessage = signal('');
  // Cancel subscription dialog state
  showCancelConfirm = signal(false);
  cancelling = signal(false);
  cancelConfirmMessage = signal('');
  // Simple toaster
  toastMessage = signal('');
  private toastTimeout: any;
  invoices = signal<Array<{ id: string; number: string; hostedInvoiceUrl: string; invoicePdf: string; currency: string; total: number; created: string; status: string }>>([]);

  onSignOut() {
    signOut();
  }

  managePlan() {
    this.cancelConfirmMessage.set('Are you sure you want to cancel your subscription? You will lose access to pro features at the end of the period.');
    this.showCancelConfirm.set(true);
  }

  promptDeleteAccount(){
      this.confirmMessage.set(`Are you sure you want to delete your account? All ongoing plans will be cancelled. This action cannot be undone.`);
      this.showConfirm.set(true);
  }

  cancelDeleteAccount(){
    if(this.deleting()) return; // prevent closing while deleting
    this.showConfirm.set(false);
  }

  async confirmDeleteAccount(){
    await this.onDeleteUser();
  }

  async cancelCancelSubscription(){
    try {
      const result = await this.stripeService.reinstateSubscription();
      await this.userService.refreshNow();
      const message = result === 'already_active'
        ? 'Your subscription is already active.'
        : 'Subscription has been reinstated. You will continue to be charged at the next billing cycle.';
      this.showToast(message);
    } catch (err) {
      console.error('Reinstate subscription failed', err);
      this.showToast('We could not reinstate your subscription. Please try again.');
    }
  }

  // Cancel subscription flow
  confirmCancelSubscription = async () => {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    try {
      const result = await this.stripeService.cancelSubscription();
      await this.userService.refreshNow();
      // Show toast
      const message = result === 'already_cancelling'
        ? 'Your subscription is already set to cancel at the end of the period.'
        : 'Subscription will be cancelled at the end of the period.';
      this.showToast(message);
    } catch (err) {
      console.error('Cancel subscription failed', err);
      this.showToast('We could not process your cancellation. Please try again.');
    } finally {
      this.cancelling.set(false);
      this.showCancelConfirm.set(false);
    }
  }

  closeCancelDialog = () => {
    if (this.cancelling()) return;
    this.showCancelConfirm.set(false);
  }

  private showToast(msg: string){
    this.toastMessage.set(msg);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 4000);
  }

  goPro(){
    this.stripeService.startCheckout().catch(err => {
      console.error('Stripe checkout failed', err);
      // optionally show a toast
    });
  }
  async onDeleteUser() {
      try {
        await deleteUser();
      } catch (error) {
        console.log(error);
      }
  }



}
