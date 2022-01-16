import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MethodsComponent } from './pages/methods/methods.component';
import { PlaygroundPageComponent } from './pages/playground-page/playground-page.component';
import { AverageVaccinationComponent } from './pages/playground-page/vaccination-charts/average-vaccination.component';
import { PopulationVaccinationComponent } from './pages/playground-page/vaccination-charts/population-vaccination.component';
import { TotalDeliveriesComponent } from './pages/playground-page/vaccination-charts/total-deliveries.component';
import { WeeklyDeliveriesComponent } from './pages/playground-page/vaccination-charts/weekly-deliveries.component';
import { WeeklyVaccinationComponent } from './pages/playground-page/vaccination-charts/weekly-vaccination.component';
import { StartComponent } from './pages/start/start.component';

const routes: Routes = [
    {
        path: '',
        component: PlaygroundPageComponent,
        children: [
            {
                path: 'population-vaccination',
                component: PopulationVaccinationComponent,
            },
            {
                path: 'weekly-vaccination',
                component: WeeklyVaccinationComponent,
            },
            {
                path: 'average-vaccination',
                component: AverageVaccinationComponent,
            },
            {
                path: 'weekly-deliveries',
                component: WeeklyDeliveriesComponent,
            },
            {
                path: 'total-deliveries',
                component: TotalDeliveriesComponent,
            },
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'population-vaccination',
            }
        ]
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
        redirectTo: '',
    },
    {
        path: '**',
        redirectTo: 'population-vaccination',
    }

];

@NgModule({
    imports: [RouterModule.forRoot(routes, {relativeLinkResolution: 'legacy'})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
