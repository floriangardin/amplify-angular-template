import '../../amplify-config';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Injectable, signal } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { PlanName } from '../models/user';


@Injectable({ providedIn: 'root' })
export class UserService {
    public client = generateClient<Schema>();

    isAdmin = signal<boolean>(false);
    isPro = signal<boolean>(false);
    email = signal<string>('Unknown');
    preferredUsername = signal<string>('');
    planName = signal<PlanName>('');
    periodEnd = signal<string | null>(null);

    constructor() {
        this.init();
    }
    async init(): Promise<void> {
        await this.refreshNow(false);
    }

    async refreshNow(showWarnings: boolean = true): Promise<void> {
        try {
            const { tokens } = await fetchAuthSession({ forceRefresh: true });
                        const payload = tokens?.idToken?.payload || {};
                        const accessPayload = tokens?.accessToken?.payload || {};
                        const email = (payload?.['email'] as string | undefined)
                            || (accessPayload?.['username'] as string | undefined)
                            || '';
                        this.email.set(email);
                        console.log('Use payload', payload);
                        const preferred = (payload?.['preferred_username'] as string | undefined)
                            || (payload?.['nickname'] as string | undefined)
                            || (email ? email.split('@')[0] : '');
                        this.preferredUsername.set(preferred);
            let plan = tokens?.idToken?.payload?.['plan'] as PlanName | "free";
            const groups = (tokens?.idToken?.payload?.['cognito:groups'] as string[] | undefined) ?? [];
            this.isAdmin.set(groups.includes('ADMIN'));
            this.isPro.set(plan === 'pro' || plan === 'pro_cancelling');
            this.planName.set(plan);
            const periodEnd = (tokens?.idToken?.payload?.['custom:periodEnd'] as string | undefined) || null;
            this.periodEnd.set(periodEnd);
            console.log('TOKEN', tokens?.idToken?.payload);
            console.log('GROUPS', groups);
        } catch (err) {
            if (showWarnings) console.warn('Could not determine user groups', err);
            this.isAdmin.set(false);
            this.isPro.set(false);
            this.planName.set('free');
        }
    }

}