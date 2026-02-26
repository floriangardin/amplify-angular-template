import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { gamesRoutes } from './pages/games/games.routes';
import { LeaderboardPageComponent } from './pages/leaderboard/leaderboard.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'games', children: gamesRoutes },
    { path: 'leaderboard/:scenarioNameId', component: LeaderboardPageComponent }
];
