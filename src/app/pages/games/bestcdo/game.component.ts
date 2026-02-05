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
import { LibraryItem } from '../../../models/game-content';
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
import { LearningResourcesComponent } from '../../../components/learning-resources.component';
import { LeaderboardService } from '../../../services/leaderboard.service';
import { ContentDialogComponent } from '../../../ui/elements/content-dialog.component';
import { StorageService } from '../../../services/storage.service';
import { ProgressService } from '../../../services/progress.service';
import { ScoringService } from '../../../services/scoring.service';
import { EndResult } from '../../../models/stats';

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
  imports: [CommonModule, GameStatsHeaderComponent, ContentDialogComponent, EmailInboxComponent, EmailViewerComponent, HeaderComponent, LearningResourcesComponent],
  providers: [GameStatsService, EmailQueueService, GameEngineService],
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `],
  template: `
    @if (showDialog()) {
      <app-content-dialog
        [title]="dialogTitle()"
        [url]="dialogUrl()"
        (closed)="closeDialog()"
      />
    }
    @if (!content()) {
      <app-header class="md:fixed top-0 static left-0 w-screen z-[2000]"></app-header>
      <div class="min-h-screen flex items-center justify-center text-white">Loading game…</div>
    } @else {
    <!-- Parent fills the viewport; horizontal padding responsive -->
    <div class="min-h-screen flex items-center justify-center md:px-8 lg:px-16 md:pt-14">
      <div class="w-full h-[100vh] md:h-[90svh] bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-opacity duration-700" [class.opacity-0]="fadeOut()">
        <!-- Top notice -->
        <app-header class="md:fixed top-0 left-0 static w-screen z-[2000]"></app-header>
        <!-- Header bar with stats -->
        <app-game-stats-header
          [isMusicMuted]="sounds.isMusicMuted()"
          [timeLeftSeconds]="timeLeftSeconds()"
          [lastEmail]="lastReceivedEmail()"
          (soundToggled)="sounds.toggleMute()"
        />

        <!-- Main split area -->
        <div class="flex-1 min-h-0 flex overflow-hidden">
          <!-- Inbox column -->
          @if (showInbox()) {
            <app-email-inbox
              [emails]="inbox()"
              [library]="content().library"
              [selectedEmailName]="selectedEmail()?.name || null"
              [companyLogo]="content()['logo_company']?.['assetId'] || null"
              [isEditable]="isEditable()"
              [urgentTimers]="urgentCountdowns()"
              (emailSelected)="selectEmail($event)"
              [currentScore]="liveWeightedScore()"
              [scoreProfit]="statValue('profit')"
              [scoreDataQuality]="statValue('dataQuality')"
              [scoreClientRelationship]="statValue('clientRelationship')"
              (libraryItemSelected)="libraryItemSelected($event)"
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
            [urgentSecondsLeft]="selectedEmailUrgentSeconds()"
            (backClicked)="back()"
            (choiceSelected)="choose($event)"
            (startGameClicked)="startGame()"
            (hintSelected)="libraryItemSelected($event)"
            [ngClass]="mainPanelClasses()"
          />
        </div>
      </div>
    </div>
      }

    <!-- End-game results overlay -->
    @if (showEndOverlay()) {
      <div class="fixed inset-0 z-[3000] bg-black/70 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 md:p-8 text-gray-900 space-y-5">
          <h2 class="text-2xl font-bold text-center" [ngClass]="pendingEndResult()!.hasWon ? 'text-green-600' : 'text-red-600'">
            {{ pendingEndResult()!.hasWon ? 'Game Complete!' : 'Game Over' }}
          </h2>

          <p class="text-sm text-gray-600 text-center">{{ endOverlayMessage() }}</p>

          <!-- Score breakdown -->
          <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div class="flex justify-between"><span>💰 Profit:</span><span class="font-bold">{{ formatCurrency(pendingEndResult()!.stats['profit'] || 0) }}</span></div>
            <div class="flex justify-between"><span>📊 Data Quality:</span><span class="font-bold">{{ pendingEndResult()!.stats['dataQuality'] || 0 }}%</span></div>
            <div class="flex justify-between"><span>⭐ Client Relationship:</span><span class="font-bold">{{ pendingEndResult()!.stats['clientRelationship'] || 0 }}%</span></div>
            <div class="border-t border-gray-300 pt-2 flex justify-between font-semibold">
              <span>Final Score:</span>
              <span class="text-primary-600">{{ formatScore(pendingEndResult()!.stats['weightedScore'] || 0) }}</span>
            </div>
          </div>

          <!-- Learning Resources -->
          <app-learning-resources variant="light" class="mt-4" />

          <!-- Badges -->
          @if (endOverlayBadges().length > 0) {
            <div class="flex flex-wrap justify-center gap-2">
              @for (badge of endOverlayBadges(); track badge) {
                <span class="inline-flex items-center rounded-full bg-yellow-100 border border-yellow-300 px-3 py-1 text-xs font-semibold text-yellow-800">
                  {{ badge }}
                </span>
              }
            </div>
          }

          <button class="w-full py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold transition" (click)="acknowledgeEnd()">
            Go to leaderboard
          </button>
        </div>
      </div>
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
  storageService = inject(StorageService);
  progressService = inject(ProgressService);
  scoringService = inject(ScoringService);


  /* ──────────────── constants ───────────── */
  private readonly initialScore: number = 1_000_000;
  private readonly timeLimitMs: number = 4 * 60 * 1000; // 4 minutes
  private readonly urgentTimeLimitMs: number = 25_000; // 25 seconds to answer urgent emails

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
  lastReceivedEmail = signal<Email | null>(null);
  showEmailList = signal<boolean>(false);
  timeLeftMs = signal<number>(this.timeLimitMs);
  private urgentDeadlines = signal<Record<string, number>>({});
  // End flow
  isEnding = signal(false);
  fadeOut = signal(false);
  showEndOverlay = signal(false);
  pendingEndResult = signal<EndResult | null>(null);
  private endTimeoutHandle: any = null;
  private navigateTimeoutHandle: any = null;

  /* ──────────────── computed values ───────── */
  showInbox = computed(() => !this.isMobile() || this.showEmailList());
  timeLeftSeconds = computed(() => Math.floor(this.timeLeftMs() / 1000));
  
  /** Live weighted score (same formula used for leaderboard, without finish bonus) */
  liveWeightedScore = computed(() => {
    return this.scoringService.calculateWeightedScore({
      profit: this.statValue('profit'),
      dataQuality: this.statValue('dataQuality'),
      clientRelationship: this.statValue('clientRelationship'),
    });
  });

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

  urgentCountdowns = computed<Partial<Record<string, number>>>(() => {
    const deadlines = this.urgentDeadlines();
    const elapsed = this.gameEngineService.elapsedTime();
    const countdowns: Record<string, number> = {};
    Object.entries(deadlines).forEach(([name, deadline]) => {
      const remainingMs = deadline - elapsed;
      countdowns[name] = remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
    });
    return countdowns;
  });

  selectedEmailUrgentSeconds = computed<number | null>(() => {
    const email = this.selectedEmail();
    if (!email || !email.isUrgent) return null;
    const timers = this.urgentCountdowns();
    return timers[email.name] ?? null;
  });

  /* ──────────────── helper methods ─────────────── */
  /** Format score with Pts & K Pts suffix */
  formatScore(score: number): string {
    return this.scoringService.formatScore(score);
  }

  /** Get the medal achieved for a given score */
  getMedalForScore(score: number): 'gold' | 'silver' | 'bronze' | null {
    const medals = this.content()?.medals || [];
    const sorted = [...medals].sort((a, b) => b.threshold - a.threshold);
    for (const m of sorted) {
      if (score >= m.threshold) {
        return m.name;
      }
    }
    return null;
  }

  /* ──────────────── effects ───────────── */
  mobileEffect = effect(() => {
    /* auto‑hide list on mobile when selecting mail */
    if (this.isMobile() && this.selectedEmail()) this.showEmailList.set(false);
  });

  urgentExpiryEffect = effect(() => {
    const deadlines = this.urgentDeadlines();
    const elapsed = this.gameEngineService.elapsedTime();
    Object.entries(deadlines).forEach(([name, deadline]) => {
      if (deadline - elapsed <= 0) {
        this.handleUrgentTimeout(name);
      }
    });
  });

  // Initialize game once the scenario content is available (handles async fetch)
  private currentScenarioNameId = signal<string | null>(null);
  contentInitEffect = effect(() => {
    const content = this.content();
    const id = (content as any)?.nameId ?? null;
    if (!id) return; // scenario not ready yet

    // If we already initialized for this scenario id, skip
    if (this.currentScenarioNameId() === id) return;
    this.currentScenarioNameId.set(id);

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
    this.lastReceivedEmail.set(null);
    this.showEmailList.set(false);
    this.isEnding.set(false);
    this.fadeOut.set(false);
  this.timeLeftMs.set(this.timeLimitMs);
    this.urgentDeadlines.set({});

    // Initialize services now that emails are available
    const emails = this.emails();
    console.log('Emails', emails);
    const defaultEmails = emails.filter(e => e.default);
    this.gameStatsService.initialize(this.initialScore);
    this.emailQueueService.initialize(defaultEmails);

    // In editable mode, auto-start and expose all emails
    if (this.isEditable()) {
      this.startGame();
      this.inbox.set(this.emailQueueService.getAllAvailable());
      this.emailQueueService.initialize([]);
    }
  });

  public async libraryItemSelected(item: LibraryItem): Promise<void> {
    // Handle the selected library item here
    let url: URL = await this.storageService.getLibraryItemUrl(item.nameId);
    this.dialogTitle.set(item.title);
    this.dialogUrl.set(url);
    this.showDialog.set(true);
  }

  /* ──────────────── lifecycle ───────────── */
  override ngOnInit(): void {
    /* responsive */
    window.addEventListener('resize', this.handleResize);
    
    /* background music fire‑and‑forget */
    this.sounds.playMusic('main_music.mp3', true, 0.5);

    // Set difficulty to hard by default
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
    // Update countdown
    const remaining = Math.max(0, this.timeLimitMs - elapsed);
    if (remaining !== this.timeLeftMs()) this.timeLeftMs.set(remaining);
    if (remaining === 0) {
      // Time is up: end game with transition
      let endResult: EndResult = {
        hasWon: true,
        defeatReason: null,
        stats: this.snapshotStats()
      };
      this.triggerEndSequence(endResult);
      return;
    }
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
    minClientRelationship: this.statValue('clientRelationship'),
    maxDataQuality: this.statValue('dataQuality')
      }
    );
    
    if (!nextEmail) {
      this.emailQueueService.markEmailSent(currentTime);
      return;
    }
    
    this.pushEmail(nextEmail, currentTime);
  }

  private pushEmail(mail: Email, currentTime: number): void {
    if (mail.isUrgent && !this.isEditable()) {
      this.addUrgentDeadline(mail.name, currentTime);
    }
    this.lastMailId.set(mail.name);
    this.lastReceivedEmail.set(mail);
    this.nbMails.set(this.nbMails() + 1);

    this.inbox.set([...this.inbox(), mail]);
    this.emailQueueService.removeEmail(mail.name);
    this.emailQueueService.markEmailSent(currentTime);
    
    mail.isUrgent ? this.sounds.play('alarm.ogg', false, 0.7) : this.sounds.play('click.ogg', false, 0.7);
    if (navigator.vibrate) navigator.vibrate(mail.isUrgent ? [200, 100, 200] : 200);
  }

  /* ──────────────── urgent helpers ────────────── */
  private addUrgentDeadline(emailName: string, currentTime: number): void {
    this.urgentDeadlines.update((deadlines) => ({
      ...deadlines,
      [emailName]: currentTime + this.urgentTimeLimitMs,
    }));
  }

  private clearUrgentDeadline(emailName: string): void {
    const deadlines = this.urgentDeadlines();
    if (!(emailName in deadlines)) return;
    const { [emailName]: _removed, ...rest } = deadlines;
    this.urgentDeadlines.set(rest);
  }

  private handleUrgentTimeout(emailName: string): void {
    if (!(emailName in this.urgentDeadlines())) return;
    this.clearUrgentDeadline(emailName);

    const currentInbox = this.inbox();
    const updatedInbox = currentInbox.filter((email) => email.name !== emailName);
    if (updatedInbox.length !== currentInbox.length) {
      this.inbox.set(updatedInbox);
    }
    if (this.selectedEmail()?.name === emailName) {
      this.selectedEmail.set(null);
    }

    if (this.isEditable()) return;

    this.sounds.play('alarm.ogg', false, 0.7);
    this.endGame('burnout');
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
    this.urgentDeadlines.set({});
  }

  private snapshotStats(): Stats {
    return this.gameStatsService.snapshot();
  }

  public onGameVictory(data: Stats) { 
    this.gameStateService.stats.set(data);
    this.gameStateService.hasWon.set(true);

    let endResult: EndResult = {
      hasWon: true,
      defeatReason: null,
      stats: data
    }
    this.triggerEndSequence(endResult);
  }

  public onGameDefeat(data: DefeatStats) {
    if (this.isEditable()) return;
    let endResult: EndResult = {
      hasWon: false,
      defeatReason: data.reason,
      stats: data.stats
    }
    this.triggerEndSequence(endResult, 100);
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
    // Update last email context for dynamic message bar
    this.lastReceivedEmail.set(mail);

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
    this.clearUrgentDeadline(mail.name);
    this.answeredEmails.set([...this.answeredEmails(), mail.name]);
    //  this.showEmailList.set(true);

    // If this email marks the end of the game, start the end sequence
    if (mail.end) {
      this.triggerEndSequence({
        hasWon: true,
        defeatReason: null,
        stats: this.snapshotStats()
      });
    }

    // If not an explicit end email, check if there are no more emails
    if (!mail.end && !this.isEditable()) {
      const hasInboxEmails = this.inbox().length > 0;
      const maybeNext = this.emailQueueService.getNextEmail(
        this.lastMailId(),
        {
          minClientRelationship: this.statValue('clientRelationship'),
          maxDataQuality: this.statValue('dataQuality'),
          budget: this.statValue('cdoBudget')

        }
      );
      const noNextAvailable = !maybeNext;
      if (!hasInboxEmails && noNextAvailable) {
        this.triggerEndSequence({
          hasWon: true,
          defeatReason: null,
          stats: this.snapshotStats()
        });
      }
    }
  }

  /* ──────────────── end overlay helpers ──── */
  endOverlayMessage = computed(() => {
    const result = this.pendingEndResult();
    if (!result) return '';
    if (result.hasWon) {
      const score = result.stats?.['weightedScore'] || 0;
      const medal = this.getMedalForScore(score);
      switch (medal) {
        case 'gold':
          return 'Congratulations! You avoided disaster and levelled up your data skills!';
        case 'silver':
          return 'Well done! You saved your data and staved off disaster. Take a silver medal. Fancy going for gold?';
        case 'bronze':
          return "Not bad! You survived – just. Here's a bronze medal. A silver medal's within reach…";
        default:
          return "Disaster! It's tougher than it looks to balance data with deliverables.";
      }
    }
    const reason = result.defeatReason;
    const descriptions: Record<string, string> = {
      dataBreach: 'A data breach forced the board to end the program.',
      burnout: 'Critical emails were missed and the team burned out.',
      budget: 'Budget collapsed before you could finish.',
      dataQuality: 'Data quality dropped too low to continue.',
      reputation: 'Stakeholders lost confidence in leadership.'
    };
    return reason ? descriptions[reason] || 'The run ended.' : 'The run ended before objectives were met.';
  });

  endOverlayBadges = computed<string[]>(() => {
    const result = this.pendingEndResult();
    if (!result) return [];
    const stats = result.stats || {};
    const defs = this.content()?.indicators || [];
    const badges: string[] = [];
    for (const def of defs) {
      const value = stats[def.nameId];
      if (typeof value !== 'number') continue;
      if (def.nameId === 'dataQuality' && value >= def.max) {
        badges.push('📊 Data Quality Champion');
      }
      if (def.nameId === 'clientRelationship' && value >= def.max) {
        badges.push('⭐ Client Relationship Master');
      }
    }
    return badges;
  });


  acknowledgeEnd(): void {
    const result = this.pendingEndResult();
    const scenarioNameId = this.currentScenarioNameId();
    this.showEndOverlay.set(false);
    this.fadeOut.set(true);
    this.navigateTimeoutHandle = setTimeout(() => {
      if (scenarioNameId && result) {
        this.router.navigate(['/leaderboard', scenarioNameId], {
          state: { endResult: result }
        });
      } else {
        this.router.navigate(['/']);
      }
    }, 750);
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

  private replacePlaceholders(text: string): string {
    const first = 'player';
    if (!first) return text;
    return text.replace(/\{name\}/g, first);
  }

  /**
   * Start a 5s end timeout; once elapsed, fade out, then navigate to '/last'.
   * Idempotent: calling multiple times will have no additional effect.
   */
  private triggerEndSequence(endResult: EndResult, timeOut: number = 5000): void {
    if (this.isEditable() || this.isEnding()) return;
    this.isEnding.set(true);
    this.urgentDeadlines.set({});
    // Stop the engine so no more emails arrive
    this.gameEngineService.stop();
    // Save best score before navigating (weighted scoring)
    const scenarioNameId = this.currentScenarioNameId();
    const weightedScore = this.scoringService.calculateFinalScore({
      profit: this.statValue('profit'),
      dataQuality: this.statValue('dataQuality'),
      clientRelationship: this.statValue('clientRelationship'),
      hasWon: endResult.hasWon,
    });
    // Store weighted score in endResult for display
    endResult.stats = { ...endResult.stats, weightedScore };
    if (scenarioNameId) {
      this.leaderboardService.saveMyBestScore(scenarioNameId, weightedScore).catch(err => console.warn('Save score failed', err));
      // Also persist per-user scenario progress with changed indicators
      try {
        const content = this.content();
        const defs = content?.indicators || [];
        const snapshot = this.snapshotStats();
        const indicatorScores = defs
          .map(d => ({ indicatorNameId: d.nameId, value: (snapshot[d.nameId] ?? d.initial ?? 0) as number, initial: d.initial }))
          .filter(s => typeof s.value === 'number' && s.value !== (s.initial ?? s.value))
          .map(s => ({ indicatorNameId: s.indicatorNameId, value: s.value }));
        // Also store the weighted score (points) for display on scenario cards
        indicatorScores.push({ indicatorNameId: 'weightedScore', value: weightedScore });
        this.progressService.upsertMyScenarioProgress({
          scenarioNameId,
          indicatorScores,
          status: 'completed',
          completed: true,
        }).catch(err => console.warn('Save progress failed', err));
      } catch (err) {
        console.warn('Progress computation failed', err);
      }
    }
    // Show end overlay with score breakdown; user must click "Acknowledge" to proceed
    this.endTimeoutHandle = setTimeout(() => {
      this.pendingEndResult.set(endResult);
      this.showEndOverlay.set(true);
    }, Math.min(timeOut, 2000));
  }
}
