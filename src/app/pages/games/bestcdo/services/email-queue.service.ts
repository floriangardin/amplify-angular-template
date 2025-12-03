import { Injectable, signal, computed } from '@angular/core';
import { Email } from '../../../../models/email';

export interface EmailFilters {
  minClientRelationship: number;
  maxDataQuality: number;
}

@Injectable()
export class EmailQueueService {
  private availableEmails = signal<Email[]>([]);
  private lastEmailTime = signal(0);
  private readonly emailIntervalBase = 20_000;
  private readonly emailIntervalVariance = 6_000;

  readonly availableCount = computed(() => this.availableEmails().length);

  /**
   * Initialize the email pool
   */
  initialize(emails: Email[]): void {
    this.availableEmails.set(emails.filter(e => e.default));
    this.lastEmailTime.set(0);
  }

  /**
   * Add emails to the available pool
   */
  addEmails(emails: Email[]): void {
    this.availableEmails.update(current => [...current, ...emails]);
  }

  /**
   * Remove an email from the available pool
   */
  removeEmail(emailName: string): void {
    this.availableEmails.update(current => 
      current.filter(e => e.name !== emailName)
    );
  }

  /**
   * Check if enough time has passed to send next email
   */
  canSendEmail(currentTime: number): boolean {
    const timeSince = currentTime - this.lastEmailTime();
    const threshold = this.emailIntervalBase - Math.random() * this.emailIntervalVariance;
    if(timeSince > threshold){

    }
    return timeSince > threshold;
  }

  /**
   * Update the last email time
   */
  markEmailSent(time: number): void {
    this.lastEmailTime.set(time);
  }

  /**
   * Get next email based on state machine and filters
   */
  getNextEmail(
    currentState: string,
    filters: EmailFilters
  ): Email | null {
    const filtered = this.filterByStats(filters);
    const pool = filtered;
    
    if (pool.length === 0) {
      return null;
    }

    return this.weightedRandomEmail(pool);
  }

  /**
   * Filter emails by reputation and data quality requirements
   */
  private filterByStats(filters: EmailFilters): Email[] {
    return this.availableEmails().filter(email => {
      // Check minClientRelationship (reputation)
      //console.log('Filtering email:', email.name, 'with minClientRelationship:', email.minClientRelationship, 'and maxDataQuality:', email.maxDataQuality);
      if (email.minClientRelationship !== undefined && filters.minClientRelationship < email.minClientRelationship) {
        return false;
      }

      // Check maxDataQuality
      if (email.maxDataQuality !== undefined && filters.maxDataQuality >= email.maxDataQuality) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get emails based on state machine transitions
   */
  private getStateMachineEmails(
    stateMachine: Record<string, string[]>,
    currentState: string,
    pool: Email[]
  ): Email[] {
    const possibleEmails = stateMachine[currentState];
    
    if (!possibleEmails || possibleEmails.length === 0) {
      return pool;
    }

    const result = pool.filter(e => possibleEmails.includes(e.name));
    return result.length > 0 ? result : pool;
  }

  /**
   * Select a random email using weighted priority
   */
  private weightedRandomEmail(pool: Email[]): Email {
    const totalPriority = pool.reduce((sum, mail) => sum + (mail.priority ?? 1), 0);
    let random = Math.random() * totalPriority;
    
    for (const mail of pool) {
      random -= mail.priority ?? 1;
      if (random <= 0) {
        return mail;
      }
    }
    
    return pool[pool.length - 1]; // fallback
  }

  /**
   * Get all available emails (for debugging/editing)
   */
  getAllAvailable(): Email[] {
    return this.availableEmails();
  }

  /**
   * Update a specific email in the available pool
   */
  updateEmail(emailName: string, updatedEmail: Email): void {
    this.availableEmails.update(emails =>
      emails.map(e => e.name === emailName ? updatedEmail : e)
    );
  }
}
