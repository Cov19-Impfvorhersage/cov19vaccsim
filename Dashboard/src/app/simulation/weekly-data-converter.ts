import * as d3 from 'd3';
import {DeliveriesData, VaccinationsData, ZilabImpfsimlieferungenDataRow} from './data-interfaces/raw-data.interfaces';
import {
    emptyDeliveryWeek,
    IVaccinationWeek,
    WeeklyDeliveryData,
    WeeklyVaccinationData
} from './data-interfaces/simulation-data.interfaces';
import {getYearWeekOfDate, weekAfter, YearWeek, yws} from './calendarweek/calendarweek';
import {normalizeVaccineName} from './data-interfaces/vaccine-names';


/**
 * Recalculates the cumulative weekly deliveries;
 * assumes an ascending order of the map.
 * Modifies the parameter in place
 */
export function recalculateCumulativeWeeklyDeliveries(weeklyDeliveries: WeeklyDeliveryData): void {
    const cumulativeDeliveries = new Map();
    // assumes increasing order
    for (const entry of weeklyDeliveries.values()) {
        for (const [vName, delivery] of entry.dosesByVaccine.entries()){
            cumulativeDeliveries.set(vName, (cumulativeDeliveries.get(vName) || 0) + delivery);
        }
        entry.cumDosesByVaccine = new Map(cumulativeDeliveries); // copy while the cumulative variable gets updated
    }
}

export function calculateWeeklyDeliveries(deliveries: d3.DSVParsedArray<DeliveriesData>): WeeklyDeliveryData {
    const weeklyDeliveries: WeeklyDeliveryData = new Map();

    // aggregate historical deliveries into weekly data
    for (const delivery of deliveries) {
        const yWeek = getYearWeekOfDate(delivery.date);
        const vName = normalizeVaccineName(delivery.impfstoff);

        // tslint:disable-next-line:no-unused-expression
        weeklyDeliveries.has(yWeek) || weeklyDeliveries.set(yWeek, emptyDeliveryWeek());
        const r = weeklyDeliveries.get(yWeek);
        r.dosesByVaccine.set(vName, (r.dosesByVaccine.get(vName) || 0) + delivery.dosen);
    }

    recalculateCumulativeWeeklyDeliveries(weeklyDeliveries);

    console.log(weeklyDeliveries, 'Weekly Vaccine Delivery Data');
    return weeklyDeliveries;
}

export function calculateWeeklyVaccinations(vaccinations: d3.DSVParsedArray<VaccinationsData>): WeeklyVaccinationData {
    const weeklyVacc: WeeklyVaccinationData = new Map();

    // accumulate historical deliveries

    let lastWeek: IVaccinationWeek;
    let currWeek: IVaccinationWeek = {
        vaccineDoses: 0,
        partiallyImmunized: 0,
        fullyImmunized: 0,
        cumVaccineDoses: 0,
        cumPartiallyImmunized: 0,
        cumFullyImmunized: 0,
        dosesByVaccine: new Map(),
        cumDosesByVaccine: new Map(),
        firstDosesByVaccine: new Map(),
        cumFirstDosesByVaccine: new Map(),
    };

    let week1stDoses = 0;
    let week2ndDoses = 0;

    function closeCurrWeek(){
        if (lastWeek) {
            currWeek.vaccineDoses = currWeek.cumVaccineDoses - lastWeek.cumVaccineDoses;
            currWeek.partiallyImmunized = currWeek.cumPartiallyImmunized - lastWeek.cumPartiallyImmunized;
            currWeek.fullyImmunized = currWeek.cumFullyImmunized - lastWeek.cumFullyImmunized;
            for (const [vacc, doses] of currWeek.cumDosesByVaccine.entries()) {
                currWeek.dosesByVaccine.set(vacc, doses - (lastWeek.cumDosesByVaccine.get(vacc) || 0));
            }
            for (const [vacc, doses] of currWeek.cumFirstDosesByVaccine.entries()) {
                currWeek.firstDosesByVaccine.set(vacc, doses - (lastWeek.cumFirstDosesByVaccine.get(vacc) || 0));
            }
        }
    }

    // assumes vaccinations are ordered
    for (const vaccDay of vaccinations) {
        const yWeek = getYearWeekOfDate(vaccDay.date);

        // new week has started => calculate differences
        if (!weeklyVacc.has(yWeek)) {
            closeCurrWeek();
            const newWeek = {
                vaccineDoses: 0,
                partiallyImmunized: 0,
                fullyImmunized: 0,
                cumVaccineDoses: currWeek.cumVaccineDoses,
                cumPartiallyImmunized: currWeek.cumPartiallyImmunized,
                cumFullyImmunized: currWeek.cumFullyImmunized,
                dosesByVaccine: new Map(),
                cumDosesByVaccine: new Map(currWeek.cumDosesByVaccine),
                firstDosesByVaccine: new Map(),
                cumFirstDosesByVaccine: new Map(currWeek.cumFirstDosesByVaccine),
            };

            if(week1stDoses + week2ndDoses !== currWeek.vaccineDoses){
                console.warn('Something wrong in weekly vaccination data (2st and 2nd doses dont sum up to vaccineDoses)', currWeek);
            }
            week1stDoses = 0;
            week2ndDoses = 0;

            lastWeek = currWeek;
            currWeek = newWeek;
            weeklyVacc.set(yWeek, newWeek);
        }

        // Set values in current week from array
        const weekData = weeklyVacc.get(yWeek);

        weekData.cumFullyImmunized = Math.max(weekData.cumFullyImmunized, vaccDay.personen_voll_kumulativ);
        weekData.cumPartiallyImmunized = Math.max(weekData.cumPartiallyImmunized, vaccDay.personen_erst_kumulativ);
        weekData.cumVaccineDoses = Math.max(weekData.cumVaccineDoses, vaccDay.dosen_kumulativ);

        weekData.cumDosesByVaccine.set(normalizeVaccineName('biontech'), vaccDay.dosen_biontech_kumulativ);
        weekData.cumDosesByVaccine.set(normalizeVaccineName('astrazeneca'), vaccDay.dosen_astra_kumulativ);
        weekData.cumDosesByVaccine.set(normalizeVaccineName('moderna'), vaccDay.dosen_moderna_kumulativ);
        weekData.cumDosesByVaccine.set(normalizeVaccineName('johnson'), vaccDay.dosen_johnson_kumulativ);
        weekData.cumFirstDosesByVaccine.set(normalizeVaccineName('biontech'), vaccDay.dosen_biontech_erst_kumulativ);
        weekData.cumFirstDosesByVaccine.set(normalizeVaccineName('astrazeneca'), vaccDay.dosen_astra_erst_kumulativ);
        weekData.cumFirstDosesByVaccine.set(normalizeVaccineName('moderna'), vaccDay.dosen_moderna_erst_kumulativ);
        //weekData.cumFirstDosesByVaccine.set(normalizeVaccineName('johnson'), vaccDay.dosen_johnson_erst_kumulativ);

        week1stDoses += vaccDay.dosen_erst_differenz_zum_vortag;
        week2ndDoses += vaccDay.dosen_zweit_differenz_zum_vortag;
        if(vaccDay.dosen_erst_differenz_zum_vortag + vaccDay.dosen_zweit_differenz_zum_vortag !== vaccDay.dosen_differenz_zum_vortag){
            console.warn('Something wrong in vaccination data (1st and 2nd doses dont sum up to total doses)', vaccDay);
        }
    }
    closeCurrWeek();

    // this.weeklyVaccinations = weeklyVacc;

    console.log(weeklyVacc, 'Weekly Vaccination Data');
    return weeklyVacc;
}


export function extractDeliveriesInfo(
        zilabImpfsimLieferungenData: ZilabImpfsimlieferungenDataRow[],
        verteilungszenario: string,
        extendUntil: YearWeek): WeeklyDeliveryData {

    const transformedData: WeeklyDeliveryData = new Map();
    let lastyWeek: YearWeek = yws([2021, 1]);
    for (const row of zilabImpfsimLieferungenData) {
        if (row.Verteilungsszenario === verteilungszenario && row.Bundesland === 'Gesamt') {
            const vName = normalizeVaccineName(row.hersteller);
            const yWeek: YearWeek = yws([2021, row.kw]);
            lastyWeek = yWeek;

            // tslint:disable-next-line:no-unused-expression
            transformedData.has(yWeek) || transformedData.set(yWeek, emptyDeliveryWeek());
            const r = transformedData.get(yWeek);
            r.dosesByVaccine.set(vName, (r.dosesByVaccine.get(vName) || 0) + row.dosen_kw);
        }
    }
    // Extend future deliveries until the current end of the simulation
    let yWeek = lastyWeek;
    while(yWeek < extendUntil){
        yWeek = weekAfter(yWeek);
        transformedData.set(yWeek, {
            dosesByVaccine: new Map(transformedData.get(lastyWeek).dosesByVaccine),
            cumDosesByVaccine: new Map(),
        });
    }

    recalculateCumulativeWeeklyDeliveries(transformedData);
    // this.plannedDeliveries = transformedData;
    console.log(transformedData, 'Vaccine Delivery Plan Data');

    return transformedData;
}

export function mergeWeeklyDeliveryScenario(historical: WeeklyDeliveryData, planned: WeeklyDeliveryData): WeeklyDeliveryData {
    const weeklyDeliveries: WeeklyDeliveryData = new Map(historical);

    // merge planned deliveries into array without overwriting
    for (const [yWeek, data] of planned.entries()){
        if (!weeklyDeliveries.has(yWeek)){
            weeklyDeliveries.set(yWeek, data);
        }
    }

    recalculateCumulativeWeeklyDeliveries(weeklyDeliveries);
    console.log(weeklyDeliveries, 'Weekly Vaccine Delivery Scenario Data');
    return weeklyDeliveries;
}
