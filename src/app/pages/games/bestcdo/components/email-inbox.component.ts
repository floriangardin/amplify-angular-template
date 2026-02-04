import { Component, input, output, effect, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Email } from '../../../../models/email';
import { EmailListItemComponent } from './email-list-item.component';
import { LibraryItem } from '../../../../models/game-content';

@Component({
  selector: 'app-email-inbox',
  standalone: true,
  imports: [CommonModule, EmailListItemComponent, DecimalPipe],
  styles: [
    `
      @keyframes vibrate {
        0% {
          transform: translateX(0);
        }
        20% {
          transform: translateX(-2px);
        }
        40% {
          transform: translateX(2px);
        }
        60% {
          transform: translateX(-2px);
        }
        80% {
          transform: translateX(2px);
        }
        100% {
          transform: translateX(0);
        }
      }
      .vibrate {
        animation: vibrate 0.5s ease-in-out;
      }

      @keyframes score-pop {
        0% { transform: scale(1); }
        30% { transform: scale(1.15); }
        60% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      @keyframes score-glow-up {
        0% { box-shadow: 0 0 0 0 rgba(var(--color-primary-500-rgb, 79, 70, 229), 0.6); }
        50% { box-shadow: 0 0 12px 4px rgba(var(--color-primary-500-rgb, 79, 70, 229), 0.35); }
        100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-500-rgb, 79, 70, 229), 0); }
      }
      @keyframes score-glow-down {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.35); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
      .score-pop { animation: score-pop 500ms ease-out; }
      .score-glow-up { animation: score-glow-up 800ms ease-out; }
      .score-glow-down { animation: score-glow-down 800ms ease-out; }

      @keyframes score-delta-float {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-18px); }
      }
      .score-delta-float { animation: score-delta-float 2s ease-out forwards; }
    `,
  ],
  template: `
    <div
      class="w-full md:w-[350px] border-r border-gray-300 flex flex-col bg-gray-100 z-10 min-h-0"
      [class.vibrate]="vibrate()"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-300 flex flex-col shrink-0">
        <div class="flex flex-row justify-between items-center">
            <div class="flex flex-col flex-1">

                <div class="text-lg font-semibold m-auto w-full">
                  Inbox ({{ emails().length }})
                </div>
                <div class="text-xs text-gray-500 mt-1">Most recent first</div>
            </div>

          <!-- Score display -->
          <div class="relative flex items-center group">
            <div
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-300 cursor-help"
              [ngClass]="{
                'bg-primary-50 border-primary-200': currentScore() >= 0,
                'bg-red-50 border-red-200': currentScore() < 0,
                'score-pop': scoreAnimating(),
                'score-glow-up': scoreDeltaDirection() === 'up',
                'score-glow-down': scoreDeltaDirection() === 'down'
              }"
              [title]="'Points (Use all metrics)'"
            >
              <span class="text-sm">🏆</span>
              <span
                class="text-sm font-bold tabular-nums"
                [ngClass]="currentScore() >= 0 ? 'text-primary-700' : 'text-red-600'"
              >{{ formattedScore() }}</span>
            </div>

            <!-- Delta floating text -->
            @if (showScoreDelta()) {
              <span
                class="absolute -top-4 right-0 text-xs font-bold pointer-events-none score-delta-float whitespace-nowrap"
                [ngClass]="scoreDelta() > 0 ? 'text-green-600' : 'text-red-500'"
              >
                {{ scoreDelta() > 0 ? '+' : '' }}{{ scoreDelta() | number:'1.0-0' }}
              </span>
            }
          </div>

        </div>

      </div>

      <!-- Email List -->
      <div class="flex-1 min-h-0 overflow-y-auto p-2">
        @if (!emails().length) {
        <div class="p-6 text-center text-gray-500 italic">
          Your inbox is empty. Great job!
        </div>
        } @for (mail of reversedEmails(); track mail.name) {
        <app-email-list-item
          [email]="mail"
          [isSelected]="selectedEmailName() === mail.name"
          [urgentSecondsLeft]="urgentTimers()[mail.name] ?? null"
          (emailClick)="emailSelected.emit($event)"
        />
        }
      </div>
    </div>
  `,
})
export class EmailInboxComponent implements OnInit, OnDestroy {

  emails = input.required<Email[]>();
  library = input.required<LibraryItem[]>();
  selectedEmailName = input<string | null>(null);
  companyLogo = input<string | null>(null);
  isEditable = input<boolean>(false);
  urgentTimers = input<Partial<Record<string, number>>>({});
  currentScore = input<number>(0);
  scoreProfit = input<number>(0);
  scoreDataQuality = input<number>(0);
  scoreClientRelationship = input<number>(0);

  emailSelected = output<Email>();
  logoChanged = output<string>();
  libraryItemSelected = output<LibraryItem>();

  reversedEmails = () => this.emails().slice().reverse();
  vibrate = signal<boolean>(false);
  private previousEmailCount = 0;

  // Score animation state
  scoreAnimating = signal(false);
  showScoreDelta = signal(false);
  scoreDelta = signal(0);
  scoreDeltaDirection = signal<'up' | 'down' | null>(null);
  private previousScore: number | null = null;
  private scoreAnimTimer: any = null;
  private scoreDeltaTimer: any = null;
  private scoreGlowTimer: any = null;

  scoreTooltip = computed(() => {
    const p = this.scoreProfit();
    const dq = this.scoreDataQuality();
    const cr = this.scoreClientRelationship();
    return `Score = Profit/100 x (100 + DQ + CR)\n= ${p}/100 x (100 + ${dq} + ${cr})\n= ${this.currentScore()}`;
  });

  formattedScore = computed(() => {
    const s = this.currentScore();
    if (Math.abs(s) >= 1_000_000) {
      return (s / 1_000_000).toFixed(1) + 'K Pts';
    }
    if (Math.abs(s) >= 1_000) {
      return (s / 1_000).toFixed(0) + ' Pts';
    }
    return s.toFixed(0);
  });

  constructor() {
    effect(() => {
      const currentEmailCount = this.emails().length;
      if (currentEmailCount > this.previousEmailCount) {
        this.vibrate.set(true);
        setTimeout(() => {
          this.vibrate.set(false);
        }, 500);
      }
      this.previousEmailCount = currentEmailCount;
    });

    // Score change animation effect
    effect(() => {
      const score = this.currentScore();
      if (this.previousScore === null) {
        this.previousScore = score;
        return;
      }
      const delta = score - this.previousScore;
      if (delta !== 0) {
        this.scoreDelta.set(delta);
        this.scoreDeltaDirection.set(delta > 0 ? 'up' : 'down');
        this.showScoreDelta.set(true);
        this.scoreAnimating.set(false);

        // Retrigger pop animation
        clearTimeout(this.scoreAnimTimer);
        this.scoreAnimTimer = setTimeout(() => this.scoreAnimating.set(true), 10);

        // Hide delta after 2s
        clearTimeout(this.scoreDeltaTimer);
        this.scoreDeltaTimer = setTimeout(() => this.showScoreDelta.set(false), 2000);

        // Clear glow direction after animation
        clearTimeout(this.scoreGlowTimer);
        this.scoreGlowTimer = setTimeout(() => this.scoreDeltaDirection.set(null), 800);
      }
      this.previousScore = score;
    });
  }
  ngOnInit() {
  }

  ngOnDestroy(): void {
    clearTimeout(this.scoreAnimTimer);
    clearTimeout(this.scoreDeltaTimer);
    clearTimeout(this.scoreGlowTimer);
  }
}
