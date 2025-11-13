import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { SettingsComponent } from './pages/settings.component';
import { gamesRoutes } from './pages/games/games.routes';
import { LeaderboardPageComponent } from './pages/leaderboard/leaderboard.component';
import { PlansComponent } from './pages/plans.component';
export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'plans', component: PlansComponent },
    { path: 'games', children: gamesRoutes },
    { path: 'leaderboard/:scenarioNameId', component: LeaderboardPageComponent }
];