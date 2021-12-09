import { Component, OnInit } from '@angular/core';
import * as wu from 'wu';
import { DataPoint, DataSeries, StackedBar } from '../../components/d3-charts/data.interfaces';
import { ChartData } from '../../components/d3-charts/prediction-line-chart.component';
import { DataloaderService } from '../../services/dataloader.service';
import * as cw from '../../simulation/calendarweek/calendarweek';
import { getWeekdayInYearWeek, getYearWeekOfDate, YearWeek } from '../../simulation/calendarweek/calendarweek';
import { ISimulationResults } from '../../simulation/data-interfaces/simulation-data.interfaces';
import { BasicSimulation } from '../../simulation/simulation';
import { relu, sum } from '../../simulation/vaccine-map-helper';
import { ChartConfigCollection } from './helpers/chart-config-collection';
import { ColorPalettes } from './helpers/color-palettes';

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

    displayPartitioning = Object.keys(this.simulation.partitionings)[0];
    featureFlagYAxisScale = true;

    chartConfig: ChartConfigCollection;

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
        this.chartPopulation = this.buildChartPopulation(this.dataloader, this.simulation, this.simulationResults, this.colors);
        this.chartWeeklyVaccinations
            = this.buildChartWeeklyVaccinations(this.dataloader, this.simulation, this.simulationResults, this.colors);
        this.chart7DayVaccinations = this.buildChart7DayVaccinations(this.dataloader, this.simulation);
        this.chartWeeklyDeliveries = this.buildChartWeeklyDeliveries(this.dataloader, this.simulation, this.simulationResults, this.colors);
        this.chartCumulativeDeliveries = this.buildChartCumulativeDeliveries(this.dataloader, this.simulation, this.simulationResults);
        this.chartConfig.updateConfigs();
    }

    changePartitioning(): void {
        this.chartPopulation = this.buildChartPopulation(this.dataloader, this.simulation, this.simulationResults, this.colors);
    }

    private buildChartPopulation(
        dataloader: DataloaderService,
        simulation: BasicSimulation,
        results: ISimulationResults,
        colors: ColorPalettes,
    ): ChartData {
        const newData: ChartData = {
            yMin: 0,
            yMax: dataloader.population ? dataloader.population.data.total : 10000000,
            series: [],
            partitions: [
                {size: 10_000_000, fillColor: 'red'},
                {size: 20_000_000, fillColor: 'green'},
                {size: 35_000_000, fillColor: 'blue'},
            ],
        };

        const { once, fully, booster } = colors.vaccinationsPal;
        const vacAtLeastOnce: DataSeries = {
            data: [],
            fillColor: once.fillColor,
            strokeColor: once.strokeColor,
            label: 'Mindestens Erstgeimpft'
        };
        const vacFully: DataSeries = {
            data: [],
            fillColor: fully.fillColor,
            strokeColor: fully.strokeColor,
            label: 'Vollständig Immunisiert'
        };
        const vacBooster: DataSeries = {
            data: [],
            fillColor: booster.fillColor,
            strokeColor: booster.strokeColor,
            label: 'Booster-Immunisiert'
        };
        const vacAtLeastOnceSim: DataSeries = {
            data: [],
            fillColor: vacAtLeastOnce.fillColor,
            strokeColor: vacAtLeastOnce.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacAtLeastOnce.label + ' (Modell)',
            hideInLegend: true,
        };
        const vacFullySim: DataSeries = {
            data: [],
            fillColor: vacFully.fillColor,
            strokeColor: vacFully.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacFully.label + ' (Modell)',
            hideInLegend: true,
        };
        const vacBoosterSim: DataSeries = {
            data: [],
            fillColor: vacBooster.fillColor,
            strokeColor: vacBooster.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacBooster.label + ' (Modell)',
            hideInLegend: true,
        };

        if (dataloader.vaccinations) {
            for (const vacDay of dataloader.vaccinations) {
                vacAtLeastOnce.data.push({
                    date: vacDay.date,
                    value: vacDay.personen_erst_kumulativ
                });
                vacFully.data.push({
                    date: vacDay.date,
                    value: vacDay.personen_voll_kumulativ
                });
                vacBooster.data.push({
                    date: vacDay.date,
                    value: vacDay.personen_auffrisch_kumulativ
                });
            }
        }

        if (results) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(simulation.simulationStartWeek, 1);
            let dataAttach = simulation.weeklyVaccinations.get(cw.weekBefore(simulation.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (simulation.simulationStartWeek === cw.getYearWeekOfDate(dataloader.lastRefreshVaccinations, 1)) {
                date = dataloader.lastRefreshVaccinations;
                dataAttach = simulation.weeklyVaccinations.get(cw.getYearWeekOfDate(dataloader.lastRefreshVaccinations));
            }
            vacAtLeastOnceSim.data.push({
                date,
                value: dataAttach.cumPartiallyImmunized
            });
            vacFullySim.data.push({
                date,
                value: dataAttach.cumFullyImmunized
            });
            vacBoosterSim.data.push({
                date,
                value: dataAttach.cumBoosterImmunized
            });
            for (const [yWeek, data] of results.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacAtLeastOnceSim.data.push({
                    date,
                    value: data.cumPartiallyImmunized
                });
                vacFullySim.data.push({
                    date,
                    value: data.cumFullyImmunized
                });
                vacBoosterSim.data.push({
                    date,
                    value: data.cumBoosterImmunized
                });
            }

            const parts = [];
            let colorI = 0;
            const partitions = simulation.partitionings[this.displayPartitioning].partitions;
            const palette = partitions.filter(p => !(p.id in colors.populationSpecial)).length > colors.populationPalS.length ?
                colors.populationPalL
                : colors.populationPalS;
            for (const p of partitions) {
                let c;
                if (p.id in colors.populationSpecial) {
                    c = colors.populationSpecial[p.id];
                } else {
                    c = palette[colorI++];
                }
                parts.unshift({
                    label: p.description,
                    size: p.size,
                    fillColor: c
                });
            }
            newData.partitions = parts;
        }

        newData.series = [
            vacAtLeastOnce,
            vacFully,
            vacBooster,
            vacAtLeastOnceSim,
            vacFullySim,
            vacBoosterSim,
        ];

        return newData;
    }


    private buildChartWeeklyVaccinations(
        dataloader: DataloaderService,
        simulation: BasicSimulation,
        results: ISimulationResults,
        colors: ColorPalettes
    ): ChartData {
        const newData: ChartData = {
            yMin: 0,
            yMax: 10_000_000,
            series: [],
            partitions: [],
        };

        const vacDeliveries: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
            fillOpacity: 0,
            label: 'Lieferungen',
        };
        const vacDeliveriesSim: DataSeries = {
            data: [],
            fillColor: vacDeliveries.fillColor,
            strokeColor: vacDeliveries.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillOpacity: 0,
            fillStriped: true,
            label: vacDeliveries.label + ' (Modell)',
            hideInLegend: true,
        };
        const { once, fully, booster } = colors.vaccinationsPal;
        const vacFirstDoses: DataSeries = {
            data: [],
            fillColor: once.fillColor,
            strokeColor: once.strokeColor,
            label: 'Erste Impfungen (inkl. J&J)',
        };
        const vacSecondDoses: DataSeries = {
            data: [],
            fillColor: fully.fillColor,
            strokeColor: fully.strokeColor,
            label: 'Zweite Impfungen',
        };
        const vacBoosterDoses: DataSeries = {
            data: [],
            fillColor: booster.fillColor,
            strokeColor: booster.strokeColor,
            label: 'Booster-Impfungen',
        };
        const vacFirstDosesSim: DataSeries = {
            data: [],
            fillColor: vacFirstDoses.fillColor,
            strokeColor: vacFirstDoses.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacFirstDoses.label + ' (Modell)',
            hideInLegend: true,
        };
        const vacSecondDosesSim: DataSeries = {
            data: [],
            fillColor: vacSecondDoses.fillColor,
            strokeColor: vacSecondDoses.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacSecondDoses.label + ' (Modell)',
            hideInLegend: true,
        };
        const vacBoosterDosesSim: DataSeries = {
            data: [],
            fillColor: vacBoosterDoses.fillColor,
            strokeColor: vacBoosterDoses.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacBoosterDoses.label + ' (Modell)',
            hideInLegend: true,
        };
        const stackedBars: Array<StackedBar> = [];

        /*if (dataloader.vaccinations) {
            for (const vacDay of dataloader.vaccinations) {
                vacFirstDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_erst_differenz_zum_vortag * 7
                });
                vacSecondDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_zweit_differenz_zum_vortag * 7
                });
            }
        }*/
        // Add first datapoint so that the chart is always scaled the same
        if (dataloader.vaccinations) {
            vacDeliveries.data.push({
                date: dataloader.vaccinations[0].date,
                value: 0
            });
        }
        if (simulation.weeklyDeliveries) {
            for (const [week, del] of simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.dosesByVaccine.values()).map(relu).reduce(sum)
                });
            }
        }
        if (simulation.weeklyVaccinations) {
            for (const [yWeek, data] of simulation.weeklyVaccinations.entries()) {
                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(yWeek, 2),
                    dateEnd: cw.getWeekdayInYearWeek(yWeek, (yWeek < simulation.simulationStartWeek) ? 8 : 3),
                    values: [{
                        label: vacFirstDoses.label,
                        value: data.partiallyImmunized,
                        fillColor: vacFirstDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < simulation.simulationStartWeek) ? 0.9 : 0.9,
                    }, {
                        label: vacSecondDoses.label,
                        value: data.vaccineDoses - data.partiallyImmunized - data.boosterImmunized,
                        fillColor: vacSecondDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < simulation.simulationStartWeek) ? 0.9 : 0.9,
                    }, {
                        label: vacBoosterDoses.label,
                        value: data.boosterImmunized,
                        fillColor: vacBoosterDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < simulation.simulationStartWeek) ? 0.9 : 0.9,
                    }],
                });
            }
            // remove last week if it is not complete yet
            if (dataloader.lastRefreshVaccinations.getUTCDay() !== 0) {
                vacFirstDoses.data.pop();
                vacSecondDoses.data.pop();
                vacBoosterDoses.data.pop();
            }
        }

        if (results) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(simulation.simulationStartWeek, 1);
            const weeklyData = simulation.weeklyDeliveriesScenario.get(cw.weekBefore(simulation.simulationStartWeek));
            vacDeliveriesSim.data.push({
                date,
                value: wu(weeklyData.dosesByVaccine.values()).map(relu).reduce(sum),
            });
            for (const [yWeek, data] of results.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(simulation.weeklyDeliveriesScenario.get(yWeek).dosesByVaccine.values()).map(relu).reduce(sum)
                });

                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(yWeek, 3),
                    dateEnd: cw.getWeekdayInYearWeek(yWeek, 8),
                    values: [{
                        label: vacFirstDosesSim.label,
                        value: data.partiallyImmunized,
                        fillColor: vacFirstDosesSim.fillColor,
                        fillStriped: true,
                        fillOpacity: 0.8,
                    }, {
                        label: vacSecondDosesSim.label,
                        value: data.vaccineDoses - data.partiallyImmunized - data.boosterImmunized,
                        fillColor: vacSecondDosesSim.fillColor,
                        fillStriped: true,
                        fillOpacity: 0.8,
                    }, {
                        label: vacBoosterDosesSim.label,
                        value: data.boosterImmunized,
                        fillColor: vacBoosterDosesSim.fillColor,
                        fillStriped: true,
                        fillOpacity: 0.8,
                    }],
                });
            }
        }


        newData.stackedBars = stackedBars;
        newData.series = [
            vacDeliveries,
            vacDeliveriesSim,
            vacBoosterDoses,
            vacSecondDoses,
            vacFirstDoses,
            vacBoosterDosesSim,
            vacSecondDosesSim,
            vacFirstDosesSim,
        ];

        return newData;
    }

    private buildChart7DayVaccinations(dataloader: DataloaderService, simulation: BasicSimulation): ChartData {
        const newData: ChartData = {
            yMin: 0,
            yMax: 7_000_000,
            series: [],
            partitions: [],
        };
        const vacFirstDoses: DataSeries = {
            data: [],
            fillColor: '#ffffff',
            strokeColor: '#e0ba2a',
            fillOpacity: 0,
            label: 'Erste Impfungen (inkl. J&J)',
        };
        const vacSecondDoses: DataSeries = {
            data: [],
            fillColor: '#ffffff',
            strokeColor: '#3890ab',
            fillOpacity: 0,
            label: 'Zweite Impfungen',
        };
        const vacBoosterDoses: DataSeries = {
            data: [],
            fillColor: '#ffffff',
            strokeColor: '#1f6c42',
            fillOpacity: 0,
            label: 'Booster-Impfungen',
        };
        const vacFullyImmunizedShifted: DataSeries = {
            data: [],
            fillColor: 'white',
            strokeColor: 'rgb(162,162,162)',
            fillOpacity: 0,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            label: 'Boosterbedarf (verschobene Zweitimpfungen)',
        };

        const vacFirstDoses7Days = [];
        const vacSecondDoses7Days = [];
        const vacBoosterDoses7Days = [];

        if (dataloader.vaccinations) {
            for (const vacDay of dataloader.vaccinations) {
                vacFirstDoses7Days.unshift(vacDay.dosen_erst_differenz_zum_vortag);
                vacSecondDoses7Days.unshift(vacDay.dosen_zweit_differenz_zum_vortag);
                vacBoosterDoses7Days.unshift(vacDay.dosen_dritt_differenz_zum_vortag);
                if (vacFirstDoses7Days.length > 7) {
                    vacFirstDoses7Days.pop();
                }
                if (vacSecondDoses7Days.length > 7) {
                    vacSecondDoses7Days.pop();
                }
                if (vacBoosterDoses7Days.length > 7) {
                    vacBoosterDoses7Days.pop();
                }

                vacFirstDoses.data.push({
                    date: vacDay.date,
                    value: vacFirstDoses7Days.reduce(sum)
                });
                vacSecondDoses.data.push({
                    date: vacDay.date,
                    value: vacSecondDoses7Days.reduce(sum)
                });
                vacBoosterDoses.data.push({
                    date: vacDay.date,
                    value: vacBoosterDoses7Days.reduce(sum)
                });

                const shiftedDate = new Date(vacDay.date);
                shiftedDate.setUTCDate(shiftedDate.getUTCDate() + simulation.params.boosterIntervalWeeks * 7);
                if (getYearWeekOfDate(shiftedDate) < simulation.simulationEndWeek) {
                    vacFullyImmunizedShifted.data.push({
                        date: shiftedDate,
                        value: vacSecondDoses7Days.reduce(sum)
                    });
                }
            }
        }

        newData.series = [
            vacBoosterDoses,
            vacSecondDoses,
            vacFirstDoses,
            vacFullyImmunizedShifted,
        ];

        return newData;
    }

    private buildChartWeeklyDeliveries(
        dataloader: DataloaderService,
        simulation: BasicSimulation,
        results: ISimulationResults,
        colors: ColorPalettes,
    ): ChartData {
        const newData: ChartData = {
            yMin: 0,
            yMax: 10_000_000,
            series: [],
            partitions: [],
        };

        const vacDeliveries: Map<string, DataPoint[]> = new Map();
        const vacDeliveriesSim: Map<string, DataPoint[]> = new Map();
        const vaccinesWithDeliveries: Map<string, boolean> = new Map();
        const vaccinesColors: Map<string, string> = new Map();
        let colorI = 0;
        for (const vName of simulation.vaccineUsage.getVaccinesPriorityList()) {
            vaccinesWithDeliveries.set(vName, false);
            vaccinesColors.set(vName, colors.vaccinePal[colorI++]);
        }

        const vacDoses: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            fillOpacity: 0,
            label: 'Impfungen',
        };
        const vacDosesSim: DataSeries = {
            data: [],
            fillColor: vacDoses.fillColor,
            strokeColor: vacDoses.strokeColor,
            fillOpacity: 0,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacDoses.label + ' (Modell)',
            hideInLegend: true,
        };
        const stackedBars: Array<StackedBar> = [];

        if (simulation.weeklyDeliveries) {
            for (const [week, del] of simulation.weeklyDeliveries.entries()) {
                for (const vName of del.cumDosesByVaccine.keys()) {
                    // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                    const value = Math.max(del.dosesByVaccine.get(vName) ?? 0, 0);
                    if (!vacDeliveries.has(vName)) {
                        vacDeliveries.set(vName, []);
                    }
                    const dataPoints = vacDeliveries.get(vName);
                    dataPoints.push({
                        date: getWeekdayInYearWeek(week, 8),
                        value
                    });
                    if (value > 0) {
                        vaccinesWithDeliveries.set(vName, true);
                    }
                }

                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(week, 2),
                    dateEnd: cw.getWeekdayInYearWeek(week, (week < simulation.simulationStartWeek) ? 8 : 3),
                    values: [...wu(vaccinesColors.entries()).map(([vName, color]) => ({
                        label: simulation.vaccineUsage.getVaccineDisplayName(vName),
                        value: Math.max(del.dosesByVaccine.get(vName) ?? 0, 0),
                        fillColor: color,
                        fillStriped: false,
                        fillOpacity: (week < simulation.simulationStartWeek) ? 0.9 : 0,
                        vacName: vName,
                    }))],
                });
            }
        }

        // Add first datapoint so that the chart is always scaled the same
        if (dataloader.vaccinations) {
            vacDoses.data.push({
                date: dataloader.vaccinations[0].date,
                value: 0
            });
        }
        if (simulation.weeklyVaccinations) {
            for (const [yWeek, data] of simulation.weeklyVaccinations.entries()) {
                const date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDoses.data.push({
                    date,
                    value: data.vaccineDoses
                });
            }
            // remove last week if it is not complete yet
            if (dataloader.lastRefreshVaccinations.getUTCDay() !== 0) {
                vacDoses.data.pop();
            }
        }

        if (results) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(simulation.simulationStartWeek, 1);
            const dataAttach = simulation.weeklyVaccinations.get(cw.weekBefore(simulation.simulationStartWeek));
            vacDosesSim.data.push({
                date,
                value: dataAttach.vaccineDoses
            });

            const vacDeliveryData = simulation.weeklyDeliveriesScenario.get(cw.weekBefore(simulation.simulationStartWeek));
            for (const vName of vacDeliveryData.cumDosesByVaccine.keys()) {
                // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                const value = Math.max(vacDeliveryData.dosesByVaccine.get(vName) ?? 0, 0);
                if (!vacDeliveriesSim.has(vName)) {
                    vacDeliveriesSim.set(vName, []);
                }
                const dataPoints = vacDeliveriesSim.get(vName);
                dataPoints.push({
                    date,
                    value
                });
            }

            // stacked bars (work in progress)
            for (const [yWeek, data] of results.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDosesSim.data.push({
                    date,
                    value: data.vaccineDoses
                });

                const vacDeliveryData2 = simulation.weeklyDeliveriesScenario.get(yWeek);
                for (const vName of vacDeliveryData2.cumDosesByVaccine.keys()) {
                    // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                    const value = Math.max(vacDeliveryData2.dosesByVaccine.get(vName) ?? 0, 0);
                    if (!vacDeliveriesSim.has(vName)) {
                        vacDeliveriesSim.set(vName, []);
                    }
                    const dataPoints = vacDeliveriesSim.get(vName);
                    dataPoints.push({
                        date,
                        value
                    });
                    if (value > 0) {
                        vaccinesWithDeliveries.set(vName, true);
                    }
                }

                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(yWeek, 3),
                    dateEnd: cw.getWeekdayInYearWeek(yWeek, 8),
                    values: [...wu(vaccinesColors.entries()).map(([vName, color]) => ({
                        label: simulation.vaccineUsage.getVaccineDisplayName(vName),
                        value: Math.max(vacDeliveryData2.dosesByVaccine.get(vName) ?? 0, 0),
                        fillColor: color,
                        fillStriped: true,
                        fillOpacity: 0.8,
                        vacName: vName,
                    }))],
                });
            }
        }

        const vacDeliveriesDataSeries: DataSeries[] = [];
        const vacDeliveriesSimDataSeries: DataSeries[] = [];

        for (const [vName, hasDeliveries] of vaccinesWithDeliveries) {
            if (hasDeliveries) {
                const color = vaccinesColors.get(vName);
                vacDeliveriesDataSeries.unshift({
                    data: [],
                    fillColor: color,
                    strokeColor: color,
                    label: simulation.vaccineUsage.getVaccineDisplayName(vName),
                });
                vacDeliveriesSimDataSeries.unshift({
                    data: [],
                    fillColor: color,
                    strokeColor: color,
                    strokeDasharray: '5, 5',
                    strokeDashoffset: '5',
                    fillStriped: true,
                    label: simulation.vaccineUsage.getVaccineDisplayName(vName) + ' (Modell)',
                    hideInLegend: true,
                });
            }
        }


        newData.stackedBars = stackedBars;
        newData.series = [
            vacDoses,
            vacDosesSim,
            ...vacDeliveriesDataSeries,
            ...vacDeliveriesSimDataSeries,
        ];

        return newData;
    }

    private buildChartCumulativeDeliveries(
        dataloader: DataloaderService,
        simulation: BasicSimulation,
        results: ISimulationResults,
    ): ChartData {
        const newData: ChartData = {
            yMin: 0,
            yMax: dataloader.population ? dataloader.population.data.total * 2.5 : 10000000,
            series: [],
            partitions: [],
        };

        const vacDeliveries: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
            label: 'Lieferungen',
        };
        const vacDoses: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            label: 'Impfungen',
        };
        const vacDeliveriesSim: DataSeries = {
            data: [],
            fillColor: vacDeliveries.fillColor,
            strokeColor: vacDeliveries.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacDeliveries.label + ' (Modell)',
            hideInLegend: true,
        };
        const vacDosesSim: DataSeries = {
            data: [],
            fillColor: vacDoses.fillColor,
            strokeColor: vacDoses.strokeColor,
            strokeDasharray: '5, 5',
            strokeDashoffset: '5',
            fillStriped: true,
            label: vacDoses.label + ' (Modell)',
            hideInLegend: true,
        };

        if (simulation.weeklyDeliveries) {
            for (const [week, del] of simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }
        if (dataloader.vaccinations) {
            for (const vacDay of dataloader.vaccinations) {
                vacDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_kumulativ
                });
            }
        }

        if (results) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(simulation.simulationStartWeek, 1);
            const dateWeek = date;
            let dataAttach = simulation.weeklyVaccinations.get(cw.weekBefore(simulation.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (simulation.simulationStartWeek === cw.getYearWeekOfDate(dataloader.lastRefreshVaccinations, 1)) {
                date = dataloader.lastRefreshVaccinations;
                dataAttach = simulation.weeklyVaccinations.get(cw.getYearWeekOfDate(dataloader.lastRefreshVaccinations));
            }
            vacDosesSim.data.push({
                date,
                value: dataAttach.cumVaccineDoses
            });
            const weeklyData = simulation.weeklyDeliveriesScenario.get(cw.weekBefore(simulation.simulationStartWeek));
            vacDeliveriesSim.data.push({
                date: dateWeek,
                value: wu(weeklyData.cumDosesByVaccine.values()).reduce(sum),
            });
            for (const [yWeek, data] of results.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDosesSim.data.push({
                    date,
                    value: data.cumVaccineDoses
                });
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(simulation.weeklyDeliveriesScenario.get(yWeek).cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }

        newData.series = [
            vacDeliveries,
            vacDeliveriesSim,
            vacDoses,
            vacDosesSim
        ];

        return newData;
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
