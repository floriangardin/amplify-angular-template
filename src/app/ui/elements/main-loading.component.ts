import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-screen md:h-screen grid place-items-center bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden">
      <!-- Soft pulsing aura -->
      <div class="absolute inset-0 -z-10">
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vmin] h-[70vmin] rounded-full bg-primary-500/10 blur-3xl animate-aura"></div>
      </div>

      <!-- Loading card -->
      <div class="flex flex-col items-center gap-6 text-slate-200">
        <!-- Data governance icon: network + shield -->
        <svg class="w-[120px] h-[120px] md:w-[160px] md:h-[160px] drop-shadow-lg" viewBox="0 0 160 160" fill="none" role="img" aria-label="Loading data governance">
          <!-- Nodes -->

          <!-- Edges -->
          <path d="M36 78 L74 40" class="stroke-primary-500/60" stroke-width="2"/>
          <path d="M86 40 L124 78" class="stroke-primary-500/60" stroke-width="2"/>
          <path d="M36 82 L74 120" class="stroke-primary-500/60" stroke-width="2"/>
          <path d="M86 120 L124 82" class="stroke-primary-500/60" stroke-width="2"/>

          <!-- Flow animation along edges -->
          <defs>
            <linearGradient id="flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0"/>
              <stop offset="50%" stop-color="currentColor" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g class="text-primary-400">
            <path d="M36 78 L74 40" stroke="url(#flow)" stroke-width="4" class="animate-flow"/>
            <path d="M86 40 L124 78" stroke="url(#flow)" stroke-width="4" class="animate-flow [animation-delay:120ms]"/>
            <path d="M36 82 L74 120" stroke="url(#flow)" stroke-width="4" class="animate-flow [animation-delay:240ms]"/>
            <path d="M86 120 L124 82" stroke="url(#flow)" stroke-width="4" class="animate-flow [animation-delay:360ms]"/>
          </g>

          <!-- Shield -->
          <g transform="translate(60,55)">
            <path d="M20 0 L40 8 V26 C40 36 30 46 20 52 C10 46 0 36 0 26 V8 Z" class="fill-slate-800 stroke-primary-500" stroke-width="2"/>
            <path d="M20 10 C26 10 31 15 31 21 C31 31 20 36 20 36 C20 36 9 31 9 21 C9 15 14 10 20 10 Z" class="fill-primary-500/20 stroke-primary-400" stroke-width="1.5"/>
            <path d="M20 17 L20 25" class="stroke-primary-300 animate-lock" stroke-width="2" stroke-linecap="round"/>
          </g>
        </svg>

        <!-- Title and status -->
        <div class="text-center">
          <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-200 via-white to-primary-300 bg-clip-text text-transparent">
            Loading ...
          </h2>
          <p class="mt-2 text-sm md:text-base text-slate-400">
            {{ text() }}
          </p>
        </div>

        <!-- Progress bars (decorative shimmer) -->
        <div class="w-[240px] md:w-[320px] h-2 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full w-1/3 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 animate-shimmer"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-aura {
      animation: aura 2.4s ease-in-out infinite;
    }
    @keyframes aura {
      0%, 100% { transform: scale(0.95); opacity: 0.55; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    .animate-flow {
      stroke-dasharray: 60;
      stroke-dashoffset: 60;
      animation: flow 1.6s ease-in-out infinite;
    }
    @keyframes flow {
      0% { stroke-dashoffset: 60; opacity: 0; }
      30% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 0; }
    }
    .animate-pulse-node { animation: pulse-node 1.6s ease-in-out infinite; }
    @keyframes pulse-node {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.25); opacity: 1; }
    }
    .animate-lock {
      animation: lock 1.2s ease-in-out infinite;
    }
    @keyframes lock {
      0%, 100% { transform: translateY(-1px); opacity: 0.6; }
      50% { transform: translateY(1px); opacity: 1; }
    }
    .animate-shimmer {
      animation: shimmer 1.8s linear infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-66%); }
      100% { transform: translateX(200%); }
    }
  `]
})
export class MainLoadingComponent {
    text = input('games');
}
