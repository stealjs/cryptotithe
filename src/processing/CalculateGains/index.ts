import * as clone from 'clone';
import {
    ICurrencyHolding,
    IHoldings,
    ITradeWithCostBasis,
    ITradeWithGains,
    ITradeWithUSDRate,
    METHOD,
} from '../../types';

const FULL_YEAR_IN_MILLISECONDS = 31536000000;

export interface ICalculateGains {
    newHoldings: IHoldings;
    longTermGain: number;
    shortTermGain: number;
}

export function calculateGains(
    holdings: IHoldings,
    trades: ITradeWithUSDRate[],
    method: METHOD = METHOD.FIFO,
): ICalculateGains {
    let shortTermGain = 0;
    let longTermGain = 0;
    let newHoldings: IHoldings = clone(holdings);
    for (const trade of trades) {
        const result: IGetCurrencyHolding = getCurrenyHolding(
            newHoldings, trade.soldCurrency, trade.amountSold, method,
        );
        newHoldings = result.newHoldings;
        if (!(trade.boughtCurrency in newHoldings)) {
            newHoldings[trade.boughtCurrency] = [];
        }
        if (trade.soldCurrency === 'USD') {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate,
                date: new Date().getTime(),
            });
            continue;
        } else {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate * trade.rate,
                date: new Date().getTime(),
            });
            for (const holding of result.deductedHoldings) {
                const gain: number = (trade.USDRate - holding.rateInUSD) * holding.amount;

                if (trade.date - holding.date > FULL_YEAR_IN_MILLISECONDS) {
                    longTermGain += gain;
                } else {
                    shortTermGain += gain;
                }
            }
        }
    }
    return {
        newHoldings,
        longTermGain,
        shortTermGain,
    };
}

export interface IGetCurrencyHolding {
    deductedHoldings: ICurrencyHolding[];
    newHoldings: IHoldings;
}

export function getCurrenyHolding(
    holdings: IHoldings, currency: string, amount: number, method?: METHOD,
): IGetCurrencyHolding {
    holdings = clone(holdings);
    const currencyHolding: ICurrencyHolding[] = [];
    let amountUsed: number = amount;
    while (amountUsed !== 0) {
        if (currency in holdings) {
            switch (method) {
                case METHOD.LIFO:
                    const lastIn: ICurrencyHolding = holdings[currency][holdings[currency].length - 1];
                    if (lastIn.amount > amountUsed) {
                        lastIn.amount = lastIn.amount - amountUsed;
                        currencyHolding.push({
                            amount: amountUsed,
                            rateInUSD: lastIn.rateInUSD,
                            date: lastIn.date,
                        });
                        amountUsed = 0;
                    } else {
                        amountUsed = amountUsed - lastIn.amount;
                        const popped = holdings[currency].pop();
                        if (popped !== undefined) {
                            currencyHolding.push(popped);
                        }
                    }
                    break;
                case METHOD.HCFO:
                    // return '';
                case METHOD.FIFO:
                default:
                    const firstIn: ICurrencyHolding = holdings[currency][0];
                    if (firstIn.amount > amountUsed) {
                        firstIn.amount = firstIn.amount - amountUsed;
                        currencyHolding.push({
                            amount: amountUsed,
                            rateInUSD: firstIn.rateInUSD,
                            date: firstIn.date,
                        });
                        amountUsed = 0;
                    } else {
                        amountUsed = amountUsed - firstIn.amount;
                        currencyHolding.push(holdings[currency][0]);
                        holdings[currency].splice(0, 1);
                    }
                    break;
            }
            if (!holdings[currency].length) {
                delete holdings[currency];
            }
        } else {
            if (currency === 'USD') {
                currencyHolding.push({
                    amount: amountUsed,
                    date: new Date().getTime(),
                    rateInUSD: 1,
                });
            } else {
                currencyHolding.push({
                    amount: amountUsed,
                    date: new Date().getTime(),
                    rateInUSD: 0,
                });
            }
            amountUsed = 0;
        }
    }
    return {
        deductedHoldings: currencyHolding,
        newHoldings: holdings,
    };
}

export interface ICalculateGainsPerTrade {
    trades: ITradeWithGains[];
    shortTerm: number;
    longTerm: number;
}

export function calculateGainPerTrade(
    holdings: IHoldings,
    internalFormat: ITradeWithUSDRate[],
    method: METHOD,
): ICalculateGainsPerTrade {
    let tempHoldings: IHoldings = clone(holdings);
    let shortTerm = 0;
    let longTerm = 0;
    const finalFormat: ITradeWithGains[] = [];
    for (const trade of internalFormat) {
        const result: ICalculateGains = calculateGains(tempHoldings, [trade], method);
        tempHoldings = result.newHoldings;
        shortTerm += result.shortTermGain;
        longTerm += result.longTermGain;
        finalFormat.push({
            ...trade,
            shortTerm: result.shortTermGain,
            longTerm: result.longTermGain,
        });
    }
    return {
        trades: finalFormat,
        shortTerm,
        longTerm,
    };
}

export function calculateGainsPerHoldings(holdings: IHoldings, trades: ITradeWithUSDRate[]): ITradeWithCostBasis[] {
    let newHoldings: IHoldings = clone(holdings);
    const newTrades: ITradeWithCostBasis[] = [];
    for (const trade of trades) {
        const result: IGetCurrencyHolding = getCurrenyHolding(newHoldings, trade.soldCurrency, trade.amountSold);
        newHoldings = result.newHoldings;
        if (!(trade.boughtCurrency in newHoldings)) {
            newHoldings[trade.boughtCurrency] = [];
        }
        newHoldings[trade.boughtCurrency].push({
            amount: trade.amountSold / trade.rate,
            rateInUSD: trade.USDRate * trade.rate,
            date: new Date().getTime(),
        });
        for (const holding of result.deductedHoldings) {
            const gain: number = (trade.USDRate - holding.rateInUSD) * holding.amount;
            let shortTerm = 0;
            let longTerm = 0;
            if (trade.date - holding.date > FULL_YEAR_IN_MILLISECONDS) {
                longTerm += gain;
            } else {
                shortTerm += gain;
            }
            newTrades.push({
                ...trade,
                shortTerm,
                longTerm,
                dateAcquired: holding.date,
                costBasis: holding.rateInUSD * holding.amount,
            });
        }
    }
    return newTrades;
}
