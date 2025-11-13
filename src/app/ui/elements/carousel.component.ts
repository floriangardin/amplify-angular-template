import { NgClass } from '@angular/common';
import { computed } from '@angular/core';
import { ChangeDetectionStrategy, Component, OnInit, OnChanges, SimpleChanges, input, output } from '@angular/core';
import { Scenario } from '../../models/game-content';
import { ScenarioCardComponent } from './scenario-card.component';

let nextId: number = 0;

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgClass, ScenarioCardComponent],
  template: `
  @if (itemKeys) {
    @if (itemMap) {
      <div class="carousel">
        @if (currentPage > 0) {
          <div
            class="carousel__btn-container carousel__btn-container--previous"
            [ngClass]="{ 'carousel__btn-container--disabled': isPrevDisabled }"
          >
            <button
              class="carousel__btn carousel__btn--previous"
              [disabled]="isPrevDisabled"
              (click)="navToPrev()"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            
          </div>
        }
        <div class="carousel__scroller">
          @for (groupNumber of itemKeys; track groupNumber) {
            <section
              class="carousel__group"
              [id]="componentId + '-group-' + groupNumber"
              [style.--page-size]="pageSize()"
            >
              @for (scenario of (itemMap.get(groupNumber) ?? []); track $index; let i = $index) {
                <div class="carousel__item">
                  <app-scenario-card
                    [scenario]="scenario"
                    [isAdmin]="isAdmin()"
                    [isPro]="isPro()"
                    [completed]="getCompleted(scenario)"
                    [profit]="getProfit(scenario)"
                    (select)="onSelectScenario(scenario)"
                    (play)="onPlayScenario(scenario)"
                    (upgrade)="onUpgrade(scenario)"
                    (leaderboard)="onLeaderboardScenario(scenario)"
                  ></app-scenario-card>
                </div>
              }
            </section>
          }
        </div>
        <div
          class="carousel__btn-container carousel__btn-container--next"
          [ngClass]="{ 'carousel__btn-container--disabled': isNextDisabled }"
        >
          <button class="carousel__btn carousel__btn--next" (click)="navToNext()">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    }
  }

  `,
  styles: [`
    .carousel {
      position: relative;
    }

    .carousel__scroller {
      display: grid;
      grid-auto-flow: column;
      overflow: hidden;
      grid-auto-columns: 100%;
      padding: 0 3.25rem;
      scroll-padding-inline: 3.25rem;
      max-width: 100vw;
    }

    .carousel__group {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-start; /* Keep items aligned left so incomplete groups don't stretch */
      --page-size: 3; /* Default fallback */
    }

    .carousel__item {
      display: flex;
      justify-content: stretch;
      align-items: stretch;
      flex-basis: calc(100% / var(--page-size));
      margin: 0 0.25rem;
    }

    .carousel__btn-container {
      background: hsla(0, 0%, 8%, 0.3);
      width: 3rem;
      display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      z-index: 1;
    }

    .carousel__btn-container--next {
      top: 0;
      bottom: 0;
      right: 0;
    }

    .carousel__btn-container--previous {
      left: 0;
      top: 0;
      bottom: 0;
    }

    .carousel__btn {
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      width: 1.25rem;
      height: 1.25rem;
      color: white;
    }

    .carousel__btn:hover {
      opacity: 0.8;
    }

    .carousel__btn svg {
      width: 1rem;
      height: 1rem;
    }

    .carousel__btn:disabled,
    .carousel__btn[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent implements OnInit, OnChanges {
  public componentId: string | undefined = `carousel-id-${nextId++}`;

  // Inputs using signal-based API (Angular 17)
  scenarios = input<Scenario[]>([]);
  pageSize = input<number>(6);
  isAdmin = input<boolean>(false);
  isPro = input<boolean>(false);
  // Progress inputs keyed by scenarioId
  completedIds = input<Record<string, boolean>>({});
  profitByScenario = input<Record<string, number | undefined>>({});

  // Outputs to bubble child card events
  selectScenario = output<Scenario>();
  playScenario = output<Scenario>();
  upgrade = output<Scenario>();
  leaderboardScenario = output<Scenario>();

  public currentPage: number = 0;
  public itemMap: Map<number, Scenario[]> | undefined;
  public itemKeys: number[] | undefined;
  public numberOfPages: number = 0;
  public isNextDisabled: boolean = true;
  public isPrevDisabled: boolean = true;

  ngOnInit(): void {
    this.recompute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scenarios'] || changes['pageSize']) {
      this.recompute();
    }
  }

  // Navigation
  public navToNext(): void {
    if (this.currentPage >= this.numberOfPages - 1) {
      this.reset();
    } else {
      this.currentPage = this.currentPage + 1;
      this.navigateToGroup(this.currentPage);
    }
  }

  public navToPrev(): void {
    this.currentPage = Math.max(this.currentPage - 1, 0);
    this.navigateToGroup(this.currentPage);
  }

  private navigateToGroup(groupId: number): void {
    this.calcButtonStates();
    const sliderGroup: Element | null = document.querySelector(
      `#${this.componentId}-group-${groupId}`
    );
    sliderGroup?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }

  // Grouping logic
  private recompute(): void {
    const scenarios = this.scenarios() ?? [];
    const size = this.pageSize() ?? 3;
    this.itemMap = new Map();
    let groupIndex: number = 0;
    for (let i: number = 0; i < scenarios.length; i += size) {
      const group: Scenario[] = scenarios.slice(i, i + size);
      if (group.length < this.pageSize()) {
        let nbMissing = this.pageSize() - group.length;
        group.push(...Array(nbMissing).fill({} as Scenario));
      }
      this.itemMap.set(groupIndex, group);
      groupIndex++;
    }
    this.itemKeys = Array.from(this.itemMap.keys());
    this.numberOfPages = Math.max(groupIndex, 1); // at least one page (even if empty)
    this.currentPage = Math.min(this.currentPage, this.numberOfPages - 1);
    this.calcButtonStates();
  }

  private reset(): void {
    this.currentPage = 0;
    this.navigateToGroup(this.currentPage);
  }

  private calcButtonStates(): void {
    this.isNextDisabled = this.currentPage + 1 >= this.numberOfPages;
    this.isPrevDisabled = this.currentPage <= 0;
  }

  getCompleted(s?: Scenario | null): boolean {
    if (!s || !s.nameId) return false;
    const map = this.completedIds() || {};
    return !!map[s.nameId];
  }

  getProfit(s?: Scenario | null): number | undefined {
    if (!s || !s.nameId) return undefined;
    const map = this.profitByScenario() || {};
    return map[s.nameId];
  }

  // Child card event handlers
  onSelectScenario(scenario: Scenario) {
    this.selectScenario.emit(scenario);
  }
  onPlayScenario(scenario: Scenario) {
    this.playScenario.emit(scenario);
  }
  onLeaderboardScenario(scenario: Scenario) {
    this.leaderboardScenario.emit(scenario);
  }
  onUpgrade(scenario: Scenario) {
    this.upgrade.emit(scenario);
  }
}
