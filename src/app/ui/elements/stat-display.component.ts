import { Component, input, effect, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatCurrency } from '../utils/game-formatters';

@Component({
  selector: 'app-stat-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col w-[65px] md:w-[200px]">
      <span class="text-xs text-gray-500 mb-1 truncate">{{ icon() }} {{ label() }}</span>
      <div class="relative">
        <span 
          [class.text-primary-500]="value() >= 0" 
          [class.text-red-600]="value() < 0" 
          class="text-sm font-semibold inline-block"
          [class.value-bump]="bump()"
        >
          {{ formattedValue() }}
        </span>

        @if (showDelta()) {
          <span 
            class="absolute right-0 -top-2 text-xs pointer-events-none float-up"
            [class.text-green-600]="lastDelta() > 0"
            [class.text-red-600]="lastDelta() < 0"
          >
            {{ deltaText() }}
          </span>
        }
      </div>
    </div>
  `
  ,styles: [`
    .value-bump { animation: sd-bump 540ms ease-out; }
    @keyframes sd-bump {
      0% { transform: scale(1); }
      35% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .float-up { animation: sd-float-up 3900ms ease-out forwards; }
    @keyframes sd-float-up {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(-10px); opacity: 0; }
    }
  `]
})
export class StatDisplayComponent implements OnDestroy {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<number>();
  formatter = input<(v: number) => string>(formatCurrency);

  formattedValue = () => this.formatter()(this.value());

  // Animation state
  private lastValue = signal<number | null>(null);
  protected lastDelta = signal<number>(0);
  protected showDelta = signal<boolean>(false);
  protected bump = signal<boolean>(false);

  protected deltaText = computed(() => {
    const d = this.lastDelta();
    if (d === 0) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${this.formatter()(d)}`;
  });

  private deltaTimer: any = null;
  private bumpTimer: any = null;

  constructor() {
    effect(() => {
      const v = this.value();
      const prev = this.lastValue();
      if (prev === null) {
        this.lastValue.set(v);
        return;
      }
      const delta = v - prev;
      if (delta !== 0) {
        this.lastDelta.set(delta);
        this.showDelta.set(true);
        this.bump.set(false);
        // restart bump quickly to retrigger animation
        clearTimeout(this.bumpTimer);
        this.bumpTimer = setTimeout(() => this.bump.set(true), 0);

        clearTimeout(this.deltaTimer);
        this.deltaTimer = setTimeout(() => this.showDelta.set(false), 1950);
      }
      this.lastValue.set(v);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.deltaTimer);
    clearTimeout(this.bumpTimer);
  }
}
