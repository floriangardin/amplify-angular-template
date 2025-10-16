import { Email } from "../email";

export interface EmailDict {
  [key: string]: Email;
}
export interface Indicator {
  name: string;
  emoji: string;
  initial: number;
  min: number;
  max: number;
  type: 'percentage' | 'dollars' | 'points';
  displayed: boolean;
  color?: string; // Optional color property
}
export interface EndResource {
  name: string;
  text: string;
  href: string;
  source?: string;
  target?: string;
  rel?: string;

}
export interface BestCDOGameContent {
  intro_text: string;
  initial_budget: number;
  terms_links: Record<string, EndResource>;
  end_resources: Record<string, EndResource>;
  email: EmailDict;
  indicators: Record<string, Indicator>;
  state_machine: Record<string, string[]>;
  [key: string]: any; // Allow for additional properties
}

