import { KeyValue } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import * as wu from 'wu';
import { DataPoint, DataSeries, StackedBar } from '../../components/d3-charts/data.interfaces';
import {
    PredictionLineChartConfig,
    PredictionLineChartData
} from '../../components/d3-charts/prediction-line-chart.component';
import { DataloaderService } from '../../services/dataloader.service';
import * as cw from '../../simulation/calendarweek/calendarweek';
import { getWeekdayInYearWeek, getYearWeekOfDate, YearWeek } from '../../simulation/calendarweek/calendarweek';
import { zilabImpfsimVerteilungszenarien } from '../../simulation/data-interfaces/raw-data.interfaces';
import { ISimulationResults } from '../../simulation/data-interfaces/simulation-data.interfaces';
import { BasicSimulation } from '../../simulation/simulation';
import { relu, sum } from '../../simulation/vaccine-map-helper';

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

    vaccinationsPalette = {
        once: {
            fillColor: '#8cd0cd',
            strokeColor: '#6fb6b3',
        },
        fully: {
            fillColor: '#54a98f',
            strokeColor: '#4a8a60',
        },
        booster: {
            fillColor: '#2c725c',
            strokeColor: '#20412f',
        }
    };
    populationPartitionPalette = [
        '#a2d9ac',
        '#69b164',
        '#468b43',
        '#186a10',
        '#12520d',
        '#0c3d07',
    ];
    populationPartitionPaletteLarge = [
        '#e9fcec',
        '#c2eac8',
        ...this.populationPartitionPalette,
        '#0a2f05',
        '#061d02',
    ];
    populationPartitionSpecialColors = {
        unwilling: '#ddd',
        contraindicated: '#aaa',
    };

    vaccinePalette = [
        '#4477AA',
        '#CC3311',
        '#CCBB44',
        '#228833',
        '#EE6677',
        '#66CCEE',
        '#AA3377',
        '#BBBBBB',
    ];

    chartPopulation: PredictionLineChartData = {
        yMin: 0,
        yMax: 10,
        series: [
            // one series = one line + fill below
            {
                data: [
                    {value: 5, date: new Date(2021, 0, 1)},
                    {value: 6, date: new Date(2021, 0, 2)},
                    {value: 2, date: new Date(2021, 0, 3)},
                    {value: 7, date: new Date(2021, 0, 6)},
                ],
                fillColor: '#ff4848',
                strokeColor: '#ff0000',
            },
            {
                data: [
                    {value: 8, date: new Date(2021, 0, 4)},
                    {value: 4, date: new Date(2021, 0, 5)},
                    {value: 3, date: new Date(2021, 0, 6)},
                    {value: 5, date: new Date(2021, 0, 7)},
                ],
                fillColor: '#487cff',
                strokeColor: '#0000ff',
            },
            {
                data: [
                    {value: 3, date: new Date(2021, 0, 1)},
                    {value: 10, date: new Date(2021, 0, 5)},
                    {value: 3, date: new Date(2021, 0, 9)},
                ],
                fillColor: '#46bf3d',
                strokeColor: '#39a401',
                strokeDasharray: '5, 5',
                strokeDashoffset: '5'
            },
        ],
        partitions: [],
    };
    chartPopulationConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Bevölkerung',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };
    chartWeeklyVaccinations: PredictionLineChartData = this.chartPopulation;
    chartWeeklyVaccinationsConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };
    chart7DayVaccinations: PredictionLineChartData = this.chartPopulation;
    chart7DayVaccinationsConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };
    chartWeeklyDeliveries: PredictionLineChartData = this.chartPopulation;
    chartWeeklyDeliveriesConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };
    chartCumulativeDeliveries: PredictionLineChartData = this.chartPopulation;
    chartCumulativeDeliveriesConfig: PredictionLineChartConfig = {
        yAxisLabel: '', // 'Impfdosen',
        yAxisScaleFactor: 1,
        yAxisPercent: false,
    };
    simulationStartWeekNum = 5;
    simulationStartWeek: YearWeek = cw.yws([2021, this.simulationStartWeekNum]);
    availableDeliveryScenarios = zilabImpfsimVerteilungszenarien;
    availableAgeLimits = [5, 12, 16];
    simulationStartSlider = {
        min: 1,
        max: 15,
        startOffset: 0.1,
        width: 0.5,
    };

    displayPartitioning = Object.keys(this.simulation.partitionings)[0];
    featureFlagYAxisScale = true;
    displayYAxisScale = 'num';
    displayYAxisScaleTimeframe = 'week';

    simulationResults: ISimulationResults;

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.dataloader.loadData().subscribe(value => {
            this.loaded = true;
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
        this.buildChartPopulation();
        this.buildChartWeeklyVaccinations();
        this.buildChart7DayVaccinations();
        this.buildChartWeeklyDeliveries();
        this.buildChartCumulativeDeliveries();
        this.buildYScaleConfigurations();
    }


    buildYScaleConfigurations(): void {
        let scale = 1;
        let percent = false;
        if (this.displayYAxisScale === 'percent') {
            scale = 1 / this.dataloader.population.data.total;
            percent = true;
        }
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


    buildChartPopulation(): void {
        const newData: PredictionLineChartData = {
            yMin: 0,
            yMax: this.dataloader.population ? this.dataloader.population.data.total : 10000000,
            series: [],
            partitions: [
                {size: 10_000_000, fillColor: 'red'},
                {size: 20_000_000, fillColor: 'green'},
                {size: 35_000_000, fillColor: 'blue'},
            ],
        };

        const vacAtLeastOnce: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.once.fillColor,
            strokeColor: this.vaccinationsPalette.once.strokeColor,
            label: 'Mindestens Erstgeimpft'
        };
        const vacFully: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.fully.fillColor,
            strokeColor: this.vaccinationsPalette.fully.strokeColor,
            label: 'Vollständig Immunisiert'
        };
        const vacBooster: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.booster.fillColor,
            strokeColor: this.vaccinationsPalette.booster.strokeColor,
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

        if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
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

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            let dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (this.simulationStartWeek === cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1)) {
                date = this.dataloader.lastRefreshVaccinations;
                dataAttach = this.simulation.weeklyVaccinations.get(cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations));
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
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
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
            const partitions = this.simulation.partitionings[this.displayPartitioning].partitions;
            const palette = partitions.filter(p => !(p.id in this.populationPartitionSpecialColors)).length > this.populationPartitionPalette.length ?
                this.populationPartitionPaletteLarge
                : this.populationPartitionPalette;
            for (const p of partitions) {
                let c;
                if (p.id in this.populationPartitionSpecialColors) {
                    c = this.populationPartitionSpecialColors[p.id];
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

        this.chartPopulation = newData;
    }


    buildChartWeeklyVaccinations(): void {
        const newData: PredictionLineChartData = {
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
        const vacFirstDoses: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.once.fillColor,
            strokeColor: this.vaccinationsPalette.once.strokeColor,
            label: 'Erste Impfungen (inkl. J&J)',
        };
        const vacSecondDoses: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.fully.fillColor,
            strokeColor: this.vaccinationsPalette.fully.strokeColor,
            label: 'Zweite Impfungen',
        };
        const vacBoosterDoses: DataSeries = {
            data: [],
            fillColor: this.vaccinationsPalette.booster.fillColor,
            strokeColor: this.vaccinationsPalette.booster.strokeColor,
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

        /*if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
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
        if (this.dataloader.vaccinations) {
            vacDeliveries.data.push({
                date: this.dataloader.vaccinations[0].date,
                value: 0
            });
        }
        if (this.simulation.weeklyDeliveries) {
            for (const [week, del] of this.simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.dosesByVaccine.values()).map(relu).reduce(sum)
                });
            }
        }
        if (this.simulation.weeklyVaccinations) {
            for (const [yWeek, data] of this.simulation.weeklyVaccinations.entries()) {
                const date = cw.getWeekdayInYearWeek(yWeek, 8);
                /*vacFirstDoses.data.push({
                    date,
                    value: data.partiallyImmunized
                });
                vacSecondDoses.data.push({
                    date,
                    value: data.vaccineDoses
                });*/
                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(yWeek, 2),
                    dateEnd: cw.getWeekdayInYearWeek(yWeek, (yWeek < this.simulationStartWeek) ? 8 : 3),
                    values: [{
                        label: vacFirstDoses.label,
                        value: data.partiallyImmunized,
                        fillColor: vacFirstDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < this.simulationStartWeek) ? 0.9 : 0.9,
                    }, {
                        label: vacSecondDoses.label,
                        value: data.vaccineDoses - data.partiallyImmunized - data.boosterImmunized,
                        fillColor: vacSecondDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < this.simulationStartWeek) ? 0.9 : 0.9,
                    }, {
                        label: vacBoosterDoses.label,
                        value: data.boosterImmunized,
                        fillColor: vacBoosterDoses.fillColor,
                        fillStriped: false,
                        fillOpacity: (yWeek < this.simulationStartWeek) ? 0.9 : 0.9,
                    }],
                });
            }
            // remove last week if it is not complete yet
            if (this.dataloader.lastRefreshVaccinations.getUTCDay() !== 0) {
                vacFirstDoses.data.pop();
                vacSecondDoses.data.pop();
                vacBoosterDoses.data.pop();
            }
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            vacDeliveriesSim.data.push({
                date,
                value: wu(this.simulation.weeklyDeliveriesScenario.get(cw.weekBefore(this.simulationStartWeek)).dosesByVaccine.values()).map(relu).reduce(sum)
            });
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(this.simulation.weeklyDeliveriesScenario.get(yWeek).dosesByVaccine.values()).map(relu).reduce(sum)
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

        this.chartWeeklyVaccinations = newData;
    }

    buildChart7DayVaccinations(): void {
        const newData: PredictionLineChartData = {
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

        if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
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
                shiftedDate.setUTCDate(shiftedDate.getUTCDate() + this.simulation.params.boosterIntervalWeeks * 7);
                if (getYearWeekOfDate(shiftedDate) < this.simulation.simulationEndWeek) {
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

        this.chart7DayVaccinations = newData;
    }

    buildChartWeeklyDeliveries(): void {
        const newData: PredictionLineChartData = {
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
        for (const vName of this.simulation.vaccineUsage.getVaccinesPriorityList()) {
            vaccinesWithDeliveries.set(vName, false);
            vaccinesColors.set(vName, this.vaccinePalette[colorI++]);
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

        /*if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
                vacDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_differenz_zum_vortag * 7
                });
            }
        }*/
        if (this.simulation.weeklyDeliveries) {
            for (const [week, del] of this.simulation.weeklyDeliveries.entries()) {
                for (const vName of del.cumDosesByVaccine.keys()) { // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                    const value = Math.max(del.dosesByVaccine.get(vName) ?? 0, 0);
                    vacDeliveries.has(vName) || vacDeliveries.set(vName, []);
                    const datapoints = vacDeliveries.get(vName);
                    datapoints.push({
                        date: getWeekdayInYearWeek(week, 8),
                        value
                    });
                    if (value > 0) {
                        vaccinesWithDeliveries.set(vName, true);
                    }
                }

                stackedBars.push({
                    dateStart: cw.getWeekdayInYearWeek(week, 2),
                    dateEnd: cw.getWeekdayInYearWeek(week, (week < this.simulationStartWeek) ? 8 : 3),
                    values: [...wu(vaccinesColors.entries()).map(([vName, color]) => ({
                        label: this.simulation.vaccineUsage.getVaccineDisplayName(vName),
                        value: Math.max(del.dosesByVaccine.get(vName) ?? 0, 0),
                        fillColor: color,
                        fillStriped: false,
                        fillOpacity: (week < this.simulationStartWeek) ? 0.9 : 0,
                        vacName: vName,
                    }))],
                });
            }
        }

        // Add first datapoint so that the chart is always scaled the same
        if (this.dataloader.vaccinations) {
            vacDoses.data.push({
                date: this.dataloader.vaccinations[0].date,
                value: 0
            });
        }
        if (this.simulation.weeklyVaccinations) {
            for (const [yWeek, data] of this.simulation.weeklyVaccinations.entries()) {
                const date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDoses.data.push({
                    date,
                    value: data.vaccineDoses
                });
            }
            // remove last week if it is not complete yet
            if (this.dataloader.lastRefreshVaccinations.getUTCDay() !== 0) {
                vacDoses.data.pop();
            }
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            const dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            vacDosesSim.data.push({
                date,
                value: dataAttach.vaccineDoses
            });

            const vacDeliveryData = this.simulation.weeklyDeliveriesScenario.get(cw.weekBefore(this.simulationStartWeek));
            for (const vName of vacDeliveryData.cumDosesByVaccine.keys()) { // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                const value = Math.max(vacDeliveryData.dosesByVaccine.get(vName) ?? 0, 0);
                vacDeliveriesSim.has(vName) || vacDeliveriesSim.set(vName, []);
                const datapoints = vacDeliveriesSim.get(vName);
                datapoints.push({
                    date,
                    value
                });
            }

            // stacked bars (work in progress)
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDosesSim.data.push({
                    date,
                    value: data.vaccineDoses
                });

                const vacDeliveryData2 = this.simulation.weeklyDeliveriesScenario.get(yWeek);
                for (const vName of vacDeliveryData2.cumDosesByVaccine.keys()) { // iterate over cum doses because the weekly one doesn't list 0-dose-deliveries...
                    const value = Math.max(vacDeliveryData2.dosesByVaccine.get(vName) ?? 0, 0);
                    vacDeliveriesSim.has(vName) || vacDeliveriesSim.set(vName, []);
                    const datapoints = vacDeliveriesSim.get(vName);
                    datapoints.push({
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
                        label: this.simulation.vaccineUsage.getVaccineDisplayName(vName),
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

        colorI = 0;
        for (const [vName, hasDeliveries] of vaccinesWithDeliveries) {
            if (hasDeliveries) {
                const color = vaccinesColors.get(vName); // this.vaccinePalette[colorI++];
                vacDeliveriesDataSeries.unshift({
                    data: [], // vacDeliveries.get(vName) ?? [],
                    fillColor: color,
                    strokeColor: color,
                    label: this.simulation.vaccineUsage.getVaccineDisplayName(vName),
                });
                vacDeliveriesSimDataSeries.unshift({
                    data: [], // vacDeliveriesSim.get(vName) ?? [],
                    fillColor: color,
                    strokeColor: color,
                    strokeDasharray: '5, 5',
                    strokeDashoffset: '5',
                    fillStriped: true,
                    label: this.simulation.vaccineUsage.getVaccineDisplayName(vName) + ' (Modell)',
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

        this.chartWeeklyDeliveries = newData;
    }

    buildChartCumulativeDeliveries(): void {
        const newData: PredictionLineChartData = {
            yMin: 0,
            yMax: this.dataloader.population ? this.dataloader.population.data.total * 2.5 : 10000000,
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

        if (this.simulation.weeklyDeliveries) {
            for (const [week, del] of this.simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }
        if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
                vacDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_kumulativ
                });
            }
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            const dateWeek = date;
            let dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (this.simulationStartWeek === cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1)) {
                date = this.dataloader.lastRefreshVaccinations;
                dataAttach = this.simulation.weeklyVaccinations.get(cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations));
            }
            vacDosesSim.data.push({
                date,
                value: dataAttach.cumVaccineDoses
            });
            vacDeliveriesSim.data.push({
                date: dateWeek,
                value: wu(this.simulation.weeklyDeliveriesScenario.get(cw.weekBefore(this.simulationStartWeek)).cumDosesByVaccine.values()).reduce(sum)
            });
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDosesSim.data.push({
                    date,
                    value: data.cumVaccineDoses
                });
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(this.simulation.weeklyDeliveriesScenario.get(yWeek).cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }

        newData.series = [
            vacDeliveries,
            vacDeliveriesSim,
            vacDoses,
            vacDosesSim
        ];

        this.chartCumulativeDeliveries = newData;
    }

    // Preserve original property order
    originalOrder = (a: KeyValue<any, any>, b: KeyValue<any, any>): number => {
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
