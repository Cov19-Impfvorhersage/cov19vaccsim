import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PlaygroundPageComponent } from './pages/playground-page/playground-page.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { StartComponent } from './pages/start/start.component';
import { AuthGuardService } from './services/auth-guard.service';
import { PrivateComponent } from './pages/private/private.component'
import { MethodsComponent } from "./pages/methods/methods.component";

const routes: Routes = [
  { path: '', component: StartComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'profile', component: ProfileComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'private', component: PrivateComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'Methoden', component: MethodsComponent,
  },
  {
    path: 'playground', component: PlaygroundPageComponent,
  },
  { path: '**', component: StartComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
