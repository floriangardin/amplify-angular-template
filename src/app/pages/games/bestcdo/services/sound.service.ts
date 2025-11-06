import { Injectable, signal, inject } from '@angular/core';
import { StateService } from '../../../../services/state.service';
import { GameStateService } from './game-state.service';
import { Router, ActivatedRoute } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SoundService {
  stateService = inject(StateService);
  gameStateService = inject(GameStateService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  private muted = signal(true);
  muted$ = this.muted.asReadonly();
  musics = ['main_music.mp3', 'main_menu.mp3'];
  playedMusic: HTMLAudioElement | null = null;

  play(path: string, loop = false, volume = 1) {
    if (this.muted()) return;
    const audio = new Audio(path);
    audio.loop = loop;
    audio.volume = volume;
    audio.play();
  }

  playMusic(path: string, loop = true, volume = 0.3) {
    if (this.muted()) return;
    const audio = new Audio(path);
    if(this.playedMusic) {  
      this.playedMusic.pause(); // Stop any currently playing music
      this.playedMusic.currentTime = 0; // Reset to the beginning
    }
    audio.loop = loop;
    audio.volume = volume;
    audio.play();
    this.playedMusic = audio; // Store the currently playing music
  }

  toggleMute() {
    this.muted.update(v => !v);
    if(this.muted() && this.playedMusic){
      this.playedMusic.pause();

    }else if(!this.muted() && this.playedMusic){
        let music = this.routeToMusic();
        if(this.playedMusic.src.split('/').pop() !== music) {
          this.playedMusic.pause(); // Stop the currently playing music
          this.playedMusic.currentTime = 0; // Reset to the beginning
          this.playMusic(music);
        }else{
          this.playedMusic.play(); // Resume the currently playing music
        }
        // Play the new music
    }

    else if(!this.muted() && !this.playedMusic){
      // Start game music 
      this.playMusic(this.routeToMusic());
    }
  }

  routeToMusic(): string {
    // Get last element of the current url path
    let urlSegments = this.router.url.split('/');
    let gameScreen = urlSegments[urlSegments.length - 1];
    if(gameScreen === '') gameScreen = 'start';
    switch (gameScreen) {
      case 'start':
        return 'main_menu.mp3'; // Main menu music
      case 'play':
        return 'main_music.mp3'; // Game music
      case 'victory':
        return 'main_menu.mp3'; // Main menu music
      case 'defeat':
        return 'main_menu.mp3'; // Main menu music
      default:
        return 'main_menu.mp3'; // Default to main menu music
    }
  }

  stopSound(path: string) {
    
  }

  isMusicMuted() {
    return this.muted();
  }


}
