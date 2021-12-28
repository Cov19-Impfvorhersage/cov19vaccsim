import { Injectable } from '@angular/core';
import { ChartConfigCollection } from '../pages/playground-page/helpers/chart-config-collection';
import { ColorPalettes } from '../pages/playground-page/helpers/color-palettes';
import { UiDataTransformation } from '../pages/playground-page/helpers/ui-data-transformation';
import { ISimulationResults } from '../simulation/data-interfaces/simulation-data.interfaces';
import { BasicSimulation } from '../simulation/simulation';
import { DataloaderService } from './dataloader.service';

/**
 * Singleton service to share data between components.
 */
@Injectable({
    providedIn: 'root'
})
export class UiDataService {

    colors: ColorPalettes;
    dataTransform: UiDataTransformation;
    simulation: BasicSimulation;
    simulationResults: ISimulationResults | null = null;
    chartConfig: ChartConfigCollection;
    displayPartitioning: string;

    constructor(public dataloader: DataloaderService) {
        this.colors = new ColorPalettes();
        this.dataTransform = new UiDataTransformation();
        this.simulation = new BasicSimulation(dataloader);
        this.chartConfig = new ChartConfigCollection(dataloader);
        this.displayPartitioning = Object.keys(this.simulation.partitionings)[0];
    }

}
