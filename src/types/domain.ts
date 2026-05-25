export type SourcePlatform = 'ctrader' | 'mt5' | 'binance' | 'bybit' | 'custom';

export type TradeSide = 'buy' | 'sell';

export type TradeStage = 'OPEN' | 'CLOSE';

export type TradeResult = 'win' | 'loss' | 'breakeven' | 'open';

export interface TradeRecord {
  id: string;
  sourcePlatform: SourcePlatform;
  sourceTradeId: string;
  strategyName: string;
  strategyVersion: string | null;
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
  riskPips?: number | null;
  rewardPips?: number | null;
  rrRatio?: number | null;
  maePips: number | null;
  mfePips: number | null;
  openedAt: string;
  closedAt: string | null;
  result: TradeResult;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketSnapshot {
  id: string;
  tradeId: string;
  atr: number | null;
  adx: number | null;
  rsi: number | null;
  spread: number | null;
  sessionName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TradeEvent {
  id: string;
  tradeId: string;
  eventType: string;
  eventTime: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NormalizedTradePayload {
  sourcePlatform: SourcePlatform;
  sourceTradeId: string;
  stage: TradeStage;
  strategyName: string;
  strategyVersion: string | null;
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
  riskPips?: number | null;
  rewardPips?: number | null;
  rrRatio?: number | null;
  maePips: number | null;
  mfePips: number | null;
  openedAt: string;
  closedAt: string | null;
  result: TradeResult | null;
  metadata: Record<string, unknown>;
}
