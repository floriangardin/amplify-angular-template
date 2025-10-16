import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="ui-header">
      <div class="ui-header__brand">
        <img src="/logo.png" alt="Logo" class="h-8 w-8 rounded" />
        <span class="ui-header__title">Maketools UI</span>
      </div>
      <div class="ui-header__center">
        <ng-content select="app-menu"></ng-content>
      </div>
      <div class="ui-header__actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`:host{display:block}`]
})
export class HeaderComponent {}
