
/** YearWeek Tuple: Tuple of Year and Week number
 * cannot use this directly since Map does not support searching with Tuples... <br>
 * => default type used is the YearWeek string.
 *
 * @see ywt
 * @see yws
 * @see YearWeek
 */
export type YearWeekTuple = [
    year: number,
    week: number
];
/** YearWeek String: Year and Week number in a string of format "YYYY/WW" <br>
 * => can be sorted alphabetically and comparisons (=, &gt;, &lt;) work fine
 *
 * @see ywt
 * @see yws
 * @see YearWeekTuple
 */
export type YearWeek = string;

/**
 * Makes a YearWeek String from a YearWeekTuple
 */
export function yws(yw: YearWeekTuple): YearWeek {
    const [y, w] = yw;
    // String with fixed numerals so comparisons work
    return y + '/' + w.toLocaleString( 'en-US', {
        minimumIntegerDigits: 2,
        useGrouping: false
    });
}
/**
 * Makes a YearWeekTuple from a YearWeek String
 */
export function ywt(yw: YearWeek): YearWeekTuple {
    const [y, w] = yw.split('/');
    return [parseInt(y, 10), parseInt(w, 10)];
}

/**
 * Returns Year and Week in Year for a given date
 * Source: https://stackoverflow.com/a/6117889
 */
export function getYearWeekOfDate(d: Date, offset_days: number = 0): YearWeek {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + offset_days);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    // @ts-ignore
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
    return yws([d.getUTCFullYear(), weekNo]);
}

/**
 * Get the date of a day in the given week
 * @param yw The YearWeek in which the day should lie
 * @param weekday The day in the week; 1 = Monday, 7 = Sunday; 8 = Monday of the following week
 */
export function getWeekdayInYearWeek(yw: YearWeek, weekday: number): Date {
    const [year, week] = ywt(yw);
    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dow = d.getUTCDay();
    if (dow <= 4) {
        d.setDate(d.getDate() - d.getUTCDay() + weekday);
    }
    else {
        d.setDate(d.getDate() - d.getUTCDay() + 7 + weekday);
    }
    return d;
}

/**
 * Returns the week <weeks> after the given week
 */
export function weekAfter(yw: YearWeek, weeks: number = 1): YearWeek {
    return getYearWeekOfDate(getWeekdayInYearWeek(yw, 1 + 7 * weeks));
}
/**
 * Returns the week <weeks> before the given week
 */
export function weekBefore(yw: YearWeek, weeks: number = 1): YearWeek {
    return getYearWeekOfDate(getWeekdayInYearWeek(yw, 1 - 7 * weeks));
}

/**
 * Returns the number of weeks difference of yw1 and yw2 (yw2 - yw1)
 */
export function weekDiff(yw1: YearWeek, yw2: YearWeek): number {
    return Math.floor((getWeekdayInYearWeek(yw2, 2).getTime() - getWeekdayInYearWeek(yw1, 1).getTime())
        / (1000 * 60 * 60 * 24 * 7)); // Rounding errors
}
