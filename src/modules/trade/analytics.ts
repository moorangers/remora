import type { TradeRecord } from '@/types';

export interface PerformanceSummary {
  tradeCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWin: number;
  averageLoss: number;
  averageMAE: number;
  averageMFE: number;
  netProfit: number;
}

type SessionResolver = (trade: TradeRecord) => string;

function toFiniteNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round(value: number, decimals = 8): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isClosedTrade(trade: TradeRecord): boolean {
  return trade.result !== 'open';
}

function getClosedTrades(trades: readonly TradeRecord[]): TradeRecord[] {
  return trades.filter(isClosedTrade);
}

function getWins(trades: readonly TradeRecord[]): TradeRecord[] {
  return trades.filter((trade) => trade.result === 'win');
}

function getLosses(trades: readonly TradeRecord[]): TradeRecord[] {
  return trades.filter((trade) => trade.result === 'loss');
}

function getBreakevens(trades: readonly TradeRecord[]): TradeRecord[] {
  return trades.filter((trade) => trade.result === 'breakeven');
}

function sumBy(
  trades: readonly TradeRecord[],
  selector: (trade: TradeRecord) => number,
): number {
  return trades.reduce((total, trade) => total + selector(trade), 0);
}

function averageBy(
  trades: readonly TradeRecord[],
  selector: (trade: TradeRecord) => number,
): number {
  if (trades.length === 0) {
    return 0;
  }

  return round(sumBy(trades, selector) / trades.length);
}

function buildPerformanceSummary(
  trades: readonly TradeRecord[],
): PerformanceSummary {
  const closedTrades = getClosedTrades(trades);
  const wins = getWins(closedTrades);
  const losses = getLosses(closedTrades);
  const breakevens = getBreakevens(closedTrades);

  const grossProfit = sumBy(wins, (trade) =>
    Math.max(toFiniteNumber(trade.netProfit), 0),
  );
  const grossLossAbs = Math.abs(
    sumBy(losses, (trade) => Math.min(toFiniteNumber(trade.netProfit), 0)),
  );
  const netProfit = sumBy(closedTrades, (trade) =>
    toFiniteNumber(trade.netProfit),
  );

  const winRate =
    closedTrades.length === 0
      ? 0
      : round((wins.length / closedTrades.length) * 100);
  const profitFactor =
    grossLossAbs === 0
      ? grossProfit > 0
        ? Number.POSITIVE_INFINITY
        : 0
      : round(grossProfit / grossLossAbs);

  return {
    tradeCount: closedTrades.length,
    winCount: wins.length,
    lossCount: losses.length,
    breakevenCount: breakevens.length,
    winRate,
    profitFactor,
    expectancy:
      closedTrades.length === 0 ? 0 : round(netProfit / closedTrades.length),
    averageWin: averageBy(wins, (trade) => toFiniteNumber(trade.netProfit)),
    averageLoss: averageBy(losses, (trade) => toFiniteNumber(trade.netProfit)),
    averageMAE: averageBy(closedTrades, (trade) =>
      toFiniteNumber(trade.maePips),
    ),
    averageMFE: averageBy(closedTrades, (trade) =>
      toFiniteNumber(trade.mfePips),
    ),
    netProfit: round(netProfit),
  };
}

function defaultSessionResolver(trade: TradeRecord): string {
  const value = trade.metadata?.sessionName;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }

  return 'unknown';
}

export function calculateWinRate(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).winRate;
}

export function calculateProfitFactor(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).profitFactor;
}

export function calculateExpectancy(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).expectancy;
}

export function calculateAverageWin(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).averageWin;
}

export function calculateAverageLoss(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).averageLoss;
}

export function calculateAverageMAE(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).averageMAE;
}

export function calculateAverageMFE(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).averageMFE;
}

export function calculateNetProfit(trades: readonly TradeRecord[]): number {
  return buildPerformanceSummary(trades).netProfit;
}

export function calculateSessionPerformance(
  trades: readonly TradeRecord[],
  sessionResolver: SessionResolver = defaultSessionResolver,
): Record<string, PerformanceSummary> {
  const grouped = new Map<string, TradeRecord[]>();

  for (const trade of trades) {
    const key = sessionResolver(trade);
    const current = grouped.get(key) ?? [];
    current.push(trade);
    grouped.set(key, current);
  }

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const output: Record<string, PerformanceSummary> = {};

  for (const key of sortedKeys) {
    output[key] = buildPerformanceSummary(grouped.get(key) ?? []);
  }

  return output;
}

export function calculateSymbolPerformance(
  trades: readonly TradeRecord[],
): Record<string, PerformanceSummary> {
  const grouped = new Map<string, TradeRecord[]>();

  for (const trade of trades) {
    const key = trade.symbol.toUpperCase();
    const current = grouped.get(key) ?? [];
    current.push(trade);
    grouped.set(key, current);
  }

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const output: Record<string, PerformanceSummary> = {};

  for (const key of sortedKeys) {
    output[key] = buildPerformanceSummary(grouped.get(key) ?? []);
  }

  return output;
}
