import { describe, expect, it } from 'vitest';
import type { TradeRecord } from '@/types';
import {
  calculateAverageLoss,
  calculateAverageMAE,
  calculateAverageMFE,
  calculateAverageWin,
  calculateExpectancy,
  calculateNetProfit,
  calculateProfitFactor,
  calculateSessionPerformance,
  calculateSymbolPerformance,
  calculateWinRate,
} from './analytics';

function createTrade(overrides: Partial<TradeRecord>): TradeRecord {
  const result = overrides.result ?? 'breakeven';

  return {
    id: overrides.id ?? crypto.randomUUID(),
    sourcePlatform: 'ctrader',
    sourceTradeId: overrides.sourceTradeId ?? crypto.randomUUID(),
    strategyName: 'London Breakout',
    strategyVersion: '1.0.0',
    symbol: overrides.symbol ?? 'EURUSD',
    side: 'buy',
    entryPrice: 1.085,
    exitPrice: 1.09,
    stopLoss: 1.08,
    takeProfit: 1.095,
    volume: 10000,
    grossProfit: overrides.netProfit ?? null,
    netProfit: overrides.netProfit ?? 0,
    commission: null,
    swapFee: null,
    spread: 0.8,
    atr: 12.4,
    riskPips: null,
    rewardPips: null,
    rrRatio: null,
    maePips: overrides.maePips ?? 0,
    mfePips: overrides.mfePips ?? 0,
    openedAt: '2026-05-24T10:00:00.000Z',
    closedAt: result === 'open' ? null : '2026-05-24T12:00:00.000Z',
    result,
    metadata: overrides.metadata ?? {},
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '2026-05-24T12:00:00.000Z',
    ...overrides,
  };
}

const trades = [
  createTrade({
    result: 'win',
    netProfit: 100,
    maePips: 10,
    mfePips: 40,
    symbol: 'EURUSD',
    metadata: { sessionName: 'london' },
  }),
  createTrade({
    result: 'win',
    netProfit: 50,
    maePips: 8,
    mfePips: 35,
    symbol: 'GBPUSD',
    metadata: { sessionName: 'new-york' },
  }),
  createTrade({
    result: 'loss',
    netProfit: -40,
    maePips: 22,
    mfePips: 10,
    symbol: 'EURUSD',
    metadata: { sessionName: 'london' },
  }),
  createTrade({
    result: 'breakeven',
    netProfit: 0,
    maePips: 5,
    mfePips: 12,
    symbol: 'EURUSD',
    metadata: { sessionName: 'london' },
  }),
  createTrade({
    result: 'open',
    netProfit: 80,
    maePips: 99,
    mfePips: 99,
    symbol: 'USDJPY',
    metadata: { sessionName: 'asia' },
  }),
] as const;

describe('trade analytics', () => {
  it('calculateWinRate returns percentage over closed trades', () => {
    expect(calculateWinRate(trades)).toBe(50);
  });

  it('calculateProfitFactor returns deterministic value and handles zero-loss edge', () => {
    expect(calculateProfitFactor(trades)).toBe(3.75);
    expect(
      calculateProfitFactor([createTrade({ result: 'win', netProfit: 10 })]),
    ).toBe(Number.POSITIVE_INFINITY);
    expect(calculateProfitFactor([])).toBe(0);
  });

  it('calculateExpectancy returns mean net profit for closed trades', () => {
    expect(calculateExpectancy(trades)).toBe(27.5);
    expect(calculateExpectancy([])).toBe(0);
  });

  it('calculateAverageWin returns average of winning trades', () => {
    expect(calculateAverageWin(trades)).toBe(75);
    expect(
      calculateAverageWin([createTrade({ result: 'loss', netProfit: -10 })]),
    ).toBe(0);
  });

  it('calculateAverageLoss returns average of losing trades', () => {
    expect(calculateAverageLoss(trades)).toBe(-40);
    expect(
      calculateAverageLoss([createTrade({ result: 'win', netProfit: 10 })]),
    ).toBe(0);
  });

  it('calculateAverageMAE and calculateAverageMFE ignore open trades', () => {
    expect(calculateAverageMAE(trades)).toBe(11.25);
    expect(calculateAverageMFE(trades)).toBe(24.25);
  });

  it('calculateNetProfit sums closed trade net profit deterministically', () => {
    expect(calculateNetProfit(trades)).toBe(110);
  });

  it('calculateSessionPerformance groups by sessionName and computes summaries', () => {
    const performance = calculateSessionPerformance(trades);

    expect(Object.keys(performance)).toEqual(['asia', 'london', 'new-york']);
    expect(performance.london.netProfit).toBe(60);
    expect(performance.london.tradeCount).toBe(3);
    expect(performance['new-york'].winRate).toBe(100);
    expect(performance.asia.tradeCount).toBe(0);
  });

  it('calculateSessionPerformance supports custom session resolver', () => {
    const performance = calculateSessionPerformance(trades, (trade) =>
      trade.symbol === 'EURUSD' ? 'fx-core' : 'other',
    );

    expect(Object.keys(performance)).toEqual(['fx-core', 'other']);
    expect(performance['fx-core'].tradeCount).toBe(3);
    expect(performance.other.tradeCount).toBe(1);
  });

  it('calculateSymbolPerformance groups by symbol case-insensitively', () => {
    const performance = calculateSymbolPerformance([
      ...trades,
      createTrade({
        symbol: 'eurusd',
        result: 'win',
        netProfit: 20,
        maePips: 4,
        mfePips: 8,
      }),
    ]);

    expect(Object.keys(performance)).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
    expect(performance.EURUSD.tradeCount).toBe(4);
    expect(performance.EURUSD.netProfit).toBe(80);
    expect(performance.USDJPY.tradeCount).toBe(0);
  });

  it('returns zeroed metrics for empty groups and empty inputs', () => {
    expect(calculateSessionPerformance([])).toEqual({});
    expect(calculateSymbolPerformance([])).toEqual({});
    expect(calculateWinRate([])).toBe(0);
    expect(calculateAverageMAE([])).toBe(0);
    expect(calculateAverageMFE([])).toBe(0);
    expect(calculateNetProfit([])).toBe(0);
  });
});
