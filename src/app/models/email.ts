export interface Email {
  name: string;
  end: boolean;
  sender: string;
  title: string;
  content: string;
  category: string;
  isUrgent: boolean;
  choices: ChoiceDict;
  priority: number;
  default: boolean;
}
export interface ChoiceDict {
  // Keys are choice identifiers (names). They are used as strings in templates.
  [name: string]: Choice;
}

export interface Impact {
  [name: string]: number;
}
export interface Choice {
  name: string;
  text: string;
  bonus?: string;
  bonusUrl?: string;
  bonusReadText?: string;
  outcome: {
    description: string;
    dataQualityImpact: number;
    impact: Impact;
    next?: string[]; // Force next email to send
  };
} 