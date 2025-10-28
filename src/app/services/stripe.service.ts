import { Injectable, inject } from '@angular/core';
import { ClientService } from './client.service';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private client = inject(ClientService).client;

  async startCheckout(): Promise<void> {
    const res = await this.client.queries.createCheckoutSession({});
    const url = res.data as string;
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Failed to get Stripe Checkout URL');
    }
  }

  async cancelSubscription(): Promise<'ok' | 'already_cancelling'> {
    const res = await this.client.mutations.cancelSubscription({});
    const status = (res.data as string) || '';
    if (!status) throw new Error('Cancel subscription failed');
    return status === 'already_cancelling' ? 'already_cancelling' : 'ok';
  }

  async reinstateSubscription(): Promise<'ok' | 'already_active'> {
    const res = await this.client.mutations.reinstateSubscription({});
    const status = (res.data as string) || '';
    if (!status) throw new Error('Reinstate subscription failed');
    return status === 'already_active' ? 'already_active' : 'ok';
  }

  async verifySubscription(sessionId: string): Promise<'ok'> {
    const res = await this.client.mutations.verifySubscription({ sessionId });
    const status = (res.data as string) || '';
    if (status !== 'ok') throw new Error('Verify subscription failed');
    return 'ok';
  }

  async listInvoices(): Promise<Array<{ id: string; number: string; hostedInvoiceUrl: string; invoicePdf: string; currency: string; total: number; created: string; status: string }>> {
    const res = await this.client.queries.listInvoices({});
    return (res.data as any[]) || [];
  }
}