

export interface User {
  id: string;
  company: string | null;
  sub: string;
  admin: boolean;
  claims: { [key: string]: any };
  groups: string[];
}