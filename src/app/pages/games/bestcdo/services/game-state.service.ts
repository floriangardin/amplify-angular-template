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
  public difficulty = signal<'easy' | 'hard'>('hard');
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
    this.difficulty.set('easy');
  this.stats = {};
  }


}
