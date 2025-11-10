import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Email, Choice } from '../../../models/email';
import {Stats, DefeatReason, DefeatStats} from '../../../models/stats';
import { BaseCDOComponent } from './base.component';
import { GameStatsHeaderComponent } from './components/game-stats-header.component';
import { EmailInboxComponent } from './components/email-inbox.component';
import { EmailViewerComponent, OutcomeData } from './components/email-viewer.component';
import { GameStatsService } from './services/game-stats.service';
import { EmailQueueService } from './services/email-queue.service';
import { GameEngineService } from './services/game-engine.service';
import { formatCurrency, getImpactColor } from './utils/game-formatters';
import { changeAndSetEmail } from './utils/change-emails';
import { HeaderComponent } from '../../../components/header.component';
import { LeaderboardService } from '../../../services/leaderboard.service';

export interface CompanyContext {
  name: string;
  industry: string;
  employees: number;
  revenue: string;
  founded: number;
  headquarters: string;
  dataTeamSize: number;
  description: string;
}

@Component({
  selector: 'app-bestcdo-game',
  standalone: true,
  imports: [CommonModule, GameStatsHeaderComponent, EmailInboxComponent, EmailViewerComponent, HeaderComponent],
  providers: [GameStatsService, EmailQueueService, GameEngineService],
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `],
  template: `
      
    @if (!content()) {
      <app-header class="md:fixed top-0 static left-0 w-screen"></app-header>
      <div class="min-h-screen flex items-center justify-center text-white">Loading game…</div>
    } @else {
    <!-- Parent fills the viewport; horizontal padding responsive -->
    <div class="min-h-screen flex items-center justify-center md:px-16 lg:px-32">
      <!-- Child uses a percentage of the small-viewport height; structured as a flex column -->
      <div class="w-full h-[100vh] md:h-[75svh] bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-opacity duration-700" [class.opacity-0]="fadeOut()">
        <!-- Top notice -->
        <app-header class="md:fixed top-0 left-0 static w-screen"></app-header>
        @if (statValue('reputation') <= 30 && !isMobile()) {
          <div class="w-full h-8 z-10 bg-primary-500 text-white pointer-events-none flex items-center justify-center shrink-0">
            Welcome to the Data Steward Simulator !
          </div>
        }
        <!-- Header bar with stats -->
        <app-game-stats-header
          [isMusicMuted]="sounds.isMusicMuted()"
          (soundToggled)="sounds.toggleMute()"
        />

        <!-- Main split area -->
        <div class="flex-1 min-h-0 flex overflow-hidden">
          <!-- Inbox column -->
          @if (showInbox()) {
            <app-email-inbox
              [emails]="inbox()"
              [selectedEmailName]="selectedEmail()?.name || null"
              [companyLogo]="content()['logo_company']?.['assetId'] || null"
              [isEditable]="isEditable()"
              (emailSelected)="selectEmail($event)"
              [ngClass]="inboxPanelClasses()"
            />
          }

          <!-- Main panel -->
          <app-email-viewer
            [content]="content()"
            [email]="selectedEmail()"
            [emailTitle]="getEmailField('title')"
            [emailSender]="getEmailField('sender')"
            [emailContent]="getEmailField('content')"
            [emailChoices]="selectedEmailChoices()"
            [choiceValidations]="choiceValidations()"
            [outcomeData]="outcomeData()"
            [isEditable]="isEditable()"
            [isMobile]="isMobile()"
            [gameStarted]="gameStarted()"
            [showImpacts]="gameStateService.difficulty() !== 'hard'"
            (backClicked)="back()"
            (choiceSelected)="choose($event)"
            (startGameClicked)="startGame()"
            (titleChanged)="changeEmailField('title', $event)"
            (senderChanged)="changeEmailField('sender', $event)"
            (contentChanged)="changeEmailField('content', $event)"
            (choiceTextChanged)="handleChoiceTextChange($event)"
            (outcomeDescriptionChanged)="handleOutcomeDescriptionChange($event)"
            [ngClass]="mainPanelClasses()"
          />
        </div>
      </div>
    </div>
        <!-- Chatbot
    @if(this.showEmailList()){
      <app-chatbot></app-chatbot>
      
    }
       -->
      }
  `
})
export class BestCDOGameComponent extends BaseCDOComponent implements OnInit, OnDestroy {

  isEditable = input(false);
  
  /* ──────────────── services ────────────── */
  gameStatsService = inject(GameStatsService);
  emailQueueService = inject(EmailQueueService);
  gameEngineService = inject(GameEngineService);
  leaderboardService = inject(LeaderboardService);

  /* ──────────────── constants ───────────── */
  private readonly initialScore: number = 1_000_000;

  /* ──────────────── state signals ───────── */
  emails = computed<Email[]>(() => this.computeGame());
  gameStarted = signal(false);
  inbox = signal<Email[]>([]);
  selectedEmail = signal<Email | null>(null);
  answeredEmails = signal<string[]>([]);
  outcomeMessage = signal<string | null>(null);
  choiceId = signal<{ mail: string; choice: string } | null>(null);
  outcomeEffects = signal<Stats | null>(null);
  nbMails = signal<number>(0);
  lastMailId = signal<string>('__START__');
  showEmailList = signal<boolean>(false);
  // End flow
  isEnding = signal(false);
  fadeOut = signal(false);
  private endTimeoutHandle: any = null;
  private navigateTimeoutHandle: any = null;

  /* ──────────────── computed values ───────── */
  showInbox = computed(() => !this.isMobile() || this.showEmailList());
  
  selectedEmailChoices = computed(() => {
    const email = this.selectedEmail();
    if (!email) return [];
    return Object.values(email.choices);
  });

  choiceValidations = computed(() => {
    const email = this.selectedEmail();
    if (!email) return {};
    const validations: Record<string, any> = {};
    Object.values(email.choices).forEach(choice => {
      validations[choice.name] = this.gameStatsService.canAfford(choice);
    });
    return validations;
  });

  outcomeData = computed<OutcomeData | null>(() => {
  const message = this.outcomeMessage();
  const effects = this.outcomeEffects();
    const choiceInfo = this.choiceId();
    if (!message || !effects || !choiceInfo) return null;
    return {
      message,
      effects,
      emailName: choiceInfo.mail,
      choiceName: choiceInfo.choice
    };
  });

  /* ──────────────── effects ───────────── */
  mobileEffect = effect(() => {
    /* auto‑hide list on mobile when selecting mail */
    if (this.isMobile() && this.selectedEmail()) this.showEmailList.set(false);
  });

  // Initialize game once the scenario content is available (handles async fetch)
  private currentScenarioId = signal<string | null>(null);
  contentInitEffect = effect(() => {
    const content = this.content();
    const id = (content as any)?.id ?? null;
    if (!id) return; // scenario not ready yet

    // If we already initialized for this scenario id, skip
    if (this.currentScenarioId() === id) return;
    this.currentScenarioId.set(id);

    // Reset transient state when a new scenario arrives
    this.gameEngineService.stop();
    this.gameStarted.set(false);
    this.inbox.set([]);
    this.selectedEmail.set(null);
    this.answeredEmails.set([]);
    this.outcomeMessage.set(null);
    this.choiceId.set(null);
    this.outcomeEffects.set(null);
    this.nbMails.set(0);
    this.lastMailId.set('__START__');
    this.showEmailList.set(false);
    this.isEnding.set(false);
    this.fadeOut.set(false);

    // Initialize services now that emails are available
    const emails = this.emails();
    this.gameStatsService.initialize(this.initialScore);
    this.emailQueueService.initialize(emails.filter(e => e.default));

    // In editable mode, auto-start and expose all emails
    if (this.isEditable()) {
      this.startGame();
      this.inbox.set(this.emailQueueService.getAllAvailable());
      this.emailQueueService.initialize([]);
    }
  });

  /* ──────────────── lifecycle ───────────── */
  override ngOnInit(): void {
    /* responsive */
    window.addEventListener('resize', this.handleResize);
    
    /* background music fire‑and‑forget */
    this.sounds.playMusic('main_music.mp3', true, 0.5);
  }

  computeGame(): Email[] {
    const c = this.content();
    if (!c) return [];
    const emails = c.nodes;
    return emails || [];
  }

  ngOnDestroy(): void {
    this.gameEngineService.stop();
    window.removeEventListener('resize', this.handleResize);
    this.sounds.stopSound('main_music.mp3');
  // Clear any pending timers
  if (this.endTimeoutHandle) clearTimeout(this.endTimeoutHandle);
  if (this.navigateTimeoutHandle) clearTimeout(this.navigateTimeoutHandle);
  }

  /* ──────────────── responsive handler ───── */
  private handleResize = () => {
    this.isMobile.set(window.innerWidth < 768);
  };

  /* ──────────────── game start ───────────── */
  startGame(): void {
    if (this.gameStarted()) return;
    this.gameStarted.set(true);
    this.showEmailList.set(true);
    this.gameEngineService.start((elapsed) => this.gameLoop(elapsed));
  }

  /* ──────────────── main game loop ──────── */
  private gameLoop(elapsed: number): void {
    /* seed forced first email after 1 s */
    if (elapsed > 1_000 && this.nbMails() < 1) {
      this.insertRandomEmail(elapsed);
    }

    if (this.emailQueueService.canSendEmail(elapsed)) {
      this.insertRandomEmail(elapsed);
    }
  }

  /* ──────────────── helpers ─────────────── */
  private insertRandomEmail(currentTime: number): void {
  const nextEmail = this.emailQueueService.getNextEmail(
      this.lastMailId(),
      {
    minimumReputation: this.statValue('reputation'),
    maximumDataQuality: this.statValue('dataQuality')
      }
    );
    
    if (!nextEmail) {
      this.emailQueueService.markEmailSent(currentTime);
      return;
    }
    
    this.pushEmail(nextEmail, currentTime);
  }

  private pushEmail(mail: Email, currentTime: number): void {
    if (!mail.isUrgent) {
    }
    this.lastMailId.set(mail.name);
    this.nbMails.set(this.nbMails() + 1);
    
    this.inbox.set([...this.inbox(), mail]);
    this.emailQueueService.removeEmail(mail.name);
    this.emailQueueService.markEmailSent(currentTime);
    
    mail.isUrgent ? this.sounds.play('alarm.ogg', false, 0.7) : this.sounds.play('click.ogg', false, 0.7);
    if (navigator.vibrate) navigator.vibrate(mail.isUrgent ? [200, 100, 200] : 200);
  }

  /* ──────────────── defeat / cleanup ───────── */
  private endGame(reason: DefeatReason): void {
    if (this.isEditable()) return;
    this.onGameDefeat({ reason, stats: this.snapshotStats() });
    this.cleanupAll();
  }

  private cleanupAll(): void {
    this.gameEngineService.stop();
    this.gameStarted.set(false);
  }

  private snapshotStats(): Stats {
    return this.gameStatsService.snapshot();
  }

  public onGameVictory(data: Stats) { 
    this.gameStateService.stats = data;
    this.router.navigate(['../victory'], { relativeTo: this.activatedRoute, queryParamsHandling: 'preserve' });
  }

  public onGameDefeat(data: DefeatStats) {
    if (this.isEditable()) return;
    this.gameStateService.stats = data.stats;
    this.gameStateService.defeatReason = data.reason;
    this.router.navigate(['../defeat'], { relativeTo: this.activatedRoute, queryParamsHandling: 'preserve' });
  }

  /* ──────────────── mailbox ui actions ──── */
  selectEmail(mail: Email): void {
    this.outcomeMessage.set(null);
    this.outcomeEffects.set(null);
    this.selectedEmail.set(mail);
    this.showEmailList.set(true);
  }

  back(): void {
    this.showEmailList.set(true);
    if (this.isMobile()) this.selectedEmail.set(null);
  }

  choose(choice: Choice): void {
    const mail = this.selectedEmail();
    if (!mail) return;

  // Update last email time immediately to prevent instantaneous next email
  // (use the game engine's elapsed time as the clock reference)
  const now = this.gameEngineService.elapsedTime();
  this.emailQueueService.markEmailSent(now);
    
    // Add next emails to queue (unless this mail ends the game)
    if (!mail.end) {
      let nextEmailsNames = choice.outcome.next;
      const nextEmails = this.content().nodes.filter(e => nextEmailsNames?.includes(e.name));
      this.emailQueueService.addEmails(nextEmails);
    }


    // Apply outcome to stats
    this.gameStatsService.applyOutcome(choice.outcome);

    // Set outcome display (generic indicators)
    this.outcomeMessage.set(choice.outcome.description);
    this.choiceId.set({ mail: mail.name, choice: choice.name });
    const effects: Stats = {};
    const defs = this.content().indicators || [];
    defs.forEach(indicator => {
      const delta = (choice.outcome.impact as any)[indicator.nameId];
      if (typeof delta === 'number' && delta !== 0) effects[indicator.nameId] = delta;
    });
    this.outcomeEffects.set(effects);

    /* remove mail */
    if (!this.isEditable()) {
      this.inbox.set(this.inbox().filter(e => e.name !== mail.name));
    }
    this.answeredEmails.set([...this.answeredEmails(), mail.name]);
    //  this.showEmailList.set(true);

    // If this email marks the end of the game, start the end sequence
    if (mail.end) {
      this.triggerEndSequence();
    }

    // If not an explicit end email, check if there are no more emails
    if (!mail.end && !this.isEditable()) {
      const hasInboxEmails = this.inbox().length > 0;
      const maybeNext = this.emailQueueService.getNextEmail(
        this.lastMailId(),
        {
          minimumReputation: this.statValue('reputation'),
          maximumDataQuality: this.statValue('dataQuality')
        }
      );
      const noNextAvailable = !maybeNext;
      if (!hasInboxEmails && noNextAvailable) {
        this.triggerEndSequence();
      }
    }
  }

  /* ──────────────── utility ─────────────── */
  formatCurrency = formatCurrency;
  impactColor = getImpactColor;

  // Generic stat accessor for templates/logic
  statValue(key: string): number { return this.gameStatsService.value(key); }

  /* tailwind‑driven conditional classes for panels */
  inboxPanelClasses(): string {
    return this.isMobile()
      ? this.showEmailList()
        ? 'flex w-full'
        : 'hidden'
      : 'flex w-[35Opx] min-w-[350px]';
  }

  mainPanelClasses(): string {
    return this.isMobile()
      ? this.showEmailList()
        ? 'hidden'
        : 'flex w-full'
      : 'flex flex-1';
  }

  /* ──────────────── email field helpers ───── */
  getEmailField(field: 'title' | 'sender' | 'content'): string {
    const email = this.selectedEmail();
    if (!email) return '';
    const emailData = this.content().nodes.find(e => e.name === email.name);
    const raw = emailData?.[field] || '';
    // Replace placeholders in content for players (keep raw when editing)
    if (field === 'content' && !this.isEditable()) {
      return this.replacePlaceholders(raw);
    }
    return raw;
  }

  changeEmailField(field: 'title' | 'sender' | 'content', newText: string): void {
    const email = this.selectedEmail();
    if (!email) return;
    this.changeAndSetEmail(newText, 'replace', `/email/${email.name}/${field}`);
  }

  handleChoiceTextChange(event: { choice: string; text: string }): void {
    const email = this.selectedEmail();
    if (!email) return;
    this.changeAndSetEmail(
      event.text,
      'replace',
      `/email/${email.name}/choices/${event.choice}/text`
    );
  }

  handleOutcomeDescriptionChange(newText: string): void {
    const email = this.selectedEmail();
    const choiceInfo = this.choiceId();
    if (!email || !choiceInfo) return;
    this.changeAndSetEmail(
      newText,
      'replace',
      `/email/${email.name}/choices/${choiceInfo.choice}/outcome/description`
    );
  }

  changeAndSetEmail(newText: string, op: 'replace' | 'add' | 'remove', path: string): void {
    // Apply external/global change logic (likely updates the authoritative content signal)
    //this.change(newText, op, path);
    const emailName = changeAndSetEmail(
      this.selectedEmail,
      this.gameStateService.content,
      newText,
      op,
      path)

    if (!emailName) return;
    // Update email queue if email is in available pool
    this.emailQueueService.updateEmail(emailName, {
      ...this.emailQueueService.getAllAvailable().find(e => e.name === emailName)!
    });
  }

  private replacePlaceholders(text: string): string {
    const first = 'player';
    if (!first) return text;
    return text.replace(/\{name\}/g, first);
  }

  /**
   * Start a 5s end timeout; once elapsed, fade out, then navigate to '/last'.
   * Idempotent: calling multiple times will have no additional effect.
   */
  private triggerEndSequence(): void {
    if (this.isEditable() || this.isEnding()) return;
    this.isEnding.set(true);
    // Stop the engine so no more emails arrive
    this.gameEngineService.stop();
    // Save best score before navigating
    const scenarioId = this.currentScenarioId();
    const profit = this.statValue('profit');
    if (scenarioId) {
      this.leaderboardService.saveMyBestScore(scenarioId, profit).catch(err => console.warn('Save score failed', err));
    }
    // After 5 seconds, fade out then navigate
    this.endTimeoutHandle = setTimeout(() => {
      this.fadeOut.set(true);
      // Allow CSS transition (700ms as per template) to play before navigation
      this.navigateTimeoutHandle = setTimeout(() => {
        if (scenarioId) {
          this.router.navigate(['/leaderboard', scenarioId]);
        } else {
          this.router.navigate(['/']);
        }
      }, 750);
    }, 5000);
  }
}
