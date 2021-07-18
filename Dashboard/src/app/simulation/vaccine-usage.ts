import {YearWeek} from './calendarweek/calendarweek';
import {DataloaderService} from '../services/dataloader.service';
import {normalizeVaccineName, vaccineNames} from './data-interfaces/vaccine-names';
import {IVaccineUsageData} from "./data-interfaces/raw-data.interfaces";


export class VaccineUsage {
    constructor(
        private dataloader: DataloaderService) {
    }

    vaccineData: Map<string, IVaccineUsageData>;

    /**
     * Makes sure all internal variables is calculated.
     * Call once the dataloader passed in the constructor has finished loading
     */
    calculateData(): void {
        if (!this.dataloader.allLoaded()){
            return;
        }
        this.vaccineData = new Map();
        const data = this.dataloader.vaccineUsage;
        for (const vaccine of data.data){
            this.vaccineData.set(normalizeVaccineName(vaccine.name), vaccine);
        }
        console.log(this.vaccineData);
    }

    getVaccineIntervalWeeks(week: YearWeek, vName: string): number {
        // TODO: currently static
        const vacSpecialIntervals = {
            az: 12,
            'j&j': 0
        };
        return (vName in vacSpecialIntervals) ? vacSpecialIntervals[vName] : 5;
    }

    isVaccineUsed(week: YearWeek, vName: string): boolean {
        // TODO: actually check usage
        return !!this.vaccineData.get(vName).timeline;
    }

    getVaccineDisplayName(vName: string): string {
        if(this.vaccineData.has(vName)){
            return this.vaccineData.get(vName).displayName;
        }
        return vName;
    }

    getVaccinesPriorityList(): string[] {
        return [...this.vaccineData.keys()];
    }
}
