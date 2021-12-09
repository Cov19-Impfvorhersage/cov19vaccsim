import { Component, OnInit } from '@angular/core';
import { ChartData } from '../../components/d3-charts/prediction-line-chart.component';
import { DataloaderService } from '../../services/dataloader.service';
import * as cw from '../../simulation/calendarweek/calendarweek';
import { getYearWeekOfDate, YearWeek } from '../../simulation/calendarweek/calendarweek';
import { ISimulationResults } from '../../simulation/data-interfaces/simulation-data.interfaces';
import { BasicSimulation } from '../../simulation/simulation';
import { ChartConfigCollection } from './helpers/chart-config-collection';
import { ColorPalettes } from './helpers/color-palettes';
import { UiDataTransformation } from './helpers/ui-data-transformation';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

    constructor(public dataloader: DataloaderService) {
    }

    simulation = new BasicSimulation(this.dataloader);
    loaded = false;

    chartPopulation: ChartData;
    chartWeeklyVaccinations: ChartData;
    chart7DayVaccinations: ChartData;
    chartWeeklyDeliveries: ChartData;
    chartCumulativeDeliveries: ChartData;
    simulationStartWeekNum = 5;
    simulationStartWeek: YearWeek = cw.yws([2021, this.simulationStartWeekNum]);
    availableAgeLimits = [5, 12, 16];
    simulationStartSlider = {
        min: 1,
        max: 15,
        startOffset: 0.1,
        width: 0.5,
    };

    displayPartitioning: string = Object.keys(this.simulation.partitionings)[0];
    featureFlagYAxisScale = true;

    chartConfig: ChartConfigCollection;
    uiData: UiDataTransformation = new UiDataTransformation();

    private simulationResults: ISimulationResults;
    private colors: ColorPalettes = new ColorPalettes();

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.dataloader.loadData().subscribe(() => {
            this.loaded = true;
            this.chartConfig = new ChartConfigCollection(this.dataloader.population.data.total);
            this.simulation.prepareData();
            this.prepareSimulationStartSlider();
            this.simulationStartWeek = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1);
            this.simulationStartWeekNum = cw.ywt(this.simulationStartWeek)[1];
            this.simulation.params.fractionWilling = 1 - this.simulation.willingness.getUnwillingFraction();
            this.runSimulation();
        });
    }

    prepareSimulationStartSlider(): void {
        const realDataEndYW = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1);
        const realDataEndYWT = cw.ywt(realDataEndYW);
        const graphFirstDate = this.dataloader.vaccinations[0].date;
        const graphLastDate = cw.getWeekdayInYearWeek(this.simulation.simulationEndWeek, 8);
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
        this.simulation.simulationStartWeek = this.simulationStartWeek;
        this.simulationResults = this.simulation.runSimulation();
        this.chartPopulation = this.uiData.buildChartPopulation(this.dataloader, this.simulation, this.simulationResults, this.colors, this.displayPartitioning);
        this.chartWeeklyVaccinations = this.uiData.buildChartWeeklyVaccinations(this.dataloader, this.simulation, this.simulationResults, this.colors);
        this.chart7DayVaccinations = this.uiData.buildChart7DayVaccinations(this.dataloader, this.simulation);
        this.chartWeeklyDeliveries = this.uiData.buildChartWeeklyDeliveries(this.dataloader, this.simulation, this.simulationResults, this.colors);
        this.chartCumulativeDeliveries = this.uiData.buildChartCumulativeDeliveries(this.dataloader, this.simulation, this.simulationResults);
        this.chartConfig.updateConfigs();
    }

    changePartitioning(): void {
        this.chartPopulation = this.uiData.buildChartPopulation(this.dataloader, this.simulation, this.simulationResults, this.colors, this.displayPartitioning);
    }

    // Preserve original property order
    originalOrder = (): number => {
        return 0;
    }

    setWillingnessDate(): void {
        this.resetWillingness();
    }

    resetWillingness(): void {
        this.simulation.params.fractionWilling = 1 - this.simulation.willingness.getUnwillingFraction();
        this.runSimulation();
    }

    reset2ndWillingness(): void {
        this.simulation.params.fractionTakingSecondDose = 0.96;
        this.runSimulation();
    }

    reset3rdWillingness(): void {
        this.simulation.params.fractionTakingThirdDose = 0.76;
        this.runSimulation();
    }

}
