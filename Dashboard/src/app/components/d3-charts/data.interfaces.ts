/**
 * Data series: array of (date x numeric value)
 */
export interface DataSeries {
    data: DataPoint[];
    strokeColor: string;
    strokeDasharray?: string;
    strokeDashoffset?: string;
    fillColor: string;
    fillOpacity?: number;
    fillStriped?: boolean;
    label?: string;
    hideInLegend ?: boolean;
}

export interface DataPoint {
    value: number;
    date: Date;
}

export interface DataPartition {
    label?: string;
    size: number;
    fillColor: string;
}

export interface StackedBar {
    values: {
        value: number;
        fillColor: string;
        fillOpacity?: number;
        fillStriped?: boolean;
    }[];
    dateStart: Date;
    dateEnd: Date;
}
