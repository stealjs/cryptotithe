export interface ISavedData {
    savedDate: Date;
    trades: ITradeWithUSDRate[];
    holdings: IHoldings;
}

export interface IHoldings {
    [key: string]: ICurrencyHolding[];
}

export interface ICurrencyHolding {
    amount: number;
    rateInUSD: number;
    date: number;
}

export interface ITrade {
    boughtCurreny: string;
    soldCurrency: string;
    amountSold: number;
    rate: number;
    date: number;
    id: string;
    exchange: EXCHANGES;
}

export interface ITradeWithUSDRate extends ITrade {
    USDRate: number;
}

export interface ITradeWithGains extends ITradeWithUSDRate {
    shortTerm: number;
    longTerm: number;
}

export enum METHOD {
    LIFO = 'LIFO',
    FIFO = 'FIFO',
    HCFO = 'HCFO',
}

export enum EXCHANGES {
    BITTREX = 'Bittrex',
    GEMINI = 'Gemini',
    POLONIEX = 'Poloniex',
    KRAKEN = 'Kraken',
}
