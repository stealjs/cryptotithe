import * as got from 'got';
import { ITrade, ITradeWithUSDRate } from '../../types';

interface ICryptoCompareResponse {
    USD: number;
}

function cryptocompareResponse(response: got.Response<any>) {
    if ('body' in response) {
        try {
            const result: ICryptoCompareResponse = JSON.parse(response.body);
            if (result.USD !== 0) {
                return result.USD;
            } else {
                return false;
            }
        } catch (ex) {
            throw new Error('Error parsing JSON');
        }
    } else {
        throw new Error('Invalid Response');
    }
}

export async function getUSDRate(date: Date, trade: ITrade): Promise<number> {
    const data: string[] = [
        `fsym=${trade.soldCurrency}`,
        'tsym=USD',
        'sign=false', // change to true for security?
        `toTs=${date.getTime() / 1000}`,
        'extraParams=tApp',
    ];
    const response: got.Response<any> = await got('https://min-api.cryptocompare.com/data/dayAvg?' + data.join('&'));
    const rate = cryptocompareResponse(response);
    if (rate) {
        return rate;
    } else {
        data[0] = `fsym=${trade.boughtCurrency}`;
        const backupResponse = await got('https://min-api.cryptocompare.com/data/dayAvg?' + data.join('&'));
        const backupRate = cryptocompareResponse(backupResponse);
        if (backupRate) {
            return backupRate / trade.rate;
        } else {
            throw new Error('Cant get any USD Rate for trade ' + trade.id);
        }
    }
}

export async function addUSDRateToTrade(trade: ITrade): Promise<ITradeWithUSDRate> {
    const USDRate = await getUSDRate(new Date(trade.date), trade);
    return {
        ...trade,
        USDRate,
    };
}

export async function addUSDRateToTrades(trades: ITrade[]): Promise<ITradeWithUSDRate[]> {
    const newTrades: ITradeWithUSDRate[]  = [];
    for (const trade of trades) {
        // cant get some rates without await maybe cryptocompare rate limiting
        newTrades.push(await addUSDRateToTrade(trade));
    }
    return Promise.all(newTrades);
}