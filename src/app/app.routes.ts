import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { KitchenComponent } from './components/kitchen/kitchen.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'kitchen', component: KitchenComponent },
  { path: '**', redirectTo: 'home' },
];
