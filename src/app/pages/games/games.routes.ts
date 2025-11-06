// Games routes
import { Routes } from '@angular/router';
import { BaseCDOComponent } from './bestcdo/base.component';
import { BestCDOGameComponent } from './bestcdo/game.component';
import { BestCDOStartComponent } from './bestcdo/start.component';
//import { VictoryCDOComponent } from './bestcdo/victory.component';
//import { DefeatCDOComponent } from './bestcdo/defeat.component';

export const gamesRoutes: Routes = [
    {path: 'bestcdo', component: BaseCDOComponent, children: [
        {path: 'play', component: BestCDOGameComponent},
        {path: 'start', component: BestCDOStartComponent},
  //      {path: 'victory', component: VictoryCDOComponent},
    //    {path: 'defeat', component: DefeatCDOComponent}
    ]}
];