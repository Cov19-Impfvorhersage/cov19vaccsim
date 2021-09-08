import {VaccineNumbers} from './data-interfaces/simulation-data.interfaces';


export const sum = (x: number, y: number): number => x + y;
export const sub = (x: number, y: number): number => x - y;
export const mul = (x: number, y: number): number => x * y;

export const geq0 = (x: number): boolean => x >= 0;
export const relu = (x: number): number => Math.max(x, 0);


/**
 * Vaccine Number Math
 * Applies some math function on all the vaccines given in a and b
 * vaccines not existing in either are assumed as 0
 * @param a the first list of vaccine numbers
 * @param fun the function applied
 * @param b the second list of vaccine numbers or a number to assume for all
 */
export function vNM(a: VaccineNumbers, b: VaccineNumbers | number, fun: (a: number, b: number) => number): VaccineNumbers {
    const newNumbers = new Map();
    for (const [vName, num] of a.entries()){
        const bn = typeof b === 'number' ? b : b.get(vName) || 0;
        newNumbers.set(vName, fun(num, bn));
    }
    // also check backwards for the ones that don't exist in a
    if (b instanceof Map){
        for (const [vName, num] of b.entries()){
            if (!(newNumbers.has(vName))){
                newNumbers.set(vName, fun(0, num));
            }
        }
    }
    return newNumbers;
}
/**
 * Infix version of Vaccine Number Math
 * Applies some math function on all the vaccines given in a and b.
 * vaccines not existing in either are assumed as 0
 * @param a the first list of vaccine numbers
 * @param fun the function applied
 * @param b the second list of vaccine numbers
 * @see vNM
 */
export function v(a: VaccineNumbers, fun: (a: number, b: number) => number, b: VaccineNumbers | number ): VaccineNumbers {
    return vNM(a, b, fun);
}
