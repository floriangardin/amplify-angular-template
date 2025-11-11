import { Component, input, effect, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-stat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col flex-1 min-w-[90px] md:w-[200px]">
      <span class="text-xs text-gray-500 mb-1 truncate">{{ icon() }} {{ label() }}</span>
      <div class="flex items-center w-full relative">
    <div class="h-2 w-[50px] w-max-[60px] w-min-[50px] md:w-1/2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-2 will-change-[width]"
            [class]="getColorClass()"
            [style.background-color]="getCustomBgColor()"
            [style.transition]="barTransition()"
            [style.width.%]="value()"
          ></div>
        </div>
        <span class="text-sm font-semibold ml-2">{{ value() }} %</span>
  
        @if (showDelta()) {
          <span 
            class="absolute right-0 -top-4 text-sm font-semibold pointer-events-none float-up"
            [class.text-green-600]="lastDelta() > 0"
            [class.text-red-600]="lastDelta() < 0"
            [style.animationDuration.ms]="deltaAnimDurationMs()"
          >
            {{ deltaText() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .float-up { animation: ps-float-up 10900ms ease-out forwards; }
    @keyframes ps-float-up {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(-10px); opacity: 0; }
    }
  `]
})
export class ProgressStatComponent implements OnDestroy {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<number>();
  color = input<string>('primary');

  getColorClass(): string {
    const c = this.color();
    // Use Tailwind classes only for known tokens; dynamic arbitrary values are purged by Tailwind.
    switch (c) {
      case 'primary':
        return 'bg-primary-500';
      case 'secondary':
        return 'bg-secondary-500';
      case 'amber':
        return 'bg-amber-400';
      default:
        return '';
    }
  }

  // For custom hex/rgb/hsl values, bind inline style to avoid Tailwind purge issues.
  getCustomBgColor(): string | null {
    const c = this.color();
    if (c === 'primary' || c === 'amber') return null;
    return c ?? null;
  }

  // Animation state
  private lastValue = signal<number | null>(null);
  protected lastDelta = signal<number>(0);
  protected showDelta = signal<boolean>(false);
  protected animDurationMs = signal<number>(0);
  protected barTransition = computed(() => `width ${this.animDurationMs()}ms cubic-bezier(0.22, 1, 0.36, 1)`);
  protected deltaAnimDurationMs = computed(() => Math.min(this.animDurationMs() + 100, 1600));

  protected deltaText = computed(() => {
    const d = this.lastDelta();
    if (d === 0) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${Math.round(d)}%`;
  });

  private deltaTimer: any = null;
  private bumpTimer: any = null;

  constructor() {
    effect(() => {
      const v = this.value();
      const prev = this.lastValue();
      if (prev === null) {
        this.lastValue.set(v);
  this.animDurationMs.set(0); // no animation on first paint
        return;
      }
      const delta = v - prev;
  if (delta !== 0) {
  // Dynamic duration: scale with delta magnitude, clamped for UX
  const abs = Math.abs(delta);
  const dur = Math.min(6000, Math.max(2500, 300 + abs * 12));
  this.animDurationMs.set(Math.round(dur));
        this.lastDelta.set(delta);
        this.showDelta.set(true);
        clearTimeout(this.deltaTimer);
        this.deltaTimer = setTimeout(() => this.showDelta.set(false), 2950);
      }
      this.lastValue.set(v);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.deltaTimer);
  }
}
