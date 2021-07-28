import { TestBed } from '@angular/core/testing';
import * as cw from './calendarweek';


describe('Calendarweek', () => {
    const firstWeek2021: cw.YearWeek = cw.getYearWeekOfDate(new Date(Date.UTC(2021, 0, 4)));
    const tenthWeek2021: cw.YearWeek = cw.getYearWeekOfDate(new Date(Date.UTC(2021, 2, 10)));
    const lastWeek2020: cw.YearWeek = cw.getYearWeekOfDate(new Date(Date.UTC(2021, 0, 1)));

    it('should be correct', () => {
        let yWeekT = cw.ywt(firstWeek2021);
        expect(yWeekT[0]).toBe(2021);
        expect(yWeekT[1]).toBe(1);

        yWeekT = cw.ywt(tenthWeek2021);
        expect(yWeekT[0]).toBe(2021);
        expect(yWeekT[1]).toBe(10);

        yWeekT = cw.ywt(lastWeek2020);
        expect(yWeekT[0]).toBe(2020);
        expect(yWeekT[1]).toBe(53);

        const lastWeek2020Alt: cw.YearWeek = cw.getYearWeekOfDate(new Date(Date.UTC(2020, 11, 30)));
        expect(lastWeek2020Alt).toEqual(lastWeek2020);
    });
    it('should convert back and forth correctly', () => {
        const date = cw.getWeekdayInYearWeek(firstWeek2021, 1);
        const newYWeek = cw.getYearWeekOfDate(date);
        expect(newYWeek).toEqual(firstWeek2021);
    });
    it('should have correct week boundaries', () => {
        let date = cw.getWeekdayInYearWeek(firstWeek2021, 0);
        let newYWeek = cw.getYearWeekOfDate(date);
        expect(newYWeek).not.toEqual(firstWeek2021);

        for (let i = 1; i <= 7; i++) {
            date = cw.getWeekdayInYearWeek(firstWeek2021, i);
            newYWeek = cw.getYearWeekOfDate(date);
            expect(newYWeek).toEqual(firstWeek2021);
        }

        date = cw.getWeekdayInYearWeek(firstWeek2021, 8);
        newYWeek = cw.getYearWeekOfDate(date);
        expect(newYWeek).not.toEqual(firstWeek2021);
    });

    it('should increment and decrement correctly', () => {
        let date = cw.getWeekdayInYearWeek(tenthWeek2021, 0);
        let newYWeek = cw.getYearWeekOfDate(date);

        const yWeekBefore = cw.weekBefore(tenthWeek2021);
        let yWeekT = cw.ywt(yWeekBefore);
        expect(yWeekBefore).toEqual(newYWeek);
        expect(yWeekT[0]).toEqual(2021);
        expect(yWeekT[1]).toEqual(9);

        date = cw.getWeekdayInYearWeek(tenthWeek2021, 8);
        newYWeek = cw.getYearWeekOfDate(date);

        const yWeekAfter = cw.weekAfter(tenthWeek2021);
        yWeekT = cw.ywt(yWeekAfter);
        expect(yWeekAfter).toEqual(newYWeek);
        expect(yWeekT[0]).toEqual(2021);
        expect(yWeekT[1]).toEqual(11);
    });

    it('should increment and decrement over year boundaries correctly', () => {
        const yWeekBefore = cw.weekBefore(firstWeek2021);
        let yWeekT = cw.ywt(yWeekBefore);
        expect(yWeekBefore).toEqual(lastWeek2020);
        expect(yWeekT[0]).toEqual(2020);
        expect(yWeekT[1]).toEqual(53);

        const yWeekAfter = cw.weekAfter(lastWeek2020);
        yWeekT = cw.ywt(yWeekAfter);
        expect(yWeekAfter).toEqual(firstWeek2021);
        expect(yWeekT[0]).toEqual(2021);
        expect(yWeekT[1]).toEqual(1);
    });

    it('should calculate differences correctly', () => {
        const yWeekAfter = cw.weekAfter(tenthWeek2021);
        const y5WeekAfter = cw.weekAfter(tenthWeek2021, 5);
        expect(cw.weekDiff(tenthWeek2021, tenthWeek2021)).toEqual(0);
        expect(cw.weekDiff(tenthWeek2021, yWeekAfter)).toEqual(1);
        expect(cw.weekDiff(tenthWeek2021, y5WeekAfter)).toEqual(5);
        expect(cw.weekDiff(yWeekAfter, tenthWeek2021)).toEqual(-1);

        expect(cw.weekDiff(firstWeek2021, tenthWeek2021)).toEqual(9);
    });

    it('should calculate differences over year boundaries correctly', () => {
        expect(cw.weekDiff(lastWeek2020, firstWeek2021)).toEqual(1);
        expect(cw.weekDiff(lastWeek2020, tenthWeek2021)).toEqual(10);
    });
});
