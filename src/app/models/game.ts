

export interface Style{
  primary_color: string;
  secondary_color: string;
  primary_font_color: string;
  secondary_font_color: string;
  font?: string;
}

export interface Game {
  // Define the structure of the game response here
  id: string;
  name: string;
  company: string;
  version: number;
  type: string;
  state_machine: {
    [key: string]: string[];
  };
  style: Style;
}