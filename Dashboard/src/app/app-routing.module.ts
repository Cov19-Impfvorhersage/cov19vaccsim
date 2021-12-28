import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MethodsComponent } from './pages/methods/methods.component';
import { PlaygroundPageComponent } from './pages/playground-page/playground-page.component';
import { StartComponent } from './pages/start/start.component';

const routes: Routes = [
    {
        path: '',
        component: PlaygroundPageComponent
    },
    {
        path: 'zi-sim',
        component: StartComponent
    },
    {
        path: 'Methoden',
        component: MethodsComponent,
    },
    {
        path: 'playground',
        component: PlaygroundPageComponent,
    },
    {
        path: '**',
        component: StartComponent
    }

];

@NgModule({
    imports: [RouterModule.forRoot(routes, {relativeLinkResolution: 'legacy'})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
