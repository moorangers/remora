export const SOURCE_PLATFORMS = [
  'ctrader',
  'mt5',
  'binance',
  'bybit',
  'custom',
] as const;
export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];

export const TRADE_STAGES = ['OPEN', 'CLOSE'] as const;
export type TradeStage = (typeof TRADE_STAGES)[number];

export const TRADE_RESULTS = ['win', 'loss', 'breakeven', 'open'] as const;
export type TradeResult = (typeof TRADE_RESULTS)[number];

export const TRADE_SIDES = ['buy', 'sell'] as const;
export type TradeSide = (typeof TRADE_SIDES)[number];

export interface TradeRecord {
  sourcePlatform: SourcePlatform;
  sourceTradeId: string;
  stage: TradeStage;
  strategyName: string;
  strategyVersion: string | null;
  sessionName: string | null;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  volume: number;
  grossProfit: number | null;
  netProfit: number | null;
  commission: number | null;
  swapFee: number | null;
  spread: number | null;
  atr: number | null;
  riskPips: number | null;
  rewardPips: number | null;
  rrRatio: number | null;
  maePips: number | null;
  mfePips: number | null;
  openedAt: string;
  closedAt: string | null;
  result: TradeResult;
  metadata: Record<string, unknown>;
}
