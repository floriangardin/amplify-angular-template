import { Component, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditableTextComponent } from '../ui/fields/editable-text.component';
import { ChatbotComponent } from '../ui/elements/chatbot.component';
import { CookieConsentBannerComponent } from '../ui/elements/cookie-consent-banner.component';
import { ChoiceButtonComponent, ChoiceValidation } from '../ui/elements/choice-button.component';
import { StatDisplayComponent } from '../ui/elements/stat-display.component';
import { ProgressStatComponent } from '../ui/elements/progress-stat.component';
import { SoundToggleComponent } from '../ui/elements/sound-toggle.component';
import { LoadingComponent } from '../ui/elements/loading.component';
import { InputDialogComponent } from '../ui/elements/input-dialog.component';
import { ConfirmDialogComponent } from '../ui/elements/confirm-dialog.component';
import { ContentDialogComponent } from '../ui/elements/content-dialog.component';
import { ColorPickerDialogComponent } from '../ui/elements/color-picker-dialog.component';
import { HeaderComponent } from '../ui/elements/header.component';
import { SidebarComponent } from '../ui/elements/sidebar.component';
import { FooterComponent } from '../ui/elements/footer.component';
import { MenuComponent } from '../ui/elements/menu.component';
import type { MenuItem } from '../ui/elements/menu.component';
import { DropdownComponent } from '../ui/elements/dropdown.component';
import type { DropdownOption } from '../ui/elements/dropdown.component';
import type { Choice } from '../models/email';


// UI KIT HOME PAGE DEMO
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
  <div class="min-h-screen p-0 md:p-0 space-y-8">
    <!-- App Shell -->
    <app-header>
      <app-menu [items]="menuItems()" (navigate)="onNavigate($event)" />
      <button class="small-btn" (click)="recordAction('New project')">New project</button>
    </app-header>

    <div class="flex">
      <main class="flex-1 p-6 md:p-10 space-y-10">
        <header class="space-y-2">
          <h1 class="text-4xl font-bold">UI Kit</h1>
          <p class="text-gray-600 max-w-2xl">A quick tour of the reusable elements and fields with realistic demo data and interactions.</p>
        </header>

    <div class="card p-6 space-y-8">
    <!-- Stats -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Stats</h2>
      <div class="flex flex-wrap gap-6 items-start">
        <app-stat-display icon="💰" label="Revenue" [value]="revenue()" />
        <app-stat-display icon="⚠️" label="Operational Risk" [value]="risk()" [formatter]="percentFormatter" />
      </div>
      <div class="flex flex-wrap gap-6 items-start">
        <app-progress-stat icon="😊" label="Satisfaction" [value]="satisfaction()" color="secondary" />
        <app-progress-stat icon="✅" label="Compliance" [value]="compliance()" color="amber" />
      </div>
    </section>

    <!-- Choice Button -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Choice Button</h2>
      <div class="max-w-2xl">
        <app-choice-button
          [choice]="demoChoice"
          [validation]="choiceValidation"
          [choiceText]="demoChoice.text"
          [isEditable]="false"
          [showImpacts]="true"
          [content]="demoContent"
          (choiceSelected)="onChoiceSelected($event)"
          (textChanged)="onChoiceTextChanged($event)"
          (linkClicked)="onAutoLink($event)"
        />
        <p class="text-sm text-gray-600">Last selection: <span class="font-medium">{{ lastChoiceName() || '—' }}</span></p>
      </div>
    </section>

    <!-- Dropdown & Menu -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Menu and Dropdown</h2>
      <div class="flex items-center gap-6">
        <app-menu [items]="menuItems()" (navigate)="onNavigate($event)" />
        <app-dropdown [options]="filterOptions" [value]="filter()" (valueChange)="filter.set($event)" />
        <span class="text-sm text-gray-600">Filter: <strong>{{ filter() }}</strong></span>
      </div>
    </section>

    <!-- Text field -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Editable Text</h2>
      <div class="max-w-2xl">
        <app-editable-text
          [text]="editableText()"
          [isEditable]="true"
          [isMarkdown]="true"
          [contentClass]="'prose max-w-none'"
          [linkTerms]="demoContent.terms_links"
          (newText)="editableText.set($event)"
          (linkClick)="onAutoLink($event)"
        />
      </div>
    </section>

    <!-- Toggles & Loaders -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Toggles & Loading</h2>
      <div class="flex items-center gap-4">
        <app-sound-toggle [isMuted]="muted()" (toggle)="muted.set(!muted())" />
        <span class="text-sm text-gray-600">Sound: <strong>{{ muted() ? 'Muted' : 'On' }}</strong></span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <app-loading text="dashboard" />
        <app-loading text="reports" />
        <app-loading text="simulations" />
      </div>
    </section>

    <!-- Dialogs -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Dialogs</h2>
      <div class="flex flex-wrap gap-3">
        <button class="px-4 py-2 rounded-md bg-gray-900 text-white" (click)="showConfirm.set(true)">Open Confirm</button>
        <button class="px-4 py-2 rounded-md bg-primary-600 text-white" (click)="showInput.set(true)">Open Input</button>
        <button class="px-4 py-2 rounded-md bg-secondary-600 text-white" (click)="showContent.set(true)">Open Content</button>
        <button class="px-4 py-2 rounded-md bg-amber-500 text-white" (click)="showColor.set(true)">Open Color Picker</button>
      </div>
      <p class="text-sm text-gray-600">Last action: <span class="font-medium">{{ lastAction() || '—' }}</span></p>
    </section>

    <!-- Cookie Consent banner (demo) -->
    <section class="space-y-3">
      <h2 class="text-xl font-semibold">Cookie Consent (Banner demo)</h2>
      <div class="flex items-center gap-3">
        <button class="px-3 py-2 rounded border" (click)="hasConsent.set(null)">Show Banner</button>
        <span class="text-sm text-gray-600">Consent: <strong>{{ consentLabel() }}</strong></span>
      </div>
      <app-cookie-consent-banner
        [hasConsent]="hasConsent()"
        (acceptCookie)="onAcceptCookies()"
        (declineCookie)="onDeclineCookies()"
      />
    </section>

    <!-- Chatbot (floats bottom-right) -->
    <section class="space-y-2 pb-28">
      <h2 class="text-xl font-semibold">Chatbot</h2>
      <p class="text-sm text-gray-600">Click the floating button to chat. We simulate sending and return a success after a short delay.</p>
      <app-chatbot
        email="john.doe@acme.com"
        subject="UI Kit Feedback"
        fromName="UI Kit Demo"
        [submissionStatus]="chatStatus()"
        (sendEmail)="onChatSend($event)"
      />
    </section>

    </div>
      </main>
    </div>

    <app-footer />
  </div>

  <!-- Overlays -->
  @if (showConfirm()) {
    <app-confirm-dialog
      title="Delete report"
      message="This will permanently remove the report and its insights."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      (confirmed)="recordAction('Report deleted'); showConfirm.set(false)"
      (cancelled)="recordAction('Deletion cancelled'); showConfirm.set(false)"
    />
  }

  @if (showInput()) {
    <app-input-dialog
      title="Create Dashboard"
      message="Provide a name for your dashboard."
      label="Dashboard name"
      confirmLabel="Create"
      cancelLabel="Cancel"
      [defaultValue]="'Executive Overview'"
      (confirmed)="recordAction('Created: ' + $event); showInput.set(false)"
      (cancelled)="recordAction('Creation cancelled'); showInput.set(false)"
    />
  }

  @if (showContent()) {
    <app-content-dialog
      title="Data Governance Overview"
      [href]="contentHref()"
      (closed)="recordAction('Content closed'); showContent.set(false)"
    />
  }

  @if (showColor()) {
    <app-color-picker-dialog
      title="Pick Theme Color"
      message="Choose a primary accent for your workspace."
      [defaultColor]="colorValue()"
      [presetsInput]="['#14b8a6', '#0ea5e9', '#f43f5e', '#f59e0b']"
      (confirmed)="onColorPicked($event)"
      (cancelled)="recordAction('Color picker cancelled'); showColor.set(false)"
    />
  }
  `,
  host: { class: 'w-full block' },
  styles: [`
    :host { display: block; }
  `],
  imports: [
    CommonModule,
    // fields
    EditableTextComponent,
    // elements
    ChatbotComponent,
    CookieConsentBannerComponent,
    ChoiceButtonComponent,
    StatDisplayComponent,
    ProgressStatComponent,
    SoundToggleComponent,
    LoadingComponent,
    InputDialogComponent,
    ConfirmDialogComponent,
    ContentDialogComponent,
    ColorPickerDialogComponent,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    MenuComponent,
    DropdownComponent,
  ],
})
export class HomeComponent implements OnDestroy {
  // Demo state
  muted = signal(false);
  sidebarCollapsed = signal(false);

  // Stats
  revenue = signal(248_000);
  risk = signal(-12); // percent
  satisfaction = signal(72);
  compliance = signal(38);
  // Menu + Sidebar
  menuItems = signal<MenuItem[]>([
    { label: 'Home', href: '#', active: true },
    { label: 'Reports', href: '#' },
    { label: 'Datasets', href: '#' },
    { label: 'Settings', href: '#' },
  ]);
  sidebarItems = signal([{ label: 'Dashboard', icon: '📊' }, { label: 'Pipelines', icon: '🛠️' }, { label: 'Quality', icon: '✅' }, { label: 'Security', icon: '🔐' }]);
  filter = signal('all');
  filterOptions: DropdownOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ];

  // Formatters
  percentFormatter = (v: number) => `${v > 0 ? '+' : ''}${v} %`;

  // Choice demo
  demoContent = {
    indicators: {
      revenue: { emoji: '💰', type: 'dollars' },
      satisfaction: { emoji: '😊', type: 'percentage' },
      risk: { emoji: '⚠️', type: 'number' },
    },
    terms_links: {
      GDPR: { href: 'https://gdpr.eu/', title: 'GDPR regulation' },
      "data lineage": { href: 'https://en.wikipedia.org/wiki/Data_lineage' },
    },
  } as const;

  demoChoice: Choice = {
    name: 'launch_customer_360',
    text: 'Launch a Customer 360 initiative focusing on consent, GDPR and robust data lineage across key domains.',
    outcome: {
      description: 'Initial investment with positive mid-term ROI',
      dataQualityImpact: 12,
      impact: {
        revenue: 125000,
        satisfaction: 9,
        risk: -2,
      },
      next: ['notify_it_security']
    }
  };

  choiceValidation: ChoiceValidation = {
    canSelect: true,
  };

  lastChoiceName = signal<string | null>(null);

  // Editable text demo
  editableText = signal<string>(
    `### Welcome to the UI Kit\n\nThis page demonstrates our reusable components.\n\n- Built with Angular standalone components\n- Accessible and keyboard-friendly\n- Ready for theming with custom colors\n\nLearn more about GDPR and data lineage via auto-links.\n`
  );

  // Dialogs
  showConfirm = signal(false);
  showInput = signal(false);
  showContent = signal(false);
  showColor = signal(false);
  lastAction = signal<string>('');
  contentHref = signal<string>('overview_data_governance.html');
  colorValue = signal<string>('#10b981');

  // Cookie consent (demo)
  hasConsent = signal<boolean | null>(null);

  // Chatbot
  chatStatus = signal<'idle' | 'success' | 'error'>('idle');

  private timers: any[] = [];

  constructor() {
    // Periodically change stats to showcase animations
    this.timers.push(setInterval(() => {
      const revDelta = Math.round((Math.random() - 0.4) * 20_000);
      const riskDelta = Math.round((Math.random() - 0.5) * 4);
      const satDelta = Math.round((Math.random() - 0.5) * 6);
      const compDelta = Math.round((Math.random() - 0.5) * 8);
      this.revenue.set(Math.max(120_000, this.revenue() + revDelta));
      this.risk.set(Math.max(-30, Math.min(30, this.risk() + riskDelta)));
      this.satisfaction.set(Math.max(0, Math.min(100, this.satisfaction() + satDelta)));
      this.compliance.set(Math.max(0, Math.min(100, this.compliance() + compDelta)));
    }, 4000));
  }

  // Handlers
  onChoiceSelected(choice: Choice) {
    this.lastChoiceName.set(choice.name);
  }

  onNavigate(item: MenuItem){
    this.menuItems.update(list => list.map(it => ({ ...it, active: it.label === item.label })));
    this.recordAction(`Navigate: ${item.label}`);
  }

  onChoiceTextChanged(newText: string) {
    this.recordAction('Choice text updated');
  }

  onAutoLink(evt: { label: string; href: string }) {
    // Open the content dialog for internal links, otherwise just record
    if (evt.href.includes('content/')) {
      const path = evt.href.split('/content/')[1];
      if (path) {
        this.contentHref.set(path);
        this.showContent.set(true);
        return;
      }
    }
    this.recordAction(`Link clicked: ${evt.label}`);
  }

  onAcceptCookies() {
    this.hasConsent.set(true);
    this.recordAction('Cookies accepted');
  }

  onDeclineCookies() {
    this.hasConsent.set(false);
    this.recordAction('Cookies declined');
  }

  consentLabel(): string {
    const v = this.hasConsent();
    return v === null ? 'pending' : v ? 'accepted' : 'declined';
  }

  onChatSend(fd: FormData) {
    this.recordAction('Chat message sent');
    this.chatStatus.set('idle');
    // Simulate async submission
    setTimeout(() => {
      this.chatStatus.set('success');
      // Reset to idle after the chatbot auto-resets
      setTimeout(() => this.chatStatus.set('idle'), 6000);
    }, 900);
  }

  onColorPicked(color: string) {
    this.colorValue.set(color);
    this.recordAction(`Color picked: ${color}`);
    this.showColor.set(false);
  }

  recordAction(msg: string) {
    this.lastAction.set(msg);
  }

  ngOnDestroy(): void {
    this.timers.forEach(t => clearInterval(t));
  }
}
