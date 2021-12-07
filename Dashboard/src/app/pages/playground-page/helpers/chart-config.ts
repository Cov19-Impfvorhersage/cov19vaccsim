import { PredictionLineChartConfig } from '../../../components/d3-charts/prediction-line-chart.component';

export class ChartConfig {

    // modes

    displayYAxisScale: 'num' | 'percent' = 'num';
    displayYAxisScaleTimeframe: 'day' | 'week' = 'week';

    // configs

    chartPopulationConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Bevölkerung',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };

    chartWeeklyVaccinationsConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };

    chart7DayVaccinationsConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };

    chartWeeklyDeliveriesConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };

    chartCumulativeDeliveriesConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };

    constructor(public populationTotal: number) {
    }

    setScaleMode(mode: 'num' | 'percent'): void {
        this.displayYAxisScale = mode;
        this.updateConfigs();
    }

    setScaleTimeframe(timeframe: 'day' | 'week'): void {
        this.displayYAxisScaleTimeframe = timeframe;
        this.updateConfigs();
    }

    updateConfigs(): void {
        const percent = this.displayYAxisScale === 'percent';
        const scale = percent ? 1 / this.populationTotal : 1;
        const weeklyScale = scale * (this.displayYAxisScaleTimeframe === 'day' ? 1 / 7 : 1);
        this.chartPopulationConfig = {
            ...this.chartPopulationConfig,
            yAxisScaleFactor: scale,
            yAxisPercent: percent,
        };
        this.chartCumulativeDeliveriesConfig = {
            ...this.chartCumulativeDeliveriesConfig,
            yAxisScaleFactor: scale,
            yAxisPercent: percent,
        };
        this.chartWeeklyVaccinationsConfig = {
            ...this.chartWeeklyVaccinationsConfig,
            yAxisScaleFactor: weeklyScale,
            yAxisPercent: percent,
        };
        this.chartWeeklyDeliveriesConfig = {
            ...this.chartWeeklyDeliveriesConfig,
            yAxisScaleFactor: weeklyScale,
            yAxisPercent: percent,
        };
        this.chart7DayVaccinationsConfig = {
            ...this.chart7DayVaccinationsConfig,
            yAxisScaleFactor: weeklyScale,
            yAxisPercent: percent,
        };
    }

}
