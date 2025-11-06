import { Component, input, output, OnChanges, SimpleChanges, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Email } from '../../../../models/email';
import { EmailListItemComponent } from './email-list-item.component';

@Component({
  selector: 'app-email-inbox',
  standalone: true,
  imports: [CommonModule, EmailListItemComponent],
  styles: [
    `
      @keyframes vibrate {
        0% {
          transform: translateX(0);
        }
        20% {
          transform: translateX(-2px);
        }
        40% {
          transform: translateX(2px);
        }
        60% {
          transform: translateX(-2px);
        }
        80% {
          transform: translateX(2px);
        }
        100% {
          transform: translateX(0);
        }
      }
      .vibrate {
        animation: vibrate 0.5s ease-in-out;
      }
    `,
  ],
  template: `
    <div
      class="w-full md:w-[350px] border-r border-gray-300 flex flex-col bg-gray-100 z-10 min-h-0"
      [class.vibrate]="vibrate"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-300 flex flex-col shrink-0">
        <div class="flex flex-row justify-between items-center">
            <div class="flex flex-col flex-1">
                
                <div class="text-lg font-bold m-auto w-full">
                  Inbox ({{ emails().length }})
                </div>
                <div class="text-xs text-gray-500 mt-1">Most recent first</div>
            </div>

          <div
              href="https://calendly.com/charlotteledoux-pro/30min-meeting"
              target="_blank"
              rel="noopener noreferrer"
              class=" py-2 px-4 rounded-lg font-bold text-md text-white"
            >
              <span class="flex items-center justify-center gap-2 text-4xl">
                📧
              </span>
          </div>

        </div>

      </div>
      

      <!-- Email List -->
      <div class="flex-1 min-h-0 overflow-y-auto p-2">
        @if (!emails().length) {
        <div class="p-6 text-center text-gray-500 italic">
          Your inbox is empty. Great job!
        </div>
        } @for (mail of reversedEmails(); track mail.name) {
        <app-email-list-item
          [email]="mail"
          [isSelected]="selectedEmailName() === mail.name"
          (emailClick)="emailSelected.emit($event)"
        />
        }
      </div>
    </div>
  `,
})
export class EmailInboxComponent {
  emails = input.required<Email[]>();
  selectedEmailName = input<string | null>(null);
  companyLogo = input<string | null>(null);
  isEditable = input<boolean>(false);

  emailSelected = output<Email>();
  logoChanged = output<string>();

  reversedEmails = () => this.emails().slice().reverse();
  vibrate = false;
  private previousEmailCount = 0;

  constructor() {
    effect(() => {
      const currentEmailCount = this.emails().length;
      if (currentEmailCount > this.previousEmailCount) {
        this.vibrate = true;
        setTimeout(() => {
          this.vibrate = false;
        }, 500);
      }
      this.previousEmailCount = currentEmailCount;
    });
  }
}
