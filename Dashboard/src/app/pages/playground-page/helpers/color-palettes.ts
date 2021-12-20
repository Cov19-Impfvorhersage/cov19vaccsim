export class ColorPalettes {

    vaccinationsPal = {
        once: {
            fillColor: '#8cd0cd',
            strokeColor: '#6fb6b3',
        },
        fully: {
            fillColor: '#54a98f',
            strokeColor: '#4a8a60',
        },
        booster: {
            fillColor: '#2c725c',
            strokeColor: '#20412f',
        }
    };

    populationPalS = [
        '#a2d9ac',
        '#69b164',
        '#468b43',
        '#186a10',
        '#12520d',
        '#0c3d07',
    ];

    populationPalL = [
        '#e9fcec',
        '#c2eac8',
        ...this.populationPalS,
        '#0a2f05',
        '#061d02',
    ];

    populationSpecial = {
        unwilling: '#ddd',
        contraindicated: '#aaa',
    };

    vaccinePal = [
        '#4477AA',
        '#CC3311',
        '#CCBB44',
        '#228833',
        '#EE6677',
        '#66CCEE',
        '#AA3377',
        '#BBBBBB',
    ];

}
