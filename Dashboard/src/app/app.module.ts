import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MaterialModule} from '../material/material.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { D3ChartsModule } from './components/d3-charts/d3-charts.module';
import { StartComponent } from './pages/start/start.component';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule, PlotlyService} from 'angular-plotly.js';
import * as SVLocale from 'plotly.js/lib/locales/de.js';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MapComponent } from './components/leafletmap/map/map.component';
import { PlotComponent } from './components/plotly/plot/plot.component';
import { TableComponent } from './components/table/table/table.component';
import { BoxComponent } from './components/infobox/box/box.component';
import { registerLocaleData } from '@angular/common';
import locales from '@angular/common/locales/de';
import { LOCALE_ID } from '@angular/core';
import { LoginComponent } from './pages/login/login.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { InterceptorService } from './services/interceptor-service.service';
import { PrivateComponent } from './pages/private/private.component';
import { MethodsComponent } from './pages/methods/methods.component';
import { PlaygroundPageComponent } from './pages/playground-page/playground-page.component';
import { PopulationVaccinationComponent } from './pages/playground-page/vaccination-charts/population-vaccination.component';
import { WeeklyVaccinationComponent } from './pages/playground-page/vaccination-charts/weekly-vaccination.component';
import { AverageVaccinationComponent } from './pages/playground-page/vaccination-charts/average-vaccination.component';
import { WeeklyDeliveriesComponent } from './pages/playground-page/vaccination-charts/weekly-deliveries.component';
import { TotalDeliveriesComponent } from './pages/playground-page/vaccination-charts/total-deliveries.component';
import { InfoComponent } from './pages/playground-page/info/info.component';

PlotlyModule.plotlyjs = PlotlyJS;

registerLocaleData(locales, 'de');

@NgModule({
  declarations: [
    AppComponent,
    StartComponent,
    MapComponent,
    PlotComponent,
    TableComponent,
    BoxComponent,
    LoginComponent,
    ProfileComponent,
    PrivateComponent,
    MethodsComponent,
    PlaygroundPageComponent,
    PopulationVaccinationComponent,
    WeeklyVaccinationComponent,
    AverageVaccinationComponent,
    WeeklyDeliveriesComponent,
    TotalDeliveriesComponent,
    InfoComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MaterialModule,
    HttpClientModule,
    BrowserAnimationsModule,
    PlotlyModule,
    FlexLayoutModule  ,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    D3ChartsModule


  ],
  providers: [{provide: LOCALE_ID, useValue: 'de-DE' }, PlotlyService,

  // This needs to be uncommented to provide  auth
  { provide: HTTP_INTERCEPTORS,
  useClass: InterceptorService,
  multi: true }
],
  bootstrap: [AppComponent]
})

export class AppModule {
  constructor(private plotlyService: PlotlyService) {
    this.plotlyService.getPlotly().register(SVLocale);
  }
}
