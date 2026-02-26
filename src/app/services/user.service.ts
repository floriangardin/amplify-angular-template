import { Injectable, signal } from '@angular/core';
import { PlanName } from '../models/user';

const ADJECTIVES = ['Bold','Clever','Swift','Bright','Calm','Daring','Eager','Fierce','Gentle','Happy','Keen','Lucky','Noble','Quick','Sharp','Brave','Witty','Zesty','Cool','Wise'];
const ANIMALS = ['Falcon','Panda','Tiger','Eagle','Wolf','Dolphin','Fox','Owl','Hawk','Bear','Lion','Raven','Lynx','Orca','Crane','Heron','Koala','Otter','Stag','Viper'];

function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${animal} #${num}`;
}

function generateGuestId(): string {
  return 'guest-' + crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class UserService {
  isAdmin = signal<boolean>(false);
  isPro = signal<boolean>(true);
  email = signal<string>('');
  preferredUsername = signal<string>('');
  planName = signal<PlanName>('pro');
  periodEnd = signal<string | null>(null);
  currentUserId = signal<string>('');

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    let guestId = localStorage.getItem('demo_guest_id');
    let guestName = localStorage.getItem('demo_guest_name');
    if (!guestId) {
      guestId = generateGuestId();
      localStorage.setItem('demo_guest_id', guestId);
    }
    if (!guestName) {
      guestName = generateGuestName();
      localStorage.setItem('demo_guest_name', guestName);
    }
    this.currentUserId.set(guestId);
    this.preferredUsername.set(guestName);
    this.email.set(`${guestName.toLowerCase().replace(/\s+/g, '.')}@demo`);
  }

  async refreshNow(_showWarnings: boolean = true): Promise<void> {}

  setDisplayName(name: string): void {
    localStorage.setItem('demo_guest_name', name);
    this.preferredUsername.set(name);
  }
}
