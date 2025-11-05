import { Email } from "./email";

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

export interface Image {
  assetId: string;
}
export interface Scenario {
  id: string;
  introText: string;
  termsLinks: EndResource[];
  endResources: EndResource[];
  nodes: Email[];
  indicators: Indicator[];
  cdoRole: string;
  description?: string;
  plan: string;
  role: string;
  gameTitle: string;
  headerGameText: string;
  logo: Image;
  logoId: string;
  logoCompany: Image;
  scenarioTitle: string;
  startTutorial: string;
  title: string;
  name: string;
  [key: string]: any; // Allow for additional properties
}

