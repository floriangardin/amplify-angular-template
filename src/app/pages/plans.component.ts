import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { StripeService } from '../services/stripe.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  template: `
  <app-header></app-header>
  <main class="px-6 md:px-16 py-10 text-white max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Choose your plan</h1>
    <p class="text-gray-300 mb-10 max-w-3xl">Get practical experience of data governance. Compare Free and Pro below and start your data governance journey.</p>

    <div class="grid md:grid-cols-2 gap-6 mb-12">
      <!-- Free Plan Card -->
      <section class="rounded-lg bg-gray-800/80 border border-gray-700 p-6 flex flex-col">
        <h2 class="text-xl font-semibold mb-2">Free</h2>
        <p class="text-gray-400 mb-4">Get started with core scenarios and limited learning content.</p>
        <ul class="space-y-2 text-sm flex-1">
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> Limited scenarios (sample set)</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> Limited learning articles</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-xmark text-red-500 mt-0.5"></i> Progress tracking dashboard</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-xmark text-red-500 mt-0.5"></i> Early access to new features</li>
        </ul>
        <div class="mt-6">
          <button (click)="goHome()" class="w-full py-2 rounded bg-gray-700 hover:bg-gray-600 transition text-sm">Continue Free</button>
          <p class="text-xs text-indigo-200 mt-2 text-transparent">.</p>
        </div>
      </section>

      <!-- Pro Plan Card -->
      <section class="rounded-lg bg-indigo-900/80 border border-indigo-700 p-6 flex flex-col relative overflow-hidden">
        <div class="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-800 opacity-60"></div>
        <div class="relative">
          <h2 class="text-xl font-semibold mb-2 flex items-center gap-2">Pro <span class="text-xs font-medium px-2 py-1 rounded bg-indigo-600">$109/mo</span></h2>
          <p class="text-indigo-200 mb-4">Full access for data governance professionals.</p>
        </div>
        <ul class="space-y-2 text-sm flex-1 relative">
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> Access to all scenarios</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> Access to all learning content</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> See your data governance progression</li>
          <li class="flex items-start gap-2"><i class="fa-solid fa-check text-green-400 mt-0.5"></i> Privileged access to new features</li>
        </ul>
        <div class="mt-6 relative">
          @if(isPro()) {
            <button disabled class="w-full py-2 rounded bg-green-700/60 cursor-not-allowed text-sm">You're Pro</button>
          } @else {
            <button (click)="startCheckout()" class="w-full py-2 rounded bg-green-600 hover:bg-green-500 transition text-sm font-medium">Upgrade Now</button>
          }
          <p class="text-xs text-indigo-200 mt-2">Cancel anytime. Secure checkout.</p>
        </div>
      </section>
    </div>

    <!-- Comparison Table -->
    <div class="overflow-x-auto rounded-lg border border-gray-700">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-800 text-gray-200">
          <tr>
            <th class="text-left p-3">Feature</th>
            <th class="text-left p-3">Free</th>
            <th class="text-left p-3">Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-gray-700">
            <td class="p-3">Access to all scenarios</td>
            <td class="p-3"><i class="fa-solid fa-xmark text-red-500"></i></td>
            <td class="p-3"><i class="fa-solid fa-check text-green-400"></i></td>
          </tr>
          <tr class="border-t border-gray-700">
            <td class="p-3">Access to all learning content</td>
            <td class="p-3"><i class="fa-solid fa-xmark text-red-500"></i></td>
            <td class="p-3"><i class="fa-solid fa-check text-green-400"></i></td>
          </tr>
          <tr class="border-t border-gray-700">
            <td class="p-3">See your data governance progression</td>
            <td class="p-3"><i class="fa-solid fa-xmark text-red-500"></i></td>
            <td class="p-3"><i class="fa-solid fa-check text-green-400"></i></td>
          </tr>
          <tr class="border-t border-gray-700">
            <td class="p-3">Privileged access to new features</td>
            <td class="p-3"><i class="fa-solid fa-xmark text-red-500"></i></td>
            <td class="p-3"><i class="fa-solid fa-check text-green-400"></i></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="text-gray-300 text-sm max-w-xl">The Pro plan unlocks the complete experience and continuous improvements. We actively ship new scenarios, content modules, and analytics. As a Pro member you'll often be first to try them.</div>
      <div>
        @if(!isPro()) {
          <button (click)="startCheckout()" class="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow text-sm">Upgrade for $109/mo</button>
        } @else {
          <button disabled class="px-6 py-3 rounded bg-green-700/60 font-semibold text-white text-sm">Already Pro</button>
        }
      </div>
    </div>
  </main>
  `,
  styles: [`:host { display:block; min-height:100vh; background: #0d0f17; } table { border-collapse: collapse; }`]
})
export class PlansComponent {
  private stripe = inject(StripeService);
  private userService = inject(UserService);
  private router = inject(Router);
  isPro = this.userService.isPro;

  startCheckout(){
    if(this.isPro()) return; // Guard
    this.stripe.startCheckout().catch(err => console.error('Stripe checkout failed', err));
  }

  goHome(){
    this.router.navigate(['/']);
  }
}
