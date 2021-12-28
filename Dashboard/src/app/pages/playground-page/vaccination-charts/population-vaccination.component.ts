import { Component } from '@angular/core';

import { DataloaderService } from '../../../services/dataloader.service';
import { UiDataService } from '../../../services/ui-data.service';

@Component({
    selector: 'app-population-vaccination',
    template: `
        <div class="top-bar">
            <mat-button-toggle-group class="slim" *ngIf="featureFlagYAxisScale" [value]="ui.chartConfig.displayYAxisScale"
                                     (change)="ui.chartConfig.setScaleMode($event.value)">
                <mat-button-toggle value="num"><span class="onlyWide">Personen</span><span class="onlySmall"># P.</span></mat-button-toggle>
                <mat-button-toggle value="percent"><span class="onlyWide">Prozent</span><span class="onlySmall">% Bev.</span>
                </mat-button-toggle>
            </mat-button-toggle-group>

            <mat-form-field color="accent" appearance="outline" class="slim"
                            style="position: absolute; right: 0; width: 25em; max-width: 60%;"
                            matTooltip="Aufteilung der Bevölkerung im rechten Balken der Grafik.
                                                Hat keinen Einfluss auf die Simulation, die nur von der Impfbereitschaft abhängt,
                                                daher entspricht die Reihenfolge der Blöcke auch nicht automatisch der logischen Impfreihenfolge
                                                (Insb. beim Alter, da ja nicht strikt nach Alter geimpft wird).">
                <mat-icon class="tooltip-info">help</mat-icon>
                <mat-label>Aufteilung im rechten Balken</mat-label>
                <mat-select [(ngModel)]="ui.displayPartitioning" (selectionChange)="changePartitioning()">
                    <ng-container *ngFor="let p of ui.simulation.partitionings | keyvalue: originalOrder">
                        <mat-option [value]="p.key">{{p.value.title}}</mat-option>
                    </ng-container>
                </mat-select>
            </mat-form-field>
        </div>
        <app-prediction-line-chart
            class="main-chart"
            style="width: 100%"
            [data]="ui.dataTransform.chartPopulation"
            [config]="ui.chartConfig.chartPopulationConfig"
        ></app-prediction-line-chart>
    `,
    styleUrls: ['./vaccination-charts.styles.scss']
})
export class PopulationVaccinationComponent {

    featureFlagYAxisScale = true;

    constructor(public dataloader: DataloaderService, public ui: UiDataService) {
    }

    changePartitioning(): void {
        this.ui.dataTransform.chartPopulation = this.ui.dataTransform.buildChartPopulation(
            this.dataloader,
            this.ui.simulation,
            this.ui.simulationResults,
            this.ui.colors,
            this.ui.displayPartitioning
        );
    }

    // Preserve original property order
    originalOrder = (): number => {
        return 0;
    }
}
