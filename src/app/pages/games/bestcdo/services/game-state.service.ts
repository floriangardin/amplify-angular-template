import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Stats } from '../../../../models/stats';
import { StateService } from '../../../../services/state.service';
import { Scenario } from '../../../../models/game-content';
import { Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GameStateService {

  public state = inject(StateService);
  
  public content = signal<Scenario>(null as any);
  
  // Relative to specific BestCDO game instance
  public defeatReason : 'dataBreach' | 'burnout' | 'budget' | 'dataQuality' | 'reputation' = 'burnout';
  public screen = signal<'start' | 'playing' | 'victory' | 'defeat'>('start');
  public difficulty = computed<'easy'  | 'hard'>(() => {
    // Default to 'hard' if scenario has high priority
    const scenario = this.content();
    if (scenario && scenario.card.difficulty == 'Beginner') {
      console.log('Setting difficulty to easy based on scenario', scenario.nameId);
      return 'easy';
    }
    return 'hard';
  });
  public stats : Stats = {};

  constructor(){
    this.init();
  }


  public init(){
    // TODO : Init content based on selected scenario
    return of(true);
  }

  public reset(){
    this.screen.set('start');
    this.stats = {};
  }


}
