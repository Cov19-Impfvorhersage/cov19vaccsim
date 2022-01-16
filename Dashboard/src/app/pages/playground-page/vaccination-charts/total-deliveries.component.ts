import { Component } from '@angular/core';
import { DataloaderService } from '../../../services/dataloader.service';
import { UiDataService } from '../../../services/ui-data.service';

@Component({
    selector: 'app-total-deliveries',
    template: `
        <div class="top-bar">
            <mat-button-toggle-group class="slim" *ngIf="ui.featureFlagYAxisScale" [value]="ui.chartConfig.displayYAxisScale" (change)="ui.chartConfig.setScaleMode($event.value)">
                <mat-button-toggle value="num"><span class="onlyWide">Anzahl</span><span class="onlySmall">#</span> Impfdosen</mat-button-toggle>
                <mat-button-toggle value="percent"><span class="onlyWide">Prozent</span><span class="onlySmall">%</span> der Bevölkerung</mat-button-toggle>
            </mat-button-toggle-group>
        </div>
        <app-prediction-line-chart
            class="main-chart"
            style="width: 100%"
            [data]="ui.dataTransform.chartCumulativeDeliveries"
            [config]="ui.chartConfig.chartCumulativeDeliveriesConfig"
        ></app-prediction-line-chart>
    `,
    styleUrls: ['./vaccination-charts.styles.scss']
})
export class TotalDeliveriesComponent {

    constructor(public dataloader: DataloaderService, public ui: UiDataService) {
    }

}
