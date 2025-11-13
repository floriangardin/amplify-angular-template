import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-screen md:h-screen grid place-items-center bg-gradient-to-b from-secondary-900 via-secondary-950 to-black overflow-hidden">
      <!-- Soft pulsing aura -->
      <div class="absolute inset-0 -z-10">
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vmin] h-[70vmin] rounded-full bg-primary-500/10 blur-3xl animate-aura"></div>
      </div>

      <!-- Loading card -->
      <div class="flex flex-col items-center gap-6 text-slate-200">
        <!-- Centered loading logo -->
        <img
          src="loading_logo.png"
          alt="Loading"
          class="w-[120px] h-[120px] md:w-[160px] md:h-[160px] drop-shadow-lg object-contain animate-pulse-node"
        />

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
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.03); opacity: 1; }
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
