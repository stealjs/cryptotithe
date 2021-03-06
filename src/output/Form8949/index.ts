import { calculateGainsPerHoldings } from '../../processing/CalculateGains';
import { IHoldings, ITradeWithCostBasis, ITradeWithUSDRate, METHOD } from '../../types';

const headers = [
    'Description',
    'Date Acquired',
    'Date Sold',
    'Proceeds',
    'Cost Basis',
    'Adjustment Code',
    'Adjustment Amount',
    'Gain or Loss',
].join(',');

export default function outputForm8949(holdings: IHoldings, trades: ITradeWithUSDRate[], method: METHOD) {
    const result = calculateGainsPerHoldings(holdings, trades, method);
    let csvData: any[] = [
        'Form 8949 Statement',
        '',
        'Part 1 (Short-Term)',
    ];
    csvData = csvData.concat(headers);
    csvData = csvData.concat(addTrades(result.shortTermTrades));
    csvData = csvData.concat(addTotal(result.shortTermProceeds, result.shortTermCostBasis, result.shortTermGain));
    csvData = csvData.concat(['', 'Part 2 (Long Term)']).concat(headers);
    csvData = csvData.concat(addTrades(result.longTermTrades));
    csvData = csvData.concat(addTotal(result.longTermProceeds, result.longTermCostBasis, result.longTermGain));
    return csvData.join('\n');
}

function addTrades(trades: ITradeWithCostBasis[]) {
    return trades.map((trade) => [
        `${trade.amountSold} ${trade.soldCurrency}`,
        new Date(trade.dateAcquired).toLocaleDateString(),
        new Date(trade.date).toLocaleDateString(),
        (trade.costBasis + trade.longTerm + trade.shortTerm).toFixed(2),
        (trade.costBasis).toFixed(2),
        null,
        null,
        (trade.longTerm + trade.shortTerm).toFixed(2),
    ]);
}

function addTotal(proceeds: number, costBasis: number, gain: number) {
    return ['Totals', '', '', proceeds.toFixed(2), costBasis.toFixed(2), '', 0, gain.toFixed(2)].join(',');
}
