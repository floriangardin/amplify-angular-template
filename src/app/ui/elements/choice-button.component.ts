import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/email';
import { EditableTextComponent } from '../fields/editable-text.component';
import { getImpactColor, formatCurrency } from '../utils/game-formatters';

export interface ChoiceValidation {
  canSelect: boolean;
  reason?: string;
}

@Component({
  selector: 'app-choice-button',
  standalone: true,
  imports: [CommonModule, EditableTextComponent],
  template: `
    <div
      class="w-full text-left p-3 rounded-lg mb-2 border transition-all"
      [ngClass]="{
        'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed': !validation().canSelect,
        'bg-gray-50 border-gray-300 hover:border-primary-500 cursor-pointer': validation().canSelect
      }"
      (click)="handleClick($event)"
    >
      <div class="flex flex-col space-y-2">
        <app-editable-text 
          [contentClass]="'text-gray-700'" 
          [isEditable]="isEditable()" 
          [isMarkdown]="true"
          [text]="choiceText()" 
          [linkTerms]="termsLinks()"
          (linkClick)="onLinkClick($event)"
          (newText)="textChanged.emit($event)" 
        />
        
        @if (showImpacts()) {
          <div class="flex flex-wrap gap-2 text-sm">
            @for (item of impactItems(); track item.key) {
              <span [style.color]="getColor(item.value)">
                {{ item.emoji }} {{ item.text }}
              </span>
            }
          </div>
        }
      </div>
      
      @if (!validation().canSelect) {
        <div class="text-red-600 text-xs mt-1 font-bold">
          {{ validation().reason }}
        </div>
      }
    </div>
  `
})
export class ChoiceButtonComponent {
  choice = input.required<Choice>();
  validation = input.required<ChoiceValidation>();
  choiceText = input.required<string>();
  isEditable = input<boolean>(false);
  showImpacts = input<boolean>(true);
  content = input<any>(null);
  
  // Compute term links reactively from provided content
  termsLinks = computed(() => this.content()?.termsLinks || []);
  choiceSelected = output<Choice>();
  textChanged = output<string>();
  linkClicked = output<{ label: string; href: string }>();

  getColor = getImpactColor;
  formatCurrency = formatCurrency;

  impactItems = computed(() => {
    const defs = this.content()?.indicators;
    const impact = this.choice().outcome.impact || {} as any;
    const items: { key: string; emoji: string; value: number; text: string }[] = [];
    for (const [key, delta] of Object.entries(impact)) {
      if (typeof delta !== 'number' || !delta) continue;
      const def = defs.find((d: any) => d.nameId === key);
      if (!def) continue;
      let text = '';
      if (def.type === 'dollars') text = this.formatCurrency(delta);
      else if (def.type === 'percentage') text = `${delta > 0 ? '+' : ''}${delta} %`;
      else text = `${delta > 0 ? '+' : ''}${delta}`;
      items.push({ key, emoji: def.emoji || '', value: delta, text });
    }
    return items;
  })

  handleClick(event: MouseEvent): void {
    if (!this.validation().canSelect) return;
    
    // Prevent choice selection if clicking on a link
    let target = event.target as HTMLElement;
    while (target && target !== event.currentTarget) {
      if (target.tagName === 'A') {
        return;
      }
      target = target.parentElement!;
    }
    
    this.choiceSelected.emit(this.choice());
  }

  onLinkClick(payload: { label: string; href: string }) {
    this.linkClicked.emit(payload);
  }
}
