import { getCSVData } from '../';
import { EXCHANGES, ITrade } from '../../types';

enum PoloniexOrderType {
    BUY = 'Buy',
    SELL = 'Sell',
}

interface IPoloniex {
    Date: string;
    Market: string;
    Category: string;
    Type: PoloniexOrderType;
    Price: string;
    Amount: string;
    Total: string;
    Fee: string;
    'Order Number': string;
    'Base Total Less Fee': string;
    'Quote Total Less Fee': string;
}

function parseNumber(amount: string): number {
    return Math.abs(parseFloat(amount));
}

export async function processData(fileData: string): Promise<ITrade[]> {
    const data: IPoloniex[] = await getCSVData(fileData) as IPoloniex[];
    const internalFormat: ITrade[] = [];
    for (const trade of data) {
        const pair: string[] = trade.Market.split('/');
        switch (trade.Type) {
            case PoloniexOrderType.BUY:
                internalFormat.push({
                    boughtCurrency: pair[0],
                    soldCurrency: pair[1],
                    amountSold: parseNumber(trade['Base Total Less Fee']),
                    rate: parseNumber(trade['Base Total Less Fee']) / parseNumber(trade['Quote Total Less Fee']),
                    date: new Date(trade.Date).getTime(),
                    id: trade['Order Number'],
                    exchange: EXCHANGES.POLONIEX,
                });
                break;
            case PoloniexOrderType.SELL:
                internalFormat.push({
                    boughtCurrency: pair[1],
                    soldCurrency: pair[0],
                    amountSold: parseNumber(trade['Quote Total Less Fee']),
                    rate: parseNumber(trade['Quote Total Less Fee']) / parseNumber(trade['Base Total Less Fee']),
                    date: new Date(trade.Date).getTime(),
                    id: trade['Order Number'],
                    exchange: EXCHANGES.POLONIEX,
                });
                break;
            default:
                throw new Error('Unknown Order Type - ' + trade['Order Number']);
        }
    }
    return internalFormat;
}
