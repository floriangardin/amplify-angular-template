import { Component, input, output,inject, OnChanges, SimpleChanges, effect, untracked, OnInit, TemplateRef, ViewChild, ElementRef, ViewContainerRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Email } from '../../../../models/email';
import { EmailListItemComponent } from './email-list-item.component';
import { LibraryItem } from '../../../../models/game-content';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';

@Component({
  selector: 'app-email-inbox',
  standalone: true,
  imports: [CommonModule, EmailListItemComponent, OverlayModule, PortalModule],
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
      [class.vibrate]="vibrate()"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-300 flex flex-col shrink-0">
        <div class="flex flex-row justify-between items-center">
            <div class="flex flex-col flex-1">
                
                <div class="text-lg font-semibold m-auto w-full">
                  Inbox ({{ emails().length }})
                </div>
                <div class="text-xs text-gray-500 mt-1">Most recent first</div>
            </div>

          <div
              href="https://calendly.com/charlotteledoux-pro/30min-meeting"
              target="_blank"
              rel="noopener noreferrer"
              class=" py-2 px-4 rounded-lg font-semibold text-md text-white"
            >
              <button #libraryTrigger (click)="openLibrary()" class="flex flex-row items-center gap-2 text-primary hover:text-primary-700 cursor-pointer">
                <i class="fa-solid fa-book"></i>
                <span>Library</span>
                <span> &#9662; </span>
              </button>
          </div>

        </div>

      </div>
      
      <!-- Library Menu Template rendered via CDK Overlay -->
      <ng-template #libraryMenu>
        <div class="bg-white rounded-md shadow-xl border border-gray-200 w-80 max-h-[70vh] overflow-auto">
          <div class="p-3 border-b border-gray-100 sticky top-0 bg-white">
            <div class="text-sm font-bold text-gray-700">Resources</div>
            <div class="text-xs text-gray-500">Click an item to view details</div>
          </div>
          <ul class="divide-y divide-gray-100">
            @for (item of library(); track item.nameId) {
              <li class="p-3 hover:bg-gray-50 cursor-pointer" (click)="onLibraryItemClick(item)">
                <div class="text-sm font-medium text-gray-800">{{item.emoji}} {{ item.title }}</div>
                <div class="text-xs text-gray-600 mt-1 whitespace-pre-line">{{ item.description }}</div>
              </li>
            }
          </ul>
        </div>
      </ng-template>

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
export class EmailInboxComponent implements OnInit {

  overlay = inject(Overlay);
  vcr = inject(ViewContainerRef);

  emails = input.required<Email[]>();
  library = input.required<LibraryItem[]>();
  selectedEmailName = input<string | null>(null);
  companyLogo = input<string | null>(null);
  isEditable = input<boolean>(false);



  emailSelected = output<Email>();
  logoChanged = output<string>();
  libraryItemSelected = output<LibraryItem>();

  reversedEmails = () => this.emails().slice().reverse();
  vibrate = signal<boolean>(false);
  private previousEmailCount = 0;
  private overlayRef: OverlayRef | null = null;

  @ViewChild('libraryMenu') libraryMenuTpl!: TemplateRef<unknown>;
  @ViewChild('libraryTrigger', { read: ElementRef }) libraryTriggerEl!: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const currentEmailCount = this.emails().length;
      if (currentEmailCount > this.previousEmailCount) {
        this.vibrate.set(true);
        setTimeout(() => {
          this.vibrate.set(false);
        }, 500);
      }
      this.previousEmailCount = currentEmailCount;
    });
  }
  ngOnInit() {
  }

  openLibrary() {
    // Close existing overlay if open
    if (this.overlayRef) {
      this.closeLibrary();
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.libraryTriggerEl)
      .withPositions([
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      ])
      .withFlexibleDimensions(true)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const portal = new TemplatePortal(this.libraryMenuTpl, this.vcr);
    this.overlayRef.attach(portal);

    const subBackdrop = this.overlayRef.backdropClick().subscribe(() => this.closeLibrary());
    const subDetach = this.overlayRef.detachments().subscribe(() => this.disposeOverlay());

    // Clean up subscriptions when overlay is disposed
    this.overlayRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.closeLibrary();
      }
    });

    // Tie subs to overlayRef for later cleanup
    (this.overlayRef as any)._subs = [subBackdrop, subDetach];
  }

  closeLibrary() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.disposeOverlay();
    }
  }

  private disposeOverlay() {
    if (this.overlayRef) {
      const subs = (this.overlayRef as any)._subs as any[] | undefined;
      subs?.forEach((s) => s.unsubscribe());
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  onLibraryItemClick(item: LibraryItem) {
    // Currently just closes the menu; description is shown inline per requirements
    this.closeLibrary();
    this.libraryItemSelected.emit(item);
  }
}
