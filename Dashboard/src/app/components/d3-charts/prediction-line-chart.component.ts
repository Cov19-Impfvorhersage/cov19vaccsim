import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';
import { DataPartition, DataPoint, DataSeries, StackedBar } from './data.interfaces';

export interface PredictionLineChartConfig {
    yAxisLabel: string;
    fillOpacity?: number;
    yAxisScaleFactor?: number;
    yAxisPercent?: boolean;
}

export interface PredictionLineChartData {
    yMin: number;
    yMax: number;
    series: DataSeries[];
    partitions: DataPartition[];
    stackedBars?: StackedBar[];
}

interface PartitionMinMax {
    label?: string;
    min: number;
    max: number;
    fillColor: string;
    labelBBox?: any;
}

interface ColorRect {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor: string;
    fillOpacity?: number;
    fillStriped?: boolean;
}

interface PredictionLineChartCoords {
    margin: { top: number, right: number, bottom: number, left: number };
    rightBarWidth: number;
    rightBarGap: number;
    rightBarX: number;
    yScale: d3.ScaleLinear<number, number>;
    xScale: d3.ScaleTime<number, number>;
    scaledYScale: d3.ScaleLinear<number, number>;
    minValue: number;
}

export interface TooltipUpdate {
    showTooltip: boolean;
    mouseEvent: MouseEvent;
    hoveredDate: Date;
    coords: PredictionLineChartCoords;
    svgClientRect: DOMRect;
}

type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

@Component({
    selector: 'app-prediction-line-chart',
    templateUrl: 'chart-base/chart-base.directive.html',
    styleUrls: ['chart-base/chart-base.directive.scss'],
})
export class PredictionLineChartComponent extends ChartBase<PredictionLineChartConfig, PredictionLineChartData> {

    private defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
    private xAxis: SvgGroup;
    private yAxis: SvgGroup;
    private stackedBars: SvgGroup;
    private lines: SvgGroup;
    private fills: SvgGroup;
    private xGrid: SvgGroup;
    private xGridMajor: SvgGroup;
    private yGrid: SvgGroup;
    private yGridMinor: SvgGroup;
    private rightBar: SvgGroup;
    private rightBarBoxes: SvgGroup;
    private rightBarLabels: SvgGroup;
    private legend: SvgGroup;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private tooltipDots: SvgGroup;

    initialChartConfig(): PredictionLineChartConfig {
        return {
            yAxisLabel: 'yAxisLabel',
            fillOpacity: 0.5,
        };
    }

    initializeChart(): void {
        this.defs = this.svg.append('defs');
        this.defineStripedMaskPattern();

        this.fills = this.svg.append('g').classed('fills', true);
        this.xGrid = this.svg.append('g').classed('grid', true);
        this.xGridMajor = this.svg.append('g').classed('grid-major', true);
        this.yGrid = this.svg.append('g').classed('grid', true);
        this.yGridMinor = this.svg.append('g').classed('grid-minor', true);
        this.stackedBars = this.svg.append('g').classed('stacked-bars', true);
        this.lines = this.svg.append('g').classed('lines', true);
        this.rightBar = this.svg.append('g').classed('right-bar', true);
        this.rightBarBoxes = this.rightBar.append('g').classed('boxes', true);
        this.rightBarLabels = this.rightBar.append('g').classed('labels', true);
        this.xAxis = this.svg.append('g').classed('x-axis', true);
        this.yAxis = this.svg.append('g').classed('y-axis', true);
        this.legend = this.svg.append('g').classed('legend', true);
        this.tooltip = d3.select(this.chartContainerRef.nativeElement).append('div');
        this.tooltip
            .style('position', 'fixed')
            .style('width', '300px')
            .style('background', 'rgba(255,255,255,0.3)')
            .style('border-radius', '5px')
            .style('padding', '5px')
            .style('pointer-events', 'none')
            .style('transition', 'opacity 200ms ease');
        this.tooltipDots = this.svg.append('g').classed('tooltip-dots', true);
    }

    updateChart(): void {
        const coords = this.getCoords();
        this.renderAreas(coords, this.data.series);
        this.renderStackedBars(coords, this.data.stackedBars);
        this.renderAxis(coords);
        if (this.data.partitions) {
            this.renderRightBar(coords, this.data.partitions);
        }
        this.renderLegend(coords, this.data.series);
        this.updateMouseEventListeners(coords);
    }

    private defineStripedMaskPattern(): void {
        const stripeWidth = 2.5;
        this.defs.append('pattern')
            .attr('id', 'stripes')
            .attr('width', 2 * stripeWidth)
            .attr('height', 2 * stripeWidth)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('stroke', 'white')
            .attr('stroke-linecap', 'square')
            .attr('stroke-width', stripeWidth * 0.8)
            .call(el => {
                el.append('rect')
                    .attr('x', -1)
                    .attr('y', -1)
                    .attr('width', 2 * stripeWidth + 2)
                    .attr('height', 2 * stripeWidth + 2)
                    .attr('stroke-width', 0)
                    .attr('fill', 'white')
                    .attr('opacity', 0.3);
                el.append('line')
                    .attr('x1', 0)
                    .attr('y1', stripeWidth)
                    .attr('x2', stripeWidth)
                    .attr('y2', 0);
                el.append('line')
                    .attr('x1', stripeWidth)
                    .attr('y1', 2 * stripeWidth)
                    .attr('x2', 2 * stripeWidth)
                    .attr('y2', stripeWidth);
            });
        this.defs.append('mask')
            .attr('id', 'stripes-mask')
            .call(el => {
                el.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .style('fill', 'url(#stripes)');
            });
    }

    private getCoords(): PredictionLineChartCoords {
        const margin = {top: 10, right: 2, bottom: 30, left: 2};

        // dynamic rightBarWidth to maintain a nice aspect ratio of the bar
        // while also not using too much screen estate
        const rightBarWidth = Math.min(this.chartSize.width / 10, this.chartSize.height / 8);
        const rightBarGap = 0;
        const series = this.data.series;
        const rightBarX = this.chartSize.width - margin.right - rightBarWidth;
        const minValue = d3.min(series.map(s => d3.min(s.data.map(point => point.value))));
        const maxDate = d3.max(series.map(s => d3.max(s.data.map(point => point.date))));
        const minDate = d3.min(series.map(s => d3.min(s.data.map(point => point.date))));

        const yScale = d3
            .scaleLinear()
            .domain([this.data.yMin, this.data.yMax])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const scaleFactor = this.config.yAxisScaleFactor ?? 1;
        const scaledYScale = d3
            .scaleLinear()
            .domain([this.data.yMin * scaleFactor, this.data.yMax * scaleFactor])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const xScale = d3
            .scaleTime()
            .domain([minDate, maxDate])
            .range([margin.left, rightBarX - rightBarGap]);

        return {
            margin,
            rightBarWidth,
            rightBarGap,
            rightBarX,
            xScale,
            yScale,
            scaledYScale,
            minValue,
        };
    }

    private renderAreas(coords: PredictionLineChartCoords, series: DataSeries[]): void {
        const lineGenerator: d3.Line<DataPoint> = d3
            .line<DataPoint>()
            .defined((d) => d != null && d.value != null)
            .x((d) => coords.xScale(d.date))
            .y((d) => coords.yScale(d.value));

        this.lines
            .selectAll('path')
            .data(series)
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', s => s.strokeColor)
            .attr('stroke-width', '2')
            .attr('stroke-dasharray', s => s.strokeDasharray || null)
            .attr('stroke-dashoffset', s => s.strokeDashoffset || null)
            .attr('d', (d) => lineGenerator(d.data));

        this.fills
            .selectAll('path')
            .data(series.map(s => this.addFirstAndLastMinPoints(s, coords.minValue)))
            .join('path')
            .attr('fill', s => s.fillColor)
            .attr('stroke', 'none')
            .attr('opacity', s => s.fillOpacity ?? this.config.fillOpacity)
            .style('mask', s => (s.fillStriped ?? false) ? 'url(#stripes-mask)' : '')
            .attr('d', (d) => lineGenerator(d.data));
    }

    private renderStackedBars(coords: PredictionLineChartCoords, bars: StackedBar[]): void {
        if (!bars) {
            return;
        }
        const rects: ColorRect[] = bars.flatMap(group => {
            const x = coords.xScale(group.dateStart);
            const width = coords.xScale(group.dateEnd) - x;
            const groupRects: ColorRect[] = [];
            let min = 0;
            for (const value of group.values) {
                const max = min + value.value;
                const y = coords.yScale(max);
                const height = coords.yScale(min) - y;
                min = max;
                groupRects.push({x, y, width, height,
                    fillColor: value.fillColor,
                    fillStriped: value.fillStriped,
                    fillOpacity: value.fillOpacity});
            }
            return groupRects;
        });

        this.stackedBars
            .selectAll('rect')
            .data(rects)
            .join('rect')
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d => d.width)
            .attr('height', d => d.height)
            .attr('fill', d => d.fillColor)
            .attr('opacity', d => d.fillOpacity ?? this.config.fillOpacity)
            .style('mask', d => (d.fillStriped ?? false) ? 'url(#stripes-mask)' : '');

    }

    private renderAxis(coords: PredictionLineChartCoords): void {
        this.yGrid
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.scaledYScale)
                .ticks(10)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(d3.format(this.config.yAxisPercent ? '~%' : '~s'))
            );
        this.yGrid.selectAll('.domain').remove();
        // y axis: change number positioning
        this.yGrid
            .selectAll('text')
            .attr('dx', coords.xScale(Date.UTC(2021, 0, 1)) + 4)
            .attr('dy', -4)
            .attr('text-anchor', 'start');

        this.yGridMinor
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.scaledYScale)
                .ticks(20)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(_ => '')
            );
        this.yGridMinor.selectAll('.domain').remove();


        // Not enough space => shorten labels
        const smallXAxis = this.chartSize.width < 550;

        this.xAxis
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(
                d3
                    .axisBottom<Date>(coords.xScale)
                    .ticks(d3.timeMonday)
                    .tickSize(-5)
                    .tickSizeOuter(0)
                    .tickPadding(5)
                    .tickFormat(date => smallXAxis ? '' : date.toLocaleString('default', {
                        day: 'numeric',
                    }))
            )
            .attr('font-size', '9');

        this.xGrid
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(d3
                .axisBottom<Date>(coords.xScale)
                .ticks(d3.timeMonth)
                .tickSize(-(this.chartSize.height - coords.margin.top - coords.margin.bottom))
                .tickSizeOuter(0)
                .tickPadding(smallXAxis ? 5 : 15)
                .tickFormat(date => date.toLocaleString('default', {
                    month: smallXAxis ? 'short' : 'long',
                }))
            );

        this.xGridMajor
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(d3
                .axisBottom<Date>(coords.xScale)
                .ticks(d3.timeYear)
                .tickSize(-(this.chartSize.height - coords.margin.top - coords.margin.bottom))
                .tickSizeOuter(0)
                .tickPadding(smallXAxis ? 5 : 15)
                .tickFormat(_ => '')
                // .tickFormat(date => date.toLocaleString('default', {
                //     year: 'numeric',
                // }))
            );

        this.xGrid.selectAll('.domain').remove();
        this.xGridMajor.selectAll('.domain').remove();

        // Month labels alignment
        this.xGrid
            .selectAll('text')
            .attr('dx', 5)
            .attr('text-anchor', 'start');

        // Year labels alignment
        this.xGridMajor
            .selectAll('text')
            .attr('dx', 5)
            .attr('text-anchor', 'start');

        // y label
        this.yAxis
            .selectAll('text.axis-label')
            .data([this.config.yAxisLabel])
            .join('text')
            .classed('axis-label', true)
            .attr('x', 35)
            .attr('y', 15)
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('fill', 'black')
            .attr('text-anchor', 'start')
            .attr('font-weight', 'bold')
            .text(d => d);

    }

    private renderLegend(coords: PredictionLineChartCoords, series: DataSeries[]): void {
        const legendEntries = series.filter(s =>
            !!s.label && !s.hideInLegend
        );
        const padding = 10;

        // legend in general (position, visibility)
        this.legend
            .attr('transform', 'translate(' + (coords.xScale(Date.UTC(2021, 0, 1)) * 1.5 + 30) + ', 35)')
            .attr('opacity', legendEntries.length > 0 ? 1 : 0);

        // 0.5 movements are to make sure that the border lies exactly on a pixel and can be rendered nicely

        // background box
        this.legend
            .selectAll('rect.legend-background')
            .data([0])
            .join('rect')
            .classed('legend-background', true)
            .attr('x', -0.5)
            .attr('y', -0.5)
            .attr('width', 200)
            .attr('height', legendEntries.length * 20 + padding + padding - 8)
            .attr('rx', 3)
            .attr('fill', 'white')
            .attr('stroke', '#777')
            .attr('stroke-width', 1);

        let maxTextWidth = -1;
        // legend entries
        this.legend
            .selectAll('g.legend-entry')
            .data(legendEntries)
            .join(enter => {
                const lGroup = enter.append('g');
                lGroup
                    .classed('legend-entry', true)
                    .attr('transform', (d, i) => `translate(${padding}, ${i * 20 + padding})`);
                lGroup
                    .append('rect')
                    .attr('x', d => d.fillOpacity === 0 ? 0.5 : -0.5)
                    .attr('y', d => d.fillOpacity === 0 ? 5.5 : -0.5)
                    .attr('width', d => d.fillOpacity === 0 ? 9 : 10)
                    .attr('height', d => d.fillOpacity === 0 ? 1 : 10)
                    .attr('fill', d => d.fillColor)
                    .attr('stroke', d => d.strokeColor)
                    .attr('stroke-width', d => d.fillOpacity === 0 ? 1 : 1)
                    .attr('fill-opacity', d => d.fillOpacity ?? this.config.fillOpacity);
                // todo set font size etc
                const textEls = lGroup
                    .append('text')
                    .attr('x', 15)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .attr('font-size', '14')
                    .text(d => d.label).nodes();
                for (const el of textEls) {
                    maxTextWidth = Math.max(maxTextWidth, el.getBBox().width + 15);
                }
                return lGroup;
            }, update => {
                update.select('rect')
                    .attr('fill', d => d.fillColor)
                    .attr('stroke', d => d.strokeColor);
                const textEls = update.select('text')
                    .text(d => d.label).nodes();
                for (const el of textEls) {
                    // @ts-ignore
                    maxTextWidth = Math.max(maxTextWidth, el.getBBox().width + 15);
                }
                return update;
            }, exit => {
                exit.remove();
            });
        if (maxTextWidth > 0) {
            this.legend
                .selectAll('rect.legend-background')
                .attr('width', maxTextWidth + padding * 2);
        }
    }

    private renderRightBar(coords: PredictionLineChartCoords, partitions: DataPartition[]): void {
        const mappedParts = this.mapPartitions(partitions);

        this.rightBarBoxes
            .selectAll('rect')
            .data(mappedParts)
            .join('rect')
            .attr('x', coords.rightBarX)
            .attr('y', p => coords.yScale(p.max))
            .attr('width', coords.rightBarWidth)
            .attr('height', p => coords.yScale(p.min) - coords.yScale(p.max))
            .attr('fill', p => p.fillColor);

        this.rightBarLabels.attr('font-size', '12');
        this.rightBarLabels
            .selectAll('g')
            .data(mappedParts)
            .join(
                enter => {
                    // group with rect behind a text
                    const g = enter.append('g');
                    g.append('rect');
                    g.append('text');
                    return g;
                },
                update => update,
                exit => exit.remove(),
            )
            .each((p, index, groups) => {
                // in each group, update the text label
                const g = d3.select(groups[index]);
                const text = g.select<SVGTextElement>('text');
                text
                    .attr('x', coords.rightBarX)
                    .attr('y', coords.yScale((p.max + p.min) / 2))
                    .attr('dy', '0.3em')
                    .attr('dx', coords.rightBarWidth / 2 - 3)
                    .attr('text-anchor', 'end')
                    .text(p.max - p.min > 5 ? p.label : '');
                // position rect background
                const bBox = text.node().getBBox();
                const rect = g.select<SVGRectElement>('rect');
                rect
                    .attr('x', bBox.x - 3)
                    .attr('y', bBox.y)
                    .attr('width', bBox.width + 6)
                    .attr('height', bBox.height)
                    .style('fill', 'white')
                    .attr('opacity', 0.8)
                    .attr('rx', 2)
                    .attr('ry', 2);
            });

        // No gap => draw line instead
        if (mappedParts.length && coords.rightBarGap <= 0) {
            this.rightBar.selectAll('line')
                .data([0])
                .join(el => el.insert('line', 'g.labels'))
                .attr('transform', `translate(${coords.rightBarX}, ${coords.margin.top})`)
                .attr('y2', (this.chartSize.height - coords.margin.top - coords.margin.bottom))
                .attr('stroke', '#444')
                .attr('shape-rendering', 'crispEdges');
        }
    }

    private updateMouseEventListeners(coords: PredictionLineChartCoords): void {
        this.svg
            .on('mouseenter', (e) => {
                this.updateTooltip(coords, e, true);
            })
            .on('mousemove', (e) => {
                this.updateTooltip(coords, e, true);
            })
            .on('mouseleave', (e) => {
                this.updateTooltip(coords, e, false);
            });
    }

    private updateTooltip(coords: PredictionLineChartCoords, mouseEvent: MouseEvent, show: boolean): void {
        const svgClientRect = this.svg.node().getBoundingClientRect();
        // transform coords
        const chartX = mouseEvent.clientX - svgClientRect.x;
        const chartY = mouseEvent.clientY - svgClientRect.y;
        const hoveredDate = coords.xScale.invert(chartX);
        const hoveredValue = coords.yScale.invert(chartY);
        const domainX = coords.xScale.domain();
        const domainY = coords.yScale.domain();
        const xValid = hoveredDate >= domainX[0] && hoveredDate <= domainX[1];
        const yValid = hoveredValue >= domainY[0] && hoveredValue <= domainY[1];
        const showTooltip = this.data && show && xValid && yValid;
        /*
        // optionally, round date to the nearest day
        hoveredDate.setHours( hoveredDate.getHours() > 12 ? 24 : 0);
        hoveredDate.setMinutes(0);
        hoveredDate.setSeconds(0);
        hoveredDate.setMilliseconds(0);
        */

        this.tooltip
            .style('opacity', showTooltip ? 1 : 0)
            .style('left', mouseEvent.clientX + 15 + 'px')
            .style('top', mouseEvent.clientY + 15 + 'px');
        if (!showTooltip) {
            this.tooltip.style('opacity', 0);
            this.tooltipDots.selectAll('circle').data([]).join('circle');
            return;
        }

        // fill the tooltip with data
        const tooltipData: Array<{
            // adapt if necessary
            label: string;
            value: string;
        }> = [];

        // dots to indicate where the data in the tooltip comes from
        const tooltipDots: Array<{
            x: number;
            y: number;
            color: string;
        }> = [];

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        for (const s of this.data.series) {
            if (!s.data || !s.data.length) {
                continue;
            }
            if (s.data[0].date > hoveredDate || s.data[s.data.length - 1].date < hoveredDate) {
                continue; // hovering outside of series data range -> skip this series
            }

            // find last point that is smaller than hovered date
            for (let i = 0; i < s.data.length; i++) {
                if (s.data[i].date > hoveredDate) {
                    const dataPoint = s.data[i - 1];
                    tooltipData.push({
                        label: s.label,
                        value: `${dataPoint.value} ${formatDate(dataPoint.date)}`
                    });
                    tooltipDots.push({
                        x: coords.xScale(dataPoint.date),
                        y: coords.yScale(dataPoint.value),
                        color: s.strokeColor
                    });
                    break;
                }
            }
        }

        const bars = this.data.stackedBars;
        if (bars && bars.length > 0 && bars[0].dateStart <= hoveredDate && bars[bars.length - 1].dateEnd >= hoveredDate) {
            // find last point that is smaller than hovered date
            for (let i = 0; i < bars.length; i++) {
                if (bars[i].dateStart > hoveredDate) {
                    const b = bars[i - 1];
                    tooltipData.push({
                        label: 'stacked bar date range',
                        value: `${formatDate(b.dateStart)} - ${formatDate(b.dateEnd)}`,
                    });
                    for (const v of b.values) {
                        tooltipData.push({
                            label: v.fillColor,
                            value: `${v.value}`
                        });
                        // todo compute x & y for the tooltip dot and push into tooltipDots
                    }
                    break;
                }
            }
        }

        if (tooltipData.length === 0) {
            this.tooltip.style('opacity', 0); // nothing to show
        }

        // update tooltip content
        this.tooltip
            .selectAll('div')
            .data(tooltipData)
            .join('div')
            .text(d => d.label + ' ' + d.value);

        // update tooltip dots
        this.tooltipDots
            .selectAll('circle')
            .data(tooltipDots)
            .join('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 10)
            .attr('fill', d => d.color);
    }

    /**
     * Pad data series with an additional first and last data point.
     * The point values are set to minValue.
     * Useful if you want to create a fill that goes all the way down to the axis.
     */
    private addFirstAndLastMinPoints(s: DataSeries, minValue: number): DataSeries {
        if (!s || !s.data || s.data.length === 0) {
            return s;
        }
        return {
            ...s,
            data: [
                {...s.data[0], value: minValue},
                ...s.data,
                {...s.data[s.data.length - 1], value: minValue},
            ]
        };
    }

    private mapPartitions(partitions: DataPartition[]): PartitionMinMax[] {
        const result: PartitionMinMax[] = [];
        let min = 0;
        for (const p of partitions) {
            const max = min + p.size;
            result.push({
                min,
                max,
                fillColor: p.fillColor,
                label: p.label
            });
            min = max;
        }
        return result;
    }

}
