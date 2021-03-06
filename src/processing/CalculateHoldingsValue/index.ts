import { IHoldings, ISimplifiedHoldingsWithValue } from '../../types';
import { getDayAvg } from '../getFiatRate/getDayAvgCurrencyRate';

export interface IHoldingsValue {
    currencies: {[key: string]: ISimplifiedHoldingsWithValue};
    total: number;
}

export async function calculateHoldingsValue(holdings: IHoldings, date: Date = new Date()): Promise<IHoldingsValue> {
    const currencies = Object.keys(holdings);
    const holdingsValues: IHoldingsValue = {
        total: 0,
        currencies: {

        },
    };
    for (const currency of currencies) {
        let totalHeld = 0;
        const rate = getDayAvg('USD', currency, date.getTime());
        for (const holding of holdings[currency]) {
            totalHeld += holding.amount;
        }
        holdingsValues.currencies[currency] = {
            fiatValue: await rate * totalHeld,
            amount: totalHeld,
        };
        holdingsValues.total += holdingsValues.currencies[currency].fiatValue;
    }
    return holdingsValues;
}
