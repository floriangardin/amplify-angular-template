import { Routes } from '@angular/router';
import { UIKit } from './pages/uikit.component';
import { HomeComponent } from './pages/home.component';
import { SettingsComponent } from './pages/settings.component';

export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'settings', component: SettingsComponent},
    {path: 'ui-kit', component: UIKit}
];