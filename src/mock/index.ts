import * as faker from 'faker';
import { EXCHANGES, ICurrencyHolding, IHoldings, ITradeWithUSDRate } from '../types';

export function mockHoldings(
    currencies: number,
    holdingsPerCurrency: number,
    startingDate: Date = new Date(1 / 1 / 2010),
    endingDate: Date = new Date(),
): IHoldings {
    const holdings: IHoldings = {};
    for (let i = 0; i < currencies; i++) {
        const toBeHoldings: ICurrencyHolding[] = [];
        for (let hpc = 0; hpc < holdingsPerCurrency; hpc++) {
            toBeHoldings.push({
                amount: faker.random.number(),
                date: faker.date.between(startingDate, endingDate).getTime(),
                rateInUSD: faker.random.number(),
            });
        }
        holdings[faker.random.word().toUpperCase()] = toBeHoldings;
    }
    return holdings;
}

export function mockTrades(
    amount: number, startingDate: Date, currentHoldings: IHoldings, allowOverflow: boolean,
): ITradeWithUSDRate[] {
    const trades: ITradeWithUSDRate[] = [];
    const currencies: string[] = Object.keys(currentHoldings);
    for (const currency of currencies) {
        let totalHoldings = 0;
        for (const holding of currentHoldings[currency]) {
            totalHoldings += holding.amount;
        }

        for (let i = 0; i < amount; i++) {
            trades.push({
                boughtCurrency: faker.random.word().toUpperCase(),
                soldCurrency: faker.random.arrayElement(currencies),
                amountSold: (allowOverflow ?
                    totalHoldings + faker.random.number() : (totalHoldings - faker.random.number()) / amount),
                rate: faker.random.number(),
                date: faker.date.between(startingDate, new Date()).getTime(),
                USDRate: faker.random.number(),
                id: faker.random.words(5),
                exchange: faker.random.objectElement(EXCHANGES) as EXCHANGES,
            });
        }
    }

    return trades;
}

export function mockTradesWithUSDRate(
    amount: number, startingDate: Date, currentHoldings: IHoldings, allowOverflow: boolean): ITradeWithUSDRate[] {
    const trades: ITradeWithUSDRate[] = mockTrades(
        amount, startingDate, currentHoldings, allowOverflow);
    for (const trade of trades) {
        trade.USDRate = faker.random.number();
    }
    return trades;
}
