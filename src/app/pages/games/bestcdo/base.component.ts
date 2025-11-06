import { Component, EventEmitter, Input, OnInit, Output, signal, inject, input } from '@angular/core';
import { SoundService } from './services/sound.service';
import { Router, RouterOutlet } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { GameStateService } from './services/game-state.service';
import { switchMap, distinctUntilChanged, of } from 'rxjs';

@Component({
  selector: 'app-bestcdo-start',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class BaseCDOComponent implements OnInit {
  protected sounds = inject(SoundService);
  protected gameStateService = inject(GameStateService);
  public stateService = inject(StateService);
  public router = inject(Router);
  protected activatedRoute = inject(ActivatedRoute);
  public Object = Object;
  public content = this.gameStateService.content;

  isMobile = signal<boolean>(window.innerWidth < 768);

  toggleMute() {
    this.sounds.toggleMute();
  }
  
  ngOnInit(): void {
    // Listen to query param 'id' and load scenario if needed
    this.activatedRoute.queryParamMap
      .pipe(
        // map to id
        // use distinctUntilChanged to avoid refetching same id
        // switchMap to fetch scenario
        distinctUntilChanged((a, b) => a.get('id') === b.get('id')),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            // No id: if content already set, keep it; else, navigate home
            if (!this.gameStateService.content()) {
              this.router.navigate(['/']);
            }
            return of(null);
          }
          // If already loaded same id, skip
          const current = this.gameStateService.content();
          if (current && (current as any).id === id) {
            return of(current);
          }
          return this.stateService.getScenarioById(id);
        })
      )
      .subscribe((scenario) => {
        if (scenario) {
          this.gameStateService.content.set(scenario as any);
        } else if (scenario === null) {
          // Invalid id
          this.router.navigate(['/']);
        }
      });
  }
    
}