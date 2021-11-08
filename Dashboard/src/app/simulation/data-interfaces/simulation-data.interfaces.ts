import {YearWeek} from '../calendarweek/calendarweek';


export type VaccineNumbers = Map<string, number>;

export interface ISimulationResults {
    weeklyData: Map<YearWeek, IVaccinationWeek>;
}

export type WeeklyVaccinationData = Map<YearWeek, IVaccinationWeek>;
export interface IVaccinationWeek {
    vaccineDoses: number;
    partiallyImmunized: number;
    fullyImmunized: number;
    boosterImmunized: number;
    cumVaccineDoses: number;
    cumPartiallyImmunized: number;
    cumFullyImmunized: number;
    cumBoosterImmunized: number;
    dosesByVaccine?: VaccineNumbers;
    cumDosesByVaccine?: VaccineNumbers;
    firstDosesByVaccine?: VaccineNumbers;
    cumFirstDosesByVaccine?: VaccineNumbers;
    boosterDosesByVaccine?: VaccineNumbers;
    cumBoosterDosesByVaccine?: VaccineNumbers;
    vaccineStockPile ?: VaccineNumbers;
}

export type WeeklyDeliveryData = Map<YearWeek, IDeliveryWeek>;
export interface IDeliveryWeek {
    dosesByVaccine: VaccineNumbers;
    cumDosesByVaccine: VaccineNumbers;
}
export function emptyDeliveryWeek(): IDeliveryWeek {
    return {
        dosesByVaccine: new Map(),
        cumDosesByVaccine: new Map(),
    };
}
