import { Email } from "./email";

export interface Indicator {
  name: string;
  emoji: string;
  initial: number;
  nameId: string;
  min: number;
  priority?: number;
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

export interface Image {
  assetId: string;
}

export interface ScenarioCardContext {
  program: string;
  domains: string;
  roleFocus: string;
  objective: string;
}

export interface ScenarioCardMetadata {
  category: string;
  estimatedDurationMinutes: number;
  track: string;
}

export interface ScenarioCard {
  plan: 'free' | 'pro';
  title: string;
  shortDescription: string;
  difficulty: string;
  skillsAcquired: string[];
  context: ScenarioCardContext;
  metadata: ScenarioCardMetadata;
}
export interface LibraryItem {
  nameId: string;
  description: string;
  title: string;
  emoji: string;
}

export interface Medal {
  name: 'gold' | 'silver' | 'bronze';
  threshold: number;
}
export interface Scenario {
  id: string;
  library: LibraryItem[]; 
  nodes: Email[];
  indicators: Indicator[];
  card: ScenarioCard;
  medals?: Medal[];
  nameId: string;
  [key: string]: any; // Allow for additional properties
}

