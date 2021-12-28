import { Component, OnInit } from '@angular/core';
import { DataloaderService } from '../../services/dataloader.service';
import { UiDataService } from '../../services/ui-data.service';
import * as cw from '../../simulation/calendarweek/calendarweek';
import { getYearWeekOfDate, YearWeek } from '../../simulation/calendarweek/calendarweek';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

    loaded = false;

    simulationStartWeekNum = 5;
    simulationStartWeek: YearWeek = cw.yws([2021, this.simulationStartWeekNum]);
    availableAgeLimits = [5, 12, 16];
    simulationStartSlider = {
        min: 1,
        max: 15,
        startOffset: 0.1,
        width: 0.5,
    };

    displayPartitioning: string;
    featureFlagYAxisScale = true;

    constructor(public dataloader: DataloaderService, public ui: UiDataService) {
        this.displayPartitioning = Object.keys(this.ui.simulation.partitionings)[0];
    }


    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.dataloader.loadData().subscribe(() => {
            this.loaded = true;
            this.ui.simulation.prepareData();
            this.prepareSimulationStartSlider();
            this.simulationStartWeek = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1);
            this.simulationStartWeekNum = cw.ywt(this.simulationStartWeek)[1];
            this.ui.simulation.params.fractionWilling = 1 - this.ui.simulation.willingness.getUnwillingFraction();
            this.runSimulation();
        });
    }

    prepareSimulationStartSlider(): void {
        const realDataEndYW = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1);
        const realDataEndYWT = cw.ywt(realDataEndYW);
        const graphFirstDate = this.dataloader.vaccinations[0].date;
        const graphLastDate = cw.getWeekdayInYearWeek(this.ui.simulation.simulationEndWeek, 8);
        const graphWidthTime = graphLastDate.getTime() - graphFirstDate.getTime();
        const sliderStartDate = cw.getWeekdayInYearWeek(cw.yws([realDataEndYWT[0], 1]), 1);
        const sliderEndDate = cw.getWeekdayInYearWeek(realDataEndYW, 7);

        console.log('Graph start / end date', graphFirstDate, graphLastDate);
        console.log('Slider start / end date', sliderStartDate, sliderEndDate);

        // The bar on the right covers some space so the graph only gets some percentage (guess)
        const graphWidthOfFull = 0.93;

        // minimum just hardcoded
        this.simulationStartSlider.min = 1;
        // maximum is the last week of actual data we have
        this.simulationStartSlider.max = realDataEndYWT[1];
        this.simulationStartSlider.startOffset = (sliderStartDate.getTime() - graphFirstDate.getTime()) / graphWidthTime * graphWidthOfFull;
        this.simulationStartSlider.width = (sliderEndDate.getTime() - sliderStartDate.getTime()) / graphWidthTime * graphWidthOfFull;
    }

    runSimulation(): void {
        this.simulationStartWeek = cw.yws([cw.ywt(this.simulationStartWeek)[0], this.simulationStartWeekNum]);
        this.ui.simulation.simulationStartWeek = this.simulationStartWeek;
        this.ui.simulationResults = this.ui.simulation.runSimulation();
        this.ui.dataTransform.rebuildAllCharts(
            this.dataloader,
            this.ui.simulation,
            this.ui.simulationResults,
            this.ui.colors,
            this.displayPartitioning
        );
        this.ui.chartConfig.updateConfigs();
    }

    changePartitioning(): void {
        this.ui.dataTransform.chartPopulation = this.ui.dataTransform.buildChartPopulation(
            this.dataloader,
            this.ui.simulation,
            this.ui.simulationResults,
            this.ui.colors,
            this.displayPartitioning
        );
    }

    // Preserve original property order
    originalOrder = (): number => {
        return 0;
    }

    setWillingnessDate(): void {
        this.resetWillingness();
    }

    resetWillingness(): void {
        this.ui.simulation.params.fractionWilling = 1 - this.ui.simulation.willingness.getUnwillingFraction();
        this.runSimulation();
    }

    reset2ndWillingness(): void {
        this.ui.simulation.params.fractionTakingSecondDose = 0.96;
        this.runSimulation();
    }

    reset3rdWillingness(): void {
        this.ui.simulation.params.fractionTakingThirdDose = 0.86;
        this.runSimulation();
    }

}
