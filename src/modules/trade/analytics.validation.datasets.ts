import type { TradeRecord } from '@/types';

export type MetricExpectation = {
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWin: number;
  averageLoss: number;
  averageMAE: number;
  averageMFE: number;
  netProfit: number;
};

export type AnalyticsValidationDataset = {
  name:
    | 'all-winning-trades'
    | 'all-losing-trades'
    | 'mixed-trades'
    | 'no-trades'
    | 'null-mae-mfe-trades'
    | 'null-atr-trades';
  description: string;
  trades: readonly TradeRecord[];
  expected: MetricExpectation;
};

function createTrade(seed: {
  id: string;
  sourceTradeId: string;
  symbol: string;
  result: TradeRecord['result'];
  netProfit: number;
  maePips: number | null;
  mfePips: number | null;
  atr: number | null;
}): TradeRecord {
  return {
    id: seed.id,
    sourcePlatform: 'ctrader',
    sourceTradeId: seed.sourceTradeId,
    strategyName: 'Validation Strategy',
    strategyVersion: '1.0.0',
    symbol: seed.symbol,
    side: 'buy',
    entryPrice: 1.1,
    exitPrice: seed.result === 'open' ? null : 1.101,
    stopLoss: 1.095,
    takeProfit: 1.11,
    volume: 10000,
    grossProfit: seed.netProfit,
    netProfit: seed.netProfit,
    commission: 0,
    swapFee: 0,
    spread: 1,
    atr: seed.atr,
    riskPips: null,
    rewardPips: null,
    rrRatio: null,
    maePips: seed.maePips,
    mfePips: seed.mfePips,
    openedAt: '2026-05-24T10:00:00.000Z',
    closedAt: seed.result === 'open' ? null : '2026-05-24T12:00:00.000Z',
    result: seed.result,
    metadata: {},
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '2026-05-24T12:00:00.000Z',
  };
}

const allWinningTrades = [
  createTrade({
    id: 'win-1',
    sourceTradeId: 'win-1',
    symbol: 'EURUSD',
    result: 'win',
    netProfit: 120,
    maePips: 6,
    mfePips: 25,
    atr: 14,
  }),
  createTrade({
    id: 'win-2',
    sourceTradeId: 'win-2',
    symbol: 'GBPUSD',
    result: 'win',
    netProfit: 80,
    maePips: 4,
    mfePips: 18,
    atr: 11,
  }),
  createTrade({
    id: 'win-3',
    sourceTradeId: 'win-3',
    symbol: 'USDJPY',
    result: 'win',
    netProfit: 50,
    maePips: 10,
    mfePips: 30,
    atr: 12,
  }),
] as const;

const allLosingTrades = [
  createTrade({
    id: 'loss-1',
    sourceTradeId: 'loss-1',
    symbol: 'EURUSD',
    result: 'loss',
    netProfit: -30,
    maePips: 12,
    mfePips: 5,
    atr: 10,
  }),
  createTrade({
    id: 'loss-2',
    sourceTradeId: 'loss-2',
    symbol: 'GBPUSD',
    result: 'loss',
    netProfit: -50,
    maePips: 20,
    mfePips: 8,
    atr: 13,
  }),
  createTrade({
    id: 'loss-3',
    sourceTradeId: 'loss-3',
    symbol: 'USDJPY',
    result: 'loss',
    netProfit: -20,
    maePips: 15,
    mfePips: 6,
    atr: 9,
  }),
] as const;

const mixedTrades = [
  createTrade({
    id: 'mix-1',
    sourceTradeId: 'mix-1',
    symbol: 'EURUSD',
    result: 'win',
    netProfit: 100,
    maePips: 10,
    mfePips: 40,
    atr: 12,
  }),
  createTrade({
    id: 'mix-2',
    sourceTradeId: 'mix-2',
    symbol: 'EURUSD',
    result: 'loss',
    netProfit: -40,
    maePips: 22,
    mfePips: 10,
    atr: 16,
  }),
  createTrade({
    id: 'mix-3',
    sourceTradeId: 'mix-3',
    symbol: 'GBPUSD',
    result: 'breakeven',
    netProfit: 0,
    maePips: 5,
    mfePips: 12,
    atr: 8,
  }),
  createTrade({
    id: 'mix-4',
    sourceTradeId: 'mix-4',
    symbol: 'USDJPY',
    result: 'win',
    netProfit: 60,
    maePips: 8,
    mfePips: 28,
    atr: 10,
  }),
] as const;

const nullMaeMfeTrades = [
  createTrade({
    id: 'null-mm-1',
    sourceTradeId: 'null-mm-1',
    symbol: 'EURUSD',
    result: 'win',
    netProfit: 50,
    maePips: null,
    mfePips: null,
    atr: 12,
  }),
  createTrade({
    id: 'null-mm-2',
    sourceTradeId: 'null-mm-2',
    symbol: 'GBPUSD',
    result: 'loss',
    netProfit: -20,
    maePips: 10,
    mfePips: null,
    atr: 11,
  }),
  createTrade({
    id: 'null-mm-3',
    sourceTradeId: 'null-mm-3',
    symbol: 'USDJPY',
    result: 'breakeven',
    netProfit: 0,
    maePips: null,
    mfePips: 15,
    atr: 9,
  }),
] as const;

const nullAtrTrades = [
  createTrade({
    id: 'null-atr-1',
    sourceTradeId: 'null-atr-1',
    symbol: 'EURUSD',
    result: 'win',
    netProfit: 30,
    maePips: 4,
    mfePips: 12,
    atr: null,
  }),
  createTrade({
    id: 'null-atr-2',
    sourceTradeId: 'null-atr-2',
    symbol: 'GBPUSD',
    result: 'loss',
    netProfit: -10,
    maePips: 6,
    mfePips: 5,
    atr: null,
  }),
] as const;

export const analyticsValidationDatasets: readonly AnalyticsValidationDataset[] =
  [
    {
      name: 'all-winning-trades',
      description: 'Only profitable closed trades.',
      trades: allWinningTrades,
      expected: {
        winRate: 100,
        profitFactor: Number.POSITIVE_INFINITY,
        expectancy: 83.33333333,
        averageWin: 83.33333333,
        averageLoss: 0,
        averageMAE: 6.66666667,
        averageMFE: 24.33333333,
        netProfit: 250,
      },
    },
    {
      name: 'all-losing-trades',
      description: 'Only losing closed trades.',
      trades: allLosingTrades,
      expected: {
        winRate: 0,
        profitFactor: 0,
        expectancy: -33.33333333,
        averageWin: 0,
        averageLoss: -33.33333333,
        averageMAE: 15.66666667,
        averageMFE: 6.33333333,
        netProfit: -100,
      },
    },
    {
      name: 'mixed-trades',
      description: 'Wins, losses, and breakeven trades in one set.',
      trades: mixedTrades,
      expected: {
        winRate: 50,
        profitFactor: 4,
        expectancy: 30,
        averageWin: 80,
        averageLoss: -40,
        averageMAE: 11.25,
        averageMFE: 22.5,
        netProfit: 120,
      },
    },
    {
      name: 'no-trades',
      description: 'Empty input should return zeroed metrics.',
      trades: [],
      expected: {
        winRate: 0,
        profitFactor: 0,
        expectancy: 0,
        averageWin: 0,
        averageLoss: 0,
        averageMAE: 0,
        averageMFE: 0,
        netProfit: 0,
      },
    },
    {
      name: 'null-mae-mfe-trades',
      description:
        'MAE/MFE null values should be treated as zero by analytics.',
      trades: nullMaeMfeTrades,
      expected: {
        winRate: 33.33333333,
        profitFactor: 2.5,
        expectancy: 10,
        averageWin: 50,
        averageLoss: -20,
        averageMAE: 3.33333333,
        averageMFE: 5,
        netProfit: 30,
      },
    },
    {
      name: 'null-atr-trades',
      description: 'ATR null values should not affect current metric formulas.',
      trades: nullAtrTrades,
      expected: {
        winRate: 50,
        profitFactor: 3,
        expectancy: 10,
        averageWin: 30,
        averageLoss: -10,
        averageMAE: 5,
        averageMFE: 8.5,
        netProfit: 20,
      },
    },
  ] as const;
