import {ISimulationParameters} from './simulation';
import {DataloaderService} from '../services/dataloader.service';
import {sum} from './vaccine-map-helper';



export interface PopulationPartition {
    id: string;
    description: string;
    size: number;
}

// tslint:disable-next-line:no-empty-interface
export interface PopulationPartitioner {
    addPartitions(partitions: PopulationPartition[]): PopulationPartition[];
}

export interface VaccinationWillingnessPartitioner extends PopulationPartitioner {
    getUnwillingFraction(): number;
    getHesitatinglyWillingFraction(): number;
    getHesitatinglyWillingOfWillingFraction(): number;
    getUnwillingPartition(): PopulationPartition[];
    addUnwillingPartition(partitions: PopulationPartition[]): PopulationPartition[];
}

export class CosmoVaccinationWillingnessPartitioner implements VaccinationWillingnessPartitioner {
    constructor(
        private dataloader: DataloaderService) {
    }
    public cosmoDate: string = '2021-06-15';

    getAvailableSurveys(): string[] {

        // Sanity check
        for (const [entry, data] of Object.entries(this.dataloader.vaccinationWillingness.data)){
            let sum = 0;
            for(const p of Object.values(data.prozente)){
                sum += p;
            }
            if( sum !== 1) {
                console.warn('COSMO Data for ', entry, ' does not sum up to 1! ', sum, data);
            }
        }

        return Object.keys(this.dataloader.vaccinationWillingness.data);
    }

    getUnwillingFraction(): number {
        const cosmoData = this.dataloader.vaccinationWillingness.data[this.cosmoDate].prozente;
        return cosmoData['2'] + cosmoData['1'];
    }

    getHesitatinglyWillingFraction(): number {
        const cosmoData = this.dataloader.vaccinationWillingness.data[this.cosmoDate].prozente;
        return cosmoData['4'] + cosmoData['3'];
    }

    /** Returns the fraction of the people willing to get vaccinated that only hesitantly does so */
    getHesitatinglyWillingOfWillingFraction(): number {
        const unwillingFraction = this.getUnwillingFraction();
        const ratherUnwillingFraction = this.getHesitatinglyWillingFraction();
        return ratherUnwillingFraction / (1 - unwillingFraction);
    }

    getUnwillingPartition(): PopulationPartition[] {
        const population = this.dataloader.population.data.total;

        return [{
            id: 'unwilling',
            description: 'Impfunwillige ()',
            size: Math.floor(population * this.getUnwillingFraction())
        }];
    }

    addUnwillingPartition(partitions: PopulationPartition[]): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        return [
            ...partitions,
            {
                id: 'unwilling',
                description: 'Impfunwillig (1,2)',
                size: Math.floor(restPopulation * this.getUnwillingFraction())
            }];
    }

    addPartitions(partitions: PopulationPartition[], excludingUnwilling = true): PopulationPartition[] {
        if (!excludingUnwilling){
            partitions = this.addUnwillingPartition(partitions);
        }

        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        // partition based on the latest data of COSMO
        const cosmoData = this.dataloader.vaccinationWillingness.data[this.cosmoDate].prozente;

        const factor =  1 / (1 - this.getUnwillingFraction());

        return [
            ...partitions,
            {
                id: 'willing_3',
                description: 'Eher impfunwillig (3,4)',
                size: Math.floor(restPopulation * (cosmoData['4'] + cosmoData['3']) * factor),
            },
            {
                id: 'willing_2',
                description: 'Eher impfwillig (5,6)',
                size: Math.floor(restPopulation * (cosmoData['6'] + cosmoData['5']) * factor),
            },
            {
                id: 'willing',
                description: 'Impfwillig (7)',
                size: Math.floor(restPopulation * (cosmoData['7']) * factor),
            }];
    }

    /*partitionPopulation(){
        // partition based on the latest data of COSMO
        const cosmoData = this.dataloader.vaccinationWillingness.data[this.cosmoDate].prozente;

        const population = this.dataloader.population.data.total;

        return {
            impfbereit: cosmoData['7'] + cosmoData['6'],
            'eher impfbereit': cosmoData['5'] + cosmoData['4'],
            'eher nicht impfbereit': cosmoData['3'],
            'nicht impfbereit': cosmoData['2'] + cosmoData['1'],
        };
    }*/
}


export abstract class PriorityPartitioner implements PopulationPartitioner {
    constructor(
        private dataloader: DataloaderService) {
    }

    protected priorityType = '';

    addPartitions(partitions: PopulationPartition[]): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        let restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        // Assume equal distribution of unwilling on all population groups
        // (not correct, but first approximation)
        const unwilling = partitions.filter(x => x.id == 'unwilling').map(x => x.size).reduce(sum, 0);
        const willingnessFactor = 1 - (unwilling / (restPopulation + unwilling));

        const parts = [];
        const prioGroups = this.dataloader.priorities.data[this.priorityType].gruppen;

        for (const [name, group] of Object.entries(prioGroups)){
            const num = Math.min(restPopulation, group) * willingnessFactor;
            parts.unshift({
                id: 'prio_'+name,
                description: name,
                size: num,
            });
            restPopulation -= num;
        }

        console.log('Prio '+this.priorityType+' rest', restPopulation);

        return [
            ...partitions,
            {
                id: 'rest',
                description: 'Rest',
                size: restPopulation,
            },
            ...parts];
    }
}

export class RKIPriorityPartitioner extends PriorityPartitioner {
    priorityType = 'rki';
}

export class DecreePriorityPartitioner extends PriorityPartitioner {
    priorityType = 'verordnung';
}

export class AgePartitioner implements PopulationPartitioner {
    constructor(
        private dataloader: DataloaderService) {
    }

    protected groupEveryYears = 10;

    addPartitions(partitions: PopulationPartition[]): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        let restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        // Assume equal distribution of unwilling on all population groups
        // (not correct, but first approximation)
        const unwilling = partitions.filter(x => x.id == 'unwilling').map(x => x.size).reduce(sum, 0);
        const willingnessFactor = 1 - (unwilling / (restPopulation + unwilling));

        const parts = [];
        let group = 0;
        let groupStart = '';
        const ages = Object.entries(this.dataloader.population.data.by_age);
        for (const [age, n] of ages.reverse()){
            group += n;
            if (parseInt(age, 10) % this.groupEveryYears == 0){
                const num = Math.min(restPopulation, Math.floor(group * willingnessFactor));
                parts.unshift({
                    id: age,
                    description: (groupStart ? age+' - '+groupStart : age),
                    size: num,
                });
                restPopulation -= num;

                // reset accumulators
                group = 0;
                groupStart = '';
            }
            else if(!groupStart) {
                groupStart = age;
            }
        }

        return [
            ...partitions,
            ...parts];
    }

}
