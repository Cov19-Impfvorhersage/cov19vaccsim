
export const vaccineNames = {
    biontech: [
        'comirnaty',
        'BNT/Pfizer'
    ],
    moderna: [
        'Moderna'
    ],
    az: [
        'AZ',
        'astra',
        'astrazeneca',
        'astra-zeneca',
    ],
    'j&j': [
        'J&J',
        'janssen',
        'johnson'
    ],
    curevac: [
        'Curevac'
    ],
    sanofi: [
        'Sanofi/GSK'
    ],
    novavax: [
        'novavax',
        'Novavax',
        'Nuvaxovid',
        'nuvaxovid',
    ]
};
const vaccineNameTranslationTable: Map<string, string> = new Map([]);

for (const v of Object.keys(vaccineNames)) {
    vaccineNameTranslationTable.set(v, v);
    for (const name of vaccineNames[v]) {
        vaccineNameTranslationTable.set(name, v);
    }
}

export function normalizeVaccineName(name: string): string {
    if (vaccineNameTranslationTable.has(name)){
        return vaccineNameTranslationTable.get(name);
    }
    console.warn('Unknown Vaccine Name!', name);
    return name;
}
