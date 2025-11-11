import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Game } from '../models/game';
import { ThemeService } from './theme.service';
import { User } from '../models/user';
import { ClientService } from './client.service';
import { Scenario } from '../models/game-content';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class StateService {

  private themeService = inject(ThemeService);
  private clientService = inject(ClientService);
  private userService = inject(UserService);
  isAdmin = this.userService.isAdmin;
  
  async getScenarios(): Promise<Scenario[]> {
      // Example Angular usage
      const scenarios = await this.clientService.client.models.Scenario.list({
      selectionSet: [
        'id', 'card.*', 'nameId',
        'indicators.*',
      ],
      limit: 1000, // raise as needed (AppSync caps apply)
      });
      return scenarios.data as unknown as Scenario[];
  }

  async getScenarioById(id: string): Promise<Scenario | null> {
    const scenario = await this.clientService.client.models.Scenario.get({ id }, {
      selectionSet: [
        'id', 'card.*', 'nameId',
        'indicators.*', 'nodes.*', 'nodes.hints',
        'library.*',
      ],
    });
    let result = scenario.data as unknown as Scenario | null;
    return result;
  }

}
