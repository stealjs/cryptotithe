import * as clone from 'clone';
import {
    ICurrencyHolding,
    IHoldings,
    ITradeWithCostBasis,
    ITradeWithGains,
    ITradeWithUSDRate,
    METHOD,
    ITrade,
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
            newHoldings, trade, method,
        );
        newHoldings = result.newHoldings;
        if (!(trade.boughtCurrency in newHoldings)) {
            newHoldings[trade.boughtCurrency] = [];
        }
        if (trade.soldCurrency === 'USD') {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate,
                date: trade.date,
            });
            continue;
        } else {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate * trade.rate,
                date: trade.date,
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
    holdings: IHoldings, trade: ITrade, method?: METHOD,
): IGetCurrencyHolding {
    holdings = clone(holdings);
    const currencyHolding: ICurrencyHolding[] = [];
    let amountUsed: number = trade.amountSold;
    while (amountUsed !== 0) {
        if (trade.soldCurrency in holdings) {
            switch (method) {
                case METHOD.LIFO:
                    const lastIn: ICurrencyHolding = holdings[trade.soldCurrency][holdings[trade.soldCurrency].length - 1];
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
                        const popped = holdings[trade.soldCurrency].pop();
                        if (popped !== undefined) {
                            currencyHolding.push(popped);
                        }
                    }
                    break;
                case METHOD.HCFO:
                    // return '';
                case METHOD.FIFO:
                default:
                    const firstIn: ICurrencyHolding = holdings[trade.soldCurrency][0];
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
                        currencyHolding.push(holdings[trade.soldCurrency][0]);
                        holdings[trade.soldCurrency].splice(0, 1);
                    }
                    break;
            }
            if (!holdings[trade.soldCurrency].length) {
                delete holdings[trade.soldCurrency];
            }
        } else {
            if (trade.soldCurrency === 'USD') {
                currencyHolding.push({
                    amount: amountUsed,
                    date: trade.date,
                    rateInUSD: 1,
                });
            } else {
                currencyHolding.push({
                    amount: amountUsed,
                    date: trade.date,
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

export interface ICalculateGainsPerHoldings {
    shortTermTrades: ITradeWithCostBasis[];
    longTermTrades: ITradeWithCostBasis[];
    longTermGain: number;
    longTermProceeds: number;
    longTermCostBasis: number;
    shortTermGain: number;
    shortTermProceeds: number;
    shortTermCostBasis: number;
}

export function calculateGainsPerHoldings(holdings: IHoldings, trades: ITradeWithUSDRate[], method: METHOD): ICalculateGainsPerHoldings {
    let newHoldings: IHoldings = clone(holdings);
    let shortTermGain = 0;
    let shortTermProceeds = 0;
    let shortTermCostBasis = 0;
    let longTermGain = 0;
    let longTermProceeds = 0;
    let longTermCostBasis = 0;
    const shortTermTrades: ITradeWithCostBasis[] = [];
    const longTermTrades: ITradeWithCostBasis[] = [];
    for (const trade of trades) {
        const result: IGetCurrencyHolding = getCurrenyHolding(newHoldings, trade, method);
        newHoldings = result.newHoldings;
        if (!(trade.boughtCurrency in newHoldings)) {
            newHoldings[trade.boughtCurrency] = [];
        }
        if (trade.soldCurrency === 'USD') {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate,
                date: trade.date,
            });
            continue;
        } else {
            newHoldings[trade.boughtCurrency].push({
                amount: trade.amountSold / trade.rate,
                rateInUSD: trade.USDRate * trade.rate,
                date: trade.date,
            });
        }
        for (const holding of result.deductedHoldings) {
            const gain: number = (trade.USDRate - holding.rateInUSD) * holding.amount;
            let shortTerm = 0;
            let longTerm = 0;
            const tradeToAdd: ITradeWithCostBasis = {
                USDRate: trade.USDRate,
                boughtCurrency: trade.boughtCurrency,
                soldCurrency: trade.soldCurrency,
                amountSold: holding.amount,
                rate: trade.rate,
                date: trade.date,
                id: trade.id,
                exchange: trade.exchange,
                shortTerm,
                longTerm,
                dateAcquired: holding.date,
                costBasis: holding.rateInUSD * holding.amount,
            };
            if (trade.date - holding.date > FULL_YEAR_IN_MILLISECONDS) {
                longTermProceeds += tradeToAdd.USDRate * tradeToAdd.amountSold;
                longTermCostBasis += tradeToAdd.costBasis;
                longTermGain += gain;
                tradeToAdd.longTerm += gain;
                longTermTrades.push(tradeToAdd);
            } else {
                shortTermProceeds += tradeToAdd.USDRate * tradeToAdd.amountSold;
                shortTermCostBasis += tradeToAdd.costBasis;
                shortTermGain += gain;
                tradeToAdd.shortTerm += gain;
                shortTermTrades.push(tradeToAdd);
            }
        }
    }
    return {
        shortTermTrades,
        longTermTrades,
        shortTermGain,
        longTermGain,
        shortTermProceeds,
        longTermProceeds,
        shortTermCostBasis,
        longTermCostBasis,
    };
}
