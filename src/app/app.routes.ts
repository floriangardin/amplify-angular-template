import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { SettingsComponent } from './pages/settings.component';
import { gamesRoutes } from './pages/games/games.routes';
import { LeaderboardPageComponent } from './pages/leaderboard/leaderboard.component';
export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'settings', component: SettingsComponent},
    {path: 'games', children: gamesRoutes},
    {path: 'leaderboard/:scenarioId', component: LeaderboardPageComponent}
];