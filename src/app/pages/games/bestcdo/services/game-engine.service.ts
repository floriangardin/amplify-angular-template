import { Injectable, signal, computed } from '@angular/core';

@Injectable()
export class GameEngineService {
  private gameClock = signal(0);
  private gameInterval: any = null;
  private tickCallbacks: ((elapsed: number) => void)[] = [];

  readonly isRunning = computed(() => this.gameInterval !== null);
  readonly elapsedTime = computed(() => this.gameClock());

  /**
   * Start the game loop
   */
  start(onTick?: (elapsed: number) => void): void {
    if (this.gameInterval) {
      console.warn('Game engine already running');
      return;
    }

    this.gameClock.set(0);
    
    if (onTick) {
      this.tickCallbacks.push(onTick);
    }

    this.gameInterval = setInterval(() => {
      this.gameClock.update(t => t + 100);
      const elapsed = this.gameClock();
      
      // Execute all registered callbacks
      this.tickCallbacks.forEach(callback => callback(elapsed));
    }, 100);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
      this.tickCallbacks = [];
    }
  }

  /**
   * Pause the game (keep clock value)
   */
  pause(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  /**
   * Resume the game from paused state
   */
  resume(): void {
    if (!this.gameInterval) {
      this.gameInterval = setInterval(() => {
        this.gameClock.update(t => t + 100);
        const elapsed = this.gameClock();
        this.tickCallbacks.forEach(callback => callback(elapsed));
      }, 100);
    }
  }

  /**
   * Reset the game clock
   */
  reset(): void {
    this.stop();
    this.gameClock.set(0);
  }

  /**
   * Get current elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return Math.floor(this.gameClock() / 1000);
  }

  /**
   * Add a callback to be executed on each tick
   */
  addTickCallback(callback: (elapsed: number) => void): void {
    this.tickCallbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  removeTickCallback(callback: (elapsed: number) => void): void {
    this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
  }
}
