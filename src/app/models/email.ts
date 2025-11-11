import type { LibraryItem } from './game-content';

export interface Email {
  name: string;
  end: boolean;
  sender: string;
  title: string;
  content: string;
  category: string;
  isUrgent: boolean;
  choices: Choice[];
  default: boolean;
  priority?: number;
  // Hint references by library nameId resolved client-side to LibraryItem objects
  hints?: string[] | LibraryItem[];
}

export interface Impact {
  [name: string]: number;
}

export interface Outcome {
    description: string;
    impact: Impact;
    next?: string[]; // Force next email to send
}
export interface Choice {
  name: string;
  text: string;
  bonus?: string;
  bonusUrl?: string;
  bonusReadText?: string;
  outcome: Outcome;
} 