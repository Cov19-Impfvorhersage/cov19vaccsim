import { Component } from '@angular/core';
import { DataloaderService } from '../../../services/dataloader.service';
import { UiDataService } from '../../../services/ui-data.service';

@Component({
    selector: 'app-average-vaccination',
    template: `
        <div class="top-bar">
            <mat-button-toggle-group class="slim" *ngIf="ui.featureFlagYAxisScale" [value]="ui.chartConfig.displayYAxisScale" (change)="ui.chartConfig.setScaleMode($event.value)">
                <mat-button-toggle value="num"><span class="onlyWide">Anzahl Impfdosen</span><span class="onlySmall"># Dosen</span></mat-button-toggle>
                <mat-button-toggle value="percent"><span class="onlyWide">Prozent der Bevölkerung</span><span class="onlySmall">% Bev.</span></mat-button-toggle>
            </mat-button-toggle-group>
            &nbsp;<span class="onlySmall">pro &nbsp;</span>
            <mat-button-toggle-group class="slim" *ngIf="ui.featureFlagYAxisScale" [value]="ui.chartConfig.displayYAxisScaleTimeframe" (change)="ui.chartConfig.setScaleTimeframe($event.value)">
                <mat-button-toggle value="week"><span class="onlyWide">pro Woche</span><span class="onlySmall">Woche</span></mat-button-toggle>
                <mat-button-toggle value="day"><span class="onlyWide">pro Tag</span><span class="onlySmall">Tag</span></mat-button-toggle>
            </mat-button-toggle-group>
        </div>
        <app-prediction-line-chart
            class="main-chart"
            style="width: 100%"
            [data]="ui.dataTransform.chart7DayVaccinations"
            [config]="ui.chartConfig.chart7DayVaccinationsConfig"
        ></app-prediction-line-chart>
    `,
    styleUrls: ['./vaccination-charts.styles.scss']
})
export class AverageVaccinationComponent {

    constructor(public dataloader: DataloaderService, public ui: UiDataService) {
    }

}
