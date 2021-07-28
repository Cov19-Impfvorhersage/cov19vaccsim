import {YearWeek} from './calendarweek/calendarweek';
import * as cw from './calendarweek/calendarweek';
import * as wu from 'wu';
import {zilabImpfsimVerteilungszenarien} from './data-interfaces/raw-data.interfaces';
import {
    ISimulationResults, IVaccinationWeek, VaccineNumbers,
    WeeklyDeliveryData,
    WeeklyVaccinationData
} from './data-interfaces/simulation-data.interfaces';
import {DataloaderService} from '../services/dataloader.service';
import {
    calculateWeeklyDeliveries,
    calculateWeeklyVaccinations,
    extractDeliveriesInfo,
    mergeWeeklyDeliveryScenario, recalculateCumulativeWeeklyDeliveries
} from './weekly-data-converter';
import {
    AgePartitioner,
    CosmoVaccinationWillingnessPartitioner, DecreePriorityPartitioner,
    PopulationPartition,
    RKIPriorityPartitioner
} from './populationPartitionings';
import {sum, sub, vNM, v, mul} from './vaccine-map-helper';
import {VaccineUsage} from './vaccine-usage';
import {normalizeVaccineName} from "./data-interfaces/vaccine-names";


export interface ISimulationParameters {
    considerContraindicated: boolean;
    considerNotWilling: boolean;
    considerHesitating: boolean;
    estimateWillingPerVaccine: string;
    considerStockPile: boolean;
    astra2ndToBiontech: boolean;
    contraindicationAge: number;
    deliveryAmountFactor: number;
    deliveryScenario: string;
    keep2ndDosesBack: number;
    extraIntervalWeeks: number;
    extraIntervalWeeksOnlyFuture: boolean;
    fractionTakingSecondDose: number;
    fractionWilling: number;
    vaccinesUsed: Map<string, {
        used: boolean
    }>;
}



export interface VaccinationSimulation {
    params: ISimulationParameters;
    runSimulation(): ISimulationResults;
}

export class BasicSimulation implements VaccinationSimulation {

    constructor(
        private dataloader: DataloaderService) {
    }

    simulationStartWeek: YearWeek = cw.yws([2021, 10]);
    simulationEndWeek: YearWeek = cw.yws([2021, 43]);

    /** Delay between vaccines being delivered and them being available for usage */
    vaccineDeliveryDelayWeeks = 1;
    astra2ndToBiontechStartWeek: YearWeek = cw.yws([2021, 27]);

    weeklyVaccinations: WeeklyVaccinationData;
    weeklyDeliveries: WeeklyDeliveryData;
    plannedDeliveries: WeeklyDeliveryData;
    weeklyDeliveriesScenario: WeeklyDeliveryData;
    private currentDeliveryScenario: string;


    params: ISimulationParameters = {
        considerContraindicated: true,
        considerNotWilling: true,
        considerHesitating: true,
        estimateWillingPerVaccine: 'exponential',
        considerStockPile: true,
        astra2ndToBiontech: true,
        contraindicationAge: 12,
        deliveryAmountFactor: 1,
        deliveryScenario: zilabImpfsimVerteilungszenarien[1],
        keep2ndDosesBack: 0,
        extraIntervalWeeks: 0,
        extraIntervalWeeksOnlyFuture: false,
        fractionTakingSecondDose: 0.96,
        fractionWilling: 0.80,
        vaccinesUsed: new Map(),
    };

    willingness = new CosmoVaccinationWillingnessPartitioner(this.dataloader);
    availableWillingnessOptions = {};
    availableWillingnessEstimationOptions = {
        off: "Keine",
        constant: "Konstant",
        exponential: "Exponentiell abfallend"
    };
    vaccineUsage = new VaccineUsage(this.dataloader);

    partitionings = {
        vaccinationWillingness: {
            title: "Impfwilligkeit nach COSMO-Umfragen",
            partitioner: this.willingness,
            partitions: []
        },
        prioritiesDecree: {
            title: "Prioritätsgruppen nach Verordnung (geschätzt)",
            partitioner: new DecreePriorityPartitioner(this.dataloader),
            partitions: []
        },
        prioritiesRki: {
            title: "Prioritätsgruppen nach RKI (geschätzt)",
            partitioner: new RKIPriorityPartitioner(this.dataloader),
            partitions: []
        },
        prioritiesAge: {
            title: "Bevölkerung nach Alter",
            partitioner: new AgePartitioner(this.dataloader),
            partitions: []
        },
    };

    /** Prepare data: Call when Dataloader is ready */
    prepareData(): boolean {
        if (!this.dataloader.allLoaded()){
            return false;
        }
        this.vaccineUsage.calculateData();

        let used = new Map();
        for (const vName of this.vaccineUsage.getVaccinesPriorityList()){
            used.set(vName, {
                used: this.vaccineUsage.isVaccineUsed(this.simulationStartWeek, vName)
            });
        }
        this.params.vaccinesUsed = used;

        this.availableWillingnessOptions = {};
        for (const survey of this.willingness.getAvailableSurveys()){
            this.availableWillingnessOptions[survey] = (new Date(survey)).toLocaleDateString('de-DE',
                { year: '2-digit', month: 'long', day: '2-digit' }
            );
        }

        return true;
    }


    /**
     * #### THE ACTUAL SIMULATION OF THE VACCINATIONS ####
     */
    runSimulation(): ISimulationResults {
        if (!this.ensureWeeklyData()){
            return null;
        }

        console.log('### Running simulation ###');

        // # Simulate deliveries (including parameters like delivery amount factor & approved vaccines)
        this.simulateDeliveries();

        // # Partitionings of the population
        {
            let partitioning = [];
            if (this.params.considerContraindicated) {
                partitioning = this.addContraindicatedPartition(partitioning);
            }
            if (this.params.considerNotWilling) {
                partitioning = this.addUnwillingPartition(partitioning);
            }
            for (const part of Object.values(this.partitionings)) {
               part.partitions = part.partitioner.addPartitions(partitioning);
            }
        }


        // # Initializations
        let curWeek = this.simulationStartWeek;
        const results: ISimulationResults = {
            weeklyData: new Map()
        };


        // # Willingness estimations per vaccine
        let perVacWillingnessData = new Map();
        if(this.params.estimateWillingPerVaccine !== 'off'){
            // For every vaccine available
            // Check the fraction of delivered vaccine given out to people over the last weeks

            const estimateWeeks = 3;
            const deliveryEstimateWeeks = 8; // estimate deliveries over a longer period because they tend to be sporadic

            const dataBeforeSim = this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            const deliveriesBeforeSim = this.weeklyDeliveriesScenario.get(cw.weekBefore(this.simulationStartWeek));
            const dataNWeeksAgo = this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek, estimateWeeks + 1));
            const deliveriesNWeeksAgo = this.weeklyDeliveriesScenario.get(cw.weekBefore(this.simulationStartWeek, deliveryEstimateWeeks + 1));

            for (const vName of this.vaccineUsage.getVaccinesPriorityList()){
                if (this.params.vaccinesUsed.get(vName).used){
                    const deliveries = Math.max(0, deliveriesBeforeSim.cumDosesByVaccine.get(vName) || 0 - deliveriesNWeeksAgo.cumDosesByVaccine.get(vName) || 0) * (estimateWeeks / deliveryEstimateWeeks);
                    const shots = Math.max(0, dataBeforeSim.cumDosesByVaccine.get(vName) - dataNWeeksAgo.cumDosesByVaccine.get(vName));
                    const shots1 = Math.max(0, dataBeforeSim.cumFirstDosesByVaccine.get(vName) - dataNWeeksAgo.cumFirstDosesByVaccine.get(vName)) || shots;
                    // Fraction of first shots given of possible first shots (deliveries minus second shots)
                    const fraction = Math.min(1, Math.max(0, shots1 / (deliveries - (shots - shots1))));
                    const averageShots1 = shots1 / estimateWeeks;
                    const expFact = Math.min(1, Math.max(0,
                        Math.pow(
                            (dataBeforeSim.firstDosesByVaccine.get(vName) || dataBeforeSim.dosesByVaccine.get(vName))
                            / (dataNWeeksAgo.firstDosesByVaccine.get(vName) || dataNWeeksAgo.dosesByVaccine.get(vName)),
                            1 / estimateWeeks) || 1
                    ));
                    const expStartValue = (averageShots1 * Math.pow(expFact, (estimateWeeks-1) / 2)) || averageShots1;
                    console.log('Data for last ' + estimateWeeks + ' weeks:', vName,
                        ' delivered ', deliveries,
                        'given total', shots,
                        'given 1st', shots1,
                        'fraction of available 1st actually given', fraction, 'exponential fallof factor', expFact, 'starting at', expStartValue);
                    perVacWillingnessData.set(vName, {
                        fraction: fraction,
                        averageNumbers: averageShots1,
                        exponentialNumbers: expStartValue, // Initialize running variable
                        exponentialFactor: expFact,
                    });
                }
            }
        }



        // Running week data
        // (never go below actual data in first week if the first week is the current week)
        let runningWeekData =
            (this.simulationStartWeek === cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations, 1)) ?
            this.weeklyVaccinations.get(this.simulationStartWeek) :
            null;

        const dataBeforeSim = this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
        let cumPartiallyImmunized = dataBeforeSim.cumPartiallyImmunized;
        let cumFullyImmunized = dataBeforeSim.cumFullyImmunized;
        let cumVaccineDoses = dataBeforeSim.cumVaccineDoses;
        let cumDosesByVaccine = dataBeforeSim.cumDosesByVaccine;
        let cumFirstDosesByVaccine = dataBeforeSim.cumFirstDosesByVaccine;

        const cumulativeDeliveredVaccines = this.weeklyDeliveriesScenario.get(
            cw.weekBefore(this.simulationStartWeek, 1 + this.vaccineDeliveryDelayWeeks)
        ).cumDosesByVaccine;

        // Berechne die Impfdosen auf Lager für jeden Impfstoff
        let vaccineStockPile = this.params.considerStockPile
            ? v(cumulativeDeliveredVaccines, sub, cumDosesByVaccine)
            : new Map();
        console.log('Raw vaccine Stockpile at beginning of sim', vaccineStockPile);
        // Ignore negative Vaccine stock pile
        // Negative stock pile means that the vaccine has been given faster than this.vaccineDeliveryDelayWeeks would allow
        // => as this will presumably be the same in the future, we just simply ignore negative stock pile effectively
        // adding an 'offset' to the simulation making it a bit more accurate
        vaccineStockPile = v(vaccineStockPile, Math.max, 0);
        console.log('Vaccine Stockpile at beginning of sim', vaccineStockPile);

        /** Waiting list of people to get their second shot; [0] = next week */
        const waitingFor2ndDose: VaccineNumbers[] = [];
        // 100 should be enough
        for (let i = 0; i < 100; i++) {
            waitingFor2ndDose[i] = new Map();
        }


        // Distribute people that didn't get their 2nd shot yet onto the waiting list
        {
            let pplNeeding2ndShot =  Math.floor(Math.max(0, dataBeforeSim.cumPartiallyImmunized - dataBeforeSim.cumFullyImmunized) * this.params.fractionTakingSecondDose);
            console.log('People still needing 2nd shots', pplNeeding2ndShot);


            // Forward distribution approach
            // i = weeks in the future
            let i = 0;
            while (pplNeeding2ndShot > 0 && i < 20) {
                // For every vaccine type given so far
                for (const vName of cumDosesByVaccine.keys()) {
                    let intervalWeeks = this.vaccineUsage.getVaccineIntervalWeeks(curWeek, vName);
                    let vName2nd = vName;

                    // Hardcoded for now
                    if(this.params.astra2ndToBiontech && vName === normalizeVaccineName('astra') &&
                        cw.weekAfter(curWeek, i) >= this.astra2ndToBiontechStartWeek){
                        vName2nd = normalizeVaccineName('biontech');
                        intervalWeeks = 4;
                    }


                    // Handle negative extra interval weeks here
                    if(intervalWeeks > 0 && !this.params.extraIntervalWeeksOnlyFuture && this.params.extraIntervalWeeks < 0){
                        intervalWeeks += this.params.extraIntervalWeeks;
                    }

                    if (intervalWeeks > 0 && intervalWeeks > i) {
                        // week when people of this vaccine
                        // that need their second shot in i weeks
                        // would have gotten their first shot
                        const thatWeek = this.weeklyVaccinations.get(
                            cw.weekBefore(this.simulationStartWeek, intervalWeeks - i)
                        );

                        if (thatWeek) {
                            const shots1 = thatWeek.firstDosesByVaccine.get(vName) || 0;
                            const ppl = Math.min(pplNeeding2ndShot,  Math.floor(shots1 * this.params.fractionTakingSecondDose));
                            waitingFor2ndDose[i].set(vName2nd, (waitingFor2ndDose[i].get(vName2nd) || 0) + ppl);
                            pplNeeding2ndShot -= ppl;
                        }
                    }
                }
                i++;
            }
            /* */


            // Backward distribution approach
            /*let i = 0;
            while (pplNeeding2ndShot > 0 && i <= 12) {
                const thatWeek = this.weeklyVaccinations.get(
                    cw.weekBefore(this.simulationStartWeek, i)
                );
                if(thatWeek) {
                    for (const vName of cumDosesByVaccine.keys()) {
                        const intervalWeeks = this.vaccineUsage.getVaccineIntervalWeeks(curWeek, vName);
                        if (intervalWeeks > 0 && intervalWeeks > i) {
                            const shots1 = thatWeek.firstDosesByVaccine.get(vName) || 0;
                            const ppl = Math.min(pplNeeding2ndShot, shots1);
                            const index = intervalWeeks - i - 1;
                            waitingFor2ndDose[index].set(vName, (waitingFor2ndDose[index].get(vName) || 0) + ppl);
                            pplNeeding2ndShot -= ppl;
                        }
                    }
                }
                i++;
            }
            /* */

            // Hardcoded for now:
            // Handle Astra-People wanting their 2nd shot of BioNtech NOW while originally having to wait for a lot of weeks
            // Spread them on to the next three weeks
            if(this.params.astra2ndToBiontech && cw.weekAfter(curWeek, 10) >= this.astra2ndToBiontechStartWeek){
                const weekDiff = Math.max(0, cw.weekDiff(curWeek, this.astra2ndToBiontechStartWeek));
                const vName = normalizeVaccineName('astra');
                const vName2nd = normalizeVaccineName('biontech');
                const weekBeforeChange = this.weeklyVaccinations.get(
                    cw.weekBefore(this.simulationStartWeek, Math.max(0, 5 - weekDiff))
                );
                console.log('distance for astra', Math.max(0, 5 - weekDiff));
                const astraPplWaiting = Math.max(0, weekBeforeChange.cumFirstDosesByVaccine.get(vName) * 2 - dataBeforeSim.cumDosesByVaccine.get(vName));
                console.log('Astra ppl put into next weeks', astraPplWaiting);
                const ppl = Math.min(pplNeeding2ndShot,  Math.floor(astraPplWaiting * this.params.fractionTakingSecondDose));
                waitingFor2ndDose[weekDiff].set(vName2nd, (waitingFor2ndDose[weekDiff].get(vName2nd) || 0) + ppl * 0.5);
                waitingFor2ndDose[weekDiff+1].set(vName2nd, (waitingFor2ndDose[weekDiff+1].get(vName2nd) || 0) + ppl * 0.3);
                waitingFor2ndDose[weekDiff+2].set(vName2nd, (waitingFor2ndDose[weekDiff+2].get(vName2nd) || 0) + ppl * 0.2);
                pplNeeding2ndShot -= ppl;
            }

            // If anything is left over, distribute it somewhat equally on all vaccines in the first week
            if (pplNeeding2ndShot > 0) {
                console.warn('12 weeks not enough...', pplNeeding2ndShot);
                const doses = Math.ceil(pplNeeding2ndShot / waitingFor2ndDose[0].size);
                for (const [vName, num] of waitingFor2ndDose[0]){
                    const ppl = Math.min(pplNeeding2ndShot, doses);
                    waitingFor2ndDose[0].set(vName, num + ppl);
                    pplNeeding2ndShot -= ppl;
                }
            }
            if (pplNeeding2ndShot < 0) {
                console.warn('More second shots planned than necessary!!', pplNeeding2ndShot);
            }

            // Push second vaccinations some weeks into the future
            // if the parameter for that is set
            if(!this.params.extraIntervalWeeksOnlyFuture){
                for (let i = 0; i < this.params.extraIntervalWeeks; i++) {
                    waitingFor2ndDose.unshift(new Map());
                }
            }

            console.log('waiting list at beginning of sim',
                waitingFor2ndDose.map(x => wu(x.values()).reduce(sum, 0)).reduce(sum), pplNeeding2ndShot);
            console.log([...waitingFor2ndDose]);
        }

        const numContraindicated = this.getContraIndicated();
        console.log('Contraindicated', numContraindicated);


        // # Actual Simulation for every week
        while (curWeek < this.simulationEndWeek){
            const delayedDeliveryData = this.weeklyDeliveriesScenario.get(cw.weekBefore(curWeek, this.vaccineDeliveryDelayWeeks));

            if (!delayedDeliveryData){
                console.warn('dafuq', cw.weekBefore(curWeek, this.vaccineDeliveryDelayWeeks));
                curWeek = cw.weekAfter(curWeek);
                continue;
            }

            // Add delayed delivery to available vaccines
            vaccineStockPile = vNM(vaccineStockPile, delayedDeliveryData.dosesByVaccine, sum);

            // Give as many 2nd shots as needed
            const required2ndShots = waitingFor2ndDose.shift();
            let given2ndShots = v(v(vaccineStockPile, Math.min, required2ndShots), Math.max, 0);
            if(runningWeekData){ // Never give less than the actual data shows if the first week is the running week
                given2ndShots = v(given2ndShots, Math.max,
                    v(runningWeekData.dosesByVaccine, sub, runningWeekData.firstDosesByVaccine))
            }
            // push to next week if not enough vaccine available
            waitingFor2ndDose[0] = v(
                waitingFor2ndDose[0],
                sum,
                v(required2ndShots, sub, given2ndShots)
            );

            // Remove given from stock pile
            vaccineStockPile = v(vaccineStockPile, sub, given2ndShots);

            // Give as many 1st shots as people or doses available
            let availablePeople = this.dataloader.population.data.total;
            if (this.params.considerContraindicated) {
                availablePeople -= numContraindicated;
            }
            if (this.params.considerNotWilling) {
                availablePeople *= this.params.fractionWilling;
            }
            if (this.params.considerHesitating) {
                const fractionHesitating = this.willingness.getHesitatinglyWillingOfWillingFraction();
                const hesitatingPeople = Math.floor(availablePeople * fractionHesitating);
                const ppl = Math.max(0, availablePeople - cumPartiallyImmunized);

                // People that are definitely willing to be vaccinated
                availablePeople = Math.max(0, ppl - hesitatingPeople);

                // No more willing people => vaccinations start to slow down

                // Simulation here is that you can at max vaccinate 30% of the hesitating people every week
                // availablePeople += Math.min(ppl, hesitatingPeople) * 0.3;

                // Simulation here is that the hesitating fraction is smooth from max willingness => min willingness
                // => average willingness can be calculated via triangle equation
                const maxWill = 0.5;
                const minWill = 0.1;
                const availableHesitatingPeople = Math.min(ppl, hesitatingPeople);
                const frac = availableHesitatingPeople / hesitatingPeople;
                availablePeople += Math.floor(availableHesitatingPeople *
                    ((frac * (maxWill - minWill) / 2) + minWill));
            }else{
                availablePeople = Math.max(0, availablePeople - cumPartiallyImmunized);
            }
            let availableVaccineStockPile = vaccineStockPile;
            if (this.params.keep2ndDosesBack){
                // subtract people that are still waiting for their 2nd dose
                availableVaccineStockPile = v(availableVaccineStockPile, sub,
                    v(
                        waitingFor2ndDose.reduce((a, b) => v(a, sum, b)),
                        mul, this.params.keep2ndDosesBack
                    )
                );
                // to not violate the condition after this current week, we can only give so much
                availableVaccineStockPile = v(availableVaccineStockPile, mul, 1 - (this.params.keep2ndDosesBack / 2));
            }
            // constrain given shots by available people but not less than 0
            /*const given1stShots = v(
                v(availableVaccineStockPile, Math.min, Math.floor(availablePeople / availableVaccineStockPile.size)),
                Math.max, 0);*/
            let given1stShots = new Map();
            for (const vName of this.vaccineUsage.getVaccinesPriorityList()){
                if (availableVaccineStockPile.has(vName) && this.params.vaccinesUsed.get(vName).used){
                    let availablePplForThisVac = availablePeople;

                    if(this.params.estimateWillingPerVaccine === 'constant') {
                        const willData = perVacWillingnessData.get(vName);
                        const interpolate = Math.max(0, Math.min(1, Math.pow(willData.fraction*1.5, 2)/1.5)) * 0.8
                        availablePplForThisVac = Math.min(availablePeople,
                            interpolate * willData.fraction * availableVaccineStockPile.get(vName) +
                            (1-interpolate) * willData.averageNumbers
                        );
                    }
                    else if(this.params.estimateWillingPerVaccine === 'exponential') {
                        const willData = perVacWillingnessData.get(vName);
                        const expNum = willData.exponentialNumbers * willData.exponentialFactor;
                        willData.exponentialNumbers = expNum; // propagate for next week
                        availablePplForThisVac = Math.min(availablePeople,
                            expNum
                        );
                    }

                    const shots = Math.max(0, Math.min(availableVaccineStockPile.get(vName), availablePplForThisVac));
                    given1stShots.set(vName, shots);
                    availablePeople -= shots;
                }
            }
            if(runningWeekData){ // Never give less than the actual data shows if the first week is the running week
                given1stShots = v(given1stShots, Math.max, runningWeekData.firstDosesByVaccine)
            }
            // Remove given from stock pile
            vaccineStockPile = v(vaccineStockPile, sub, given1stShots);

            let partiallyImmunized = 0;
            let fullyImmunized = wu(given2ndShots.values()).reduce(sum);

            // 1st shots go on waiting list to get their 2nd in a few weeks
            for (const [vName, num] of given1stShots.entries()) {
                let intervalWeeks = this.vaccineUsage.getVaccineIntervalWeeks(curWeek, vName);
                let vName2nd = vName;

                // Hardcoded for now
                if(this.params.astra2ndToBiontech && vName === normalizeVaccineName('astra')
                    && cw.weekAfter(curWeek, intervalWeeks) >= this.astra2ndToBiontechStartWeek){
                    vName2nd = normalizeVaccineName('biontech');
                    intervalWeeks = Math.max(4, cw.weekDiff(curWeek, this.astra2ndToBiontechStartWeek));
                }

                partiallyImmunized += num;
                if (intervalWeeks > 0) {
                    // -1 as [0] is the next week; so [5] = in 6 weeks
                    intervalWeeks += this.params.extraIntervalWeeks - 1;
                    waitingFor2ndDose[intervalWeeks].set(vName2nd,
                        (waitingFor2ndDose[intervalWeeks].get(vName2nd) || 0) + num * this.params.fractionTakingSecondDose);
                }else{
                    // This vaccine doesn't need a 2nd shot so these people are already fully immunized
                    fullyImmunized += num;
                }
            }

            const dosesByVaccine = v(given1stShots, sum, given2ndShots);
            const vaccineDoses = wu(dosesByVaccine.values()).reduce(sum);
            cumDosesByVaccine = v(cumDosesByVaccine, sum, dosesByVaccine);
            cumFirstDosesByVaccine = v(cumFirstDosesByVaccine, sum, given1stShots);
            cumPartiallyImmunized += partiallyImmunized;
            cumFullyImmunized += fullyImmunized;
            cumVaccineDoses += vaccineDoses;

            const weekData: IVaccinationWeek = {
                vaccineDoses,
                partiallyImmunized,
                fullyImmunized,
                cumVaccineDoses,
                cumPartiallyImmunized,
                cumFullyImmunized,
                dosesByVaccine,
                cumDosesByVaccine,
                firstDosesByVaccine: given1stShots,
                cumFirstDosesByVaccine,
                vaccineStockPile
            };
            results.weeklyData.set(curWeek, weekData);

            runningWeekData = null;
            curWeek = cw.weekAfter(curWeek);
        }

        console.log(results, 'Simulation Results');
        return results;
    }


    private simulateDeliveries() {
        this.weeklyDeliveriesScenario = mergeWeeklyDeliveryScenario(this.weeklyDeliveries, this.plannedDeliveries);

        // Apply delivery factors & remove deactivated vaccines
        let curWeek = cw.weekBefore(this.simulationStartWeek, this.vaccineDeliveryDelayWeeks);
        while (curWeek < this.simulationEndWeek){
            if (this.weeklyDeliveriesScenario.has(curWeek)){
                const deliveryData = this.weeklyDeliveriesScenario.get(curWeek);
                // copy data so we don't overwrite anything
                const newDeliveryData = {
                    dosesByVaccine: new Map(),
                    cumDosesByVaccine: new Map(),
                };

                for (let [vName, amount] of deliveryData.dosesByVaccine.entries()){
                    if (!this.params.vaccinesUsed.get(vName)){
                        console.warn('Unknown Vaccine; ignoring:', vName);
                        continue;
                    }
                    if (!this.params.vaccinesUsed.get(vName).used){
                        amount *= 0;
                    }
                    amount *= this.params.deliveryAmountFactor;
                    newDeliveryData.dosesByVaccine.set(vName, amount);
                }
                this.weeklyDeliveriesScenario.set(curWeek, newDeliveryData);
            }
            curWeek = cw.weekAfter(curWeek);
        }
        recalculateCumulativeWeeklyDeliveries(this.weeklyDeliveriesScenario);
    }



    private ensureWeeklyData(): boolean {
        if (!this.dataloader.allLoaded()) {
            console.warn('Cannot run simulation, some data is still missing');
            return false;
        }
        if (!this.weeklyVaccinations){
            this.weeklyVaccinations = calculateWeeklyVaccinations(this.dataloader.vaccinations);
        }
        if (!this.weeklyDeliveries){
            this.weeklyDeliveries = calculateWeeklyDeliveries(this.dataloader.deliveries);
        }
        if (!this.plannedDeliveries || this.params.deliveryScenario !== this.currentDeliveryScenario){
            this.plannedDeliveries = extractDeliveriesInfo(this.dataloader.zilabImpfsimLieferungenData, this.params.deliveryScenario);
            this.currentDeliveryScenario = this.params.deliveryScenario;
        }
        return true;
    }

    private getContraIndicated(): number {
        return wu(Object.entries(this.dataloader.population.data.by_age))
            .filter(x => parseInt(x[0], 10) < this.params.contraindicationAge)
            .map(x => x[1])
            .reduce(sum);
    }
    private addContraindicatedPartition(partitions: PopulationPartition[]): PopulationPartition[] {
        return [
            ...partitions,
            {
                id: 'contraindicated',
                description: 'Kontraindiziert',
                size: this.getContraIndicated()
            }];
    }
    private addUnwillingPartition(partitions: PopulationPartition[]): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        return [
            ...partitions,
            {
                id: 'unwilling',
                description: 'Impfunwillig',
                size: Math.floor(restPopulation * (1 - this.params.fractionWilling))
            }];
    }
}
