import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditableTextComponent } from '../../../../ui/fields/editable-text.component';
import { ChoiceButtonComponent, ChoiceValidation } from '../../../../ui/elements/choice-button.component';
import { ContentDialogComponent } from '../../../../ui/elements/content-dialog.component';
import { Email, Choice } from '../../../../models/email';
import { Stats } from '../../../../models/stats';
import { getImpactColor, formatCurrency } from '../utils/game-formatters';
import { Scenario, LibraryItem } from '../../../../models/game-content';
import { ButtonComponent } from '../../../../ui/elements/button.component';

export interface OutcomeData {
  message: string;
  effects: Stats;
  emailName: string;
  choiceName: string;
}

@Component({
  selector: 'app-email-viewer',
  standalone: true,
  imports: [CommonModule, EditableTextComponent, ChoiceButtonComponent, ButtonComponent],
  template: `
    
    @if (email()) {
      <!-- Email Header -->
      <div class="py-2 px-4 md:py-4 border-b border-gray-200 bg-gray-50 relative shrink-0">
        @if (isMobile()) {
          <button
            class="bg-primary-500 text-white rounded px-3 py-1 text-sm mb-3" 
            (click)="backClicked.emit()"
          >
            ← Back to inbox
          </button>
        }

        <div class="text-sm font-semibold flex flex-wrap gap-3 items-center mb-3">
          <app-editable-text 
            [contentClass]="'text-base md:text-xl font-normal'" 
            [isEditable]="isEditable()" 
            [isMarkdown]="true"
            [text]="emailTitle()" 
            (newText)="titleChanged.emit($event)" 
          />
          @if (urgentSecondsLeft() !== null) {
            <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-white bg-red-600 px-3 py-1 rounded-full">
              <span>Urgent</span>
              <span>{{ urgentSecondsLeft() }}s</span>
            </span>
          }
        </div>
        
        <div class="flex flex-col md:space-y-1 text-xs md:text-sm text-gray-500">
          <div class="flex items-center">
            <span class="md:font-medium w-14">From:</span>
            <app-editable-text 
              [contentClass]="'text-sm text-gray-700'" 
              [isEditable]="isEditable()" 
              [isMarkdown]="true"
              [text]="emailSender()" 
              (newText)="senderChanged.emit($event)" 
            />
          </div>
          <div class="hidden md:flex items-center">
            <span class="font-medium w-14">To:</span>
            <span class="text-gray-700">{{ recipientName() }}</span>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      @if (!outcomeData()) {
        <div class="flex-1 min-h-0 overflow-y-auto p-5 space-y-6 text-sm leading-relaxed">
          <!-- Email Content -->
          <div class="space-y-4">
            <app-editable-text 
              [contentClass]="'text-gray-700'" 
              [isEditable]="isEditable()" 
              [isMarkdown]="true"
              [text]="formattedEmailContent()" 
              (newText)="contentChanged.emit($event)" 
            />
          </div>

          <!-- Hints under content -->
          @if (email()?.hints?.length) {
            <div class="pt-3 mt-2 border-t border-dashed border-gray-200">
              <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">Hints</div>
              <div class="flex flex-wrap gap-2">
                @for (hint of resolvedHints(); track hint.nameId) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 hover:border-primary-300 transition-colors text-xs"
                    (click)="onHintClick(hint)"
                    title="Open hint"
                  >
                    <span class="text-base leading-none">{{ hint.emoji || '💡' }}</span>
                    <div class="font-semibold">{{ hint.title }}</div>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Choices -->
          <div class="pt-5 mt-2 border-t border-gray-300 bg-gray-100 p-4 rounded-lg">
            <div class="text-base font-semibold mb-4">Your Response:</div>
            @for (choice of emailChoices(); track choice.name; let i = $index) {
              <app-choice-button
                [choice]="choice"
                [validation]="getValidation(choice)"
                [choiceText]="getEmojiFromIndex(i + 1) + '\ \ ' + getChoiceText(choice)"
                [isEditable]="isEditable()"
                [showImpacts]="showImpacts()"
                [content]="content()"
                (choiceSelected)="choiceSelected.emit($event)"
                (textChanged)="choiceTextChanged.emit({ choice: choice.name, text: $event })"
              />
            }
            @if (isMobile()) {
              <div class="h-30"></div>
            }
          </div>
        </div>
      } @else {
        <!-- Outcome Display -->
        <div class="flex-1 min-h-0 overflow-y-auto bg-white">
          <div class="p-5 border-t border-gray-300 bg-white">
            <app-editable-text 
              [contentClass]="'text-sm mb-8!'" 
              [isEditable]="isEditable()" 
              [isMarkdown]="true"
              [text]="outcomeData()!.message" 
              (newText)="outcomeDescriptionChanged.emit($event)" 
            />

            <div class="bg-gray-100 max-w-xs rounded-lg p-4 space-y-2 text-sm">
              @for (item of outcomeItems(); track item.key) {
                <div class="flex justify-between">
                  <span>{{ item.label }}</span>
                  <span class="font-bold" [style.color]="getColor(item.value)">
                    {{ item.formatted }}
                  </span>
                </div>
              }
            </div>
            @if (email()?.end) {
              <div class="mt-6 text-base md:text-lg font-semibold text-primary">
                🎉 You have reached the end of the game, well played ! Wait 5 seconds ...
              </div>
            }
          </div>
        </div>
      }
    } @else {
      <!-- Empty State -->
      <div class="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-auto">
        <div class="text-4xl "><img class="w-24" src="folder.png" alt="Email Icon" /></div>
        <div class="max-w-xs text-primary">Select an email from your inbox to respond</div>
        <div class="text-sm max-w-xs text-primary-500 border-2 border-primary-500 rounded-lg p-6 max-w-xl leading-relaxed">
          <b>⚠️ IMPORTANT ⚠️</b><br />
          • Maximise company profit 📈<br />
          • Each decision determines what comes next <br/>
        </div>
        @if (!gameStarted()) {
          <app-button [contentClass]="'btn-cta'" class="w-full max-w-xs" (click)="startGameClicked.emit()"></app-button>
        }
      </div>
    }
  `,
  styles: [`
    /* Scrollbar styling for WebKit browsers */
    ::-webkit-scrollbar {
      width: 4px;
    }
    ::-webkit-scrollbar-track {
      background: var(--color-gray-200);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--color-primary-500);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `],
  host: { class: 'flex flex-col h-full w-full' }
})
export class EmailViewerComponent {
  // Terms to auto-link in displayed texts (title, sender, content, outcomes)
  content = input<Scenario>();
  
  // Dialog state for opening local resources like on the last screen
  showDialog = signal(false);
  dialogTitle = signal('Resource');
  dialogHref = signal('');
  // Inputs
  email = input<Email | null>(null);
  emailTitle = input<string>('');
  emailSender = input<string>('');
  emailContent = input<string>('');
  emailChoices = input<Choice[]>([]);
  choiceValidations = input<Record<string, ChoiceValidation>>({});
  outcomeData = input<OutcomeData | null>(null);
  isEditable = input<boolean>(false);
  isMobile = input<boolean>(false);
  gameStarted = input<boolean>(false);
  showImpacts = input<boolean>(true);
  urgentSecondsLeft = input<number | null>(null);
  
  // Outputs
  backClicked = output<void>();
  choiceSelected = output<Choice>();
  startGameClicked = output<void>();
  titleChanged = output<string>();
  senderChanged = output<string>();
  contentChanged = output<string>();
  choiceTextChanged = output<{ choice: string; text: string }>();
  outcomeDescriptionChanged = output<string>();
  hintSelected = output<LibraryItem>();

  recipientName = computed(() => {
    return 'player';
  });

  // Utility functions
  getColor = getImpactColor;
  
  getValidation(choice: Choice): ChoiceValidation {
    return this.choiceValidations()[choice.name] || { canSelect: true };
  }

  formattedEmailContent = computed(() => {
    let emailContent = this.emailContent();
    return emailContent.replace('{first_name}', 'player');

  });

  resolvedHints = computed<LibraryItem[]>(() => {
    const raw = (this.email() as any)?.hints as (string[] | LibraryItem[] | undefined);
    const lib = this.content()?.library || [];
    if (!raw || raw.length === 0) return [];
    if (typeof raw[0] === 'object') return raw as LibraryItem[];
    const ids = raw as string[];
    const out: LibraryItem[] = [];
    for (const id of ids) {
      const match = lib.find((l) => l.nameId === id);
      if (match) out.push(match);
      else out.push({ nameId: id, title: id, description: id, emoji: '💡' });
    }
    return out;
  });

  onHintClick(item: LibraryItem) {
    this.hintSelected.emit(item);
  }

  getChoiceText(choice: Choice): string {
    const email = this.email();
    if (!email) return choice.text;
    return choice.text;
  }

  getSign(value: number): string {
    return value > 0 ? '+' : value < 0 ? '-' : '';
  }

  getSignNoMinus(value: number): string {
    return value > 0 ? '+' : '';
  }

  getAbs(value: number): number {
    return Math.abs(value);
  }

  getEmojiFromIndex(index: number): string {
    if(index == 1) return '1️⃣';
    if(index == 2) return '2️⃣';
    if(index == 3) return '3️⃣';
    if(index == 4) return '4️⃣';
    if(index == 5) return '5️⃣';
    return '';
  }
  outcomeItems = computed(() => {
    const effects = this.outcomeData()?.effects;
    if (!effects) return [] as { key: string; label: string; value: number; formatted: string }[];
    const defs = this.content()?.indicators || [];
    const items: { key: string; label: string; value: number; formatted: string }[] = [];
    for (const [key, delta] of Object.entries(effects)) {
      const def = defs.find(d => d.nameId === key);
      if (!def || typeof delta !== 'number') continue;
      let formatted = '';
      if (def.type === 'dollars') {
        formatted = this.getSign(delta) + '$' + this.getAbs(delta);
      } else if (def.type === 'percentage' || def.type === 'points') {
        formatted = this.getSignNoMinus(delta) + delta + (def.type === 'percentage' ? '%' : '');
      } else {
        formatted = this.getSign(delta) + this.getAbs(delta);
      }
      items.push({ key, label: `${def.emoji || ''} ${def.name}:`, value: delta, formatted });
    }
    return items;
  });

  


}
