import type {
  NormalizedTradePayload,
  SourcePlatform,
  TradeRecord,
  TradeResult,
} from '@/types';

export type TradeRecordRow = {
  id: string;
  source_platform: SourcePlatform;
  source_trade_id: string;
  strategy_name: string;
  strategy_version: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  volume: number;
  gross_profit: number | null;
  net_profit: number | null;
  commission: number | null;
  swap_fee: number | null;
  spread: number | null;
  atr: number | null;
  risk_pips: number | null;
  reward_pips: number | null;
  rr_ratio: number | null;
  mae_pips: number | null;
  mfe_pips: number | null;
  opened_at: string;
  closed_at: string | null;
  result: TradeResult;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const TRADE_RECORD_SELECT = [
  'id',
  'source_platform',
  'source_trade_id',
  'strategy_name',
  'strategy_version',
  'symbol',
  'side',
  'entry_price',
  'exit_price',
  'stop_loss',
  'take_profit',
  'volume',
  'gross_profit',
  'net_profit',
  'commission',
  'swap_fee',
  'spread',
  'atr',
  'risk_pips',
  'reward_pips',
  'rr_ratio',
  'mae_pips',
  'mfe_pips',
  'opened_at',
  'closed_at',
  'result',
  'metadata',
  'created_at',
  'updated_at',
].join(', ');

export function toTradeRecord(row: TradeRecordRow): TradeRecord {
  return {
    id: row.id,
    sourcePlatform: row.source_platform,
    sourceTradeId: row.source_trade_id,
    strategyName: row.strategy_name,
    strategyVersion: row.strategy_version,
    symbol: row.symbol,
    side: row.side,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    volume: row.volume,
    grossProfit: row.gross_profit,
    netProfit: row.net_profit,
    commission: row.commission,
    swapFee: row.swap_fee,
    spread: row.spread,
    atr: row.atr,
    riskPips: row.risk_pips,
    rewardPips: row.reward_pips,
    rrRatio: row.rr_ratio,
    maePips: row.mae_pips,
    mfePips: row.mfe_pips,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    result: row.result,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCreateRow(
  payload: NormalizedTradePayload,
): Omit<TradeRecordRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    source_platform: payload.sourcePlatform,
    source_trade_id: payload.sourceTradeId,
    strategy_name: payload.strategyName,
    strategy_version: payload.strategyVersion,
    symbol: payload.symbol,
    side: payload.side,
    entry_price: payload.entryPrice,
    exit_price: payload.exitPrice,
    stop_loss: payload.stopLoss,
    take_profit: payload.takeProfit,
    volume: payload.volume,
    gross_profit: payload.grossProfit,
    net_profit: payload.netProfit,
    commission: payload.commission,
    swap_fee: payload.swapFee,
    spread: payload.spread,
    atr: payload.atr,
    risk_pips: payload.riskPips ?? null,
    reward_pips: payload.rewardPips ?? null,
    rr_ratio: payload.rrRatio ?? null,
    mae_pips: payload.maePips,
    mfe_pips: payload.mfePips,
    opened_at: payload.openedAt,
    closed_at: payload.closedAt,
    result: payload.result ?? 'open',
    metadata: payload.metadata,
  };
}

export function toCloseUpdateRow(
  payload: NormalizedTradePayload,
): Partial<TradeRecordRow> {
  return {
    exit_price: payload.exitPrice,
    stop_loss: payload.stopLoss,
    take_profit: payload.takeProfit,
    gross_profit: payload.grossProfit,
    net_profit: payload.netProfit,
    commission: payload.commission,
    swap_fee: payload.swapFee,
    spread: payload.spread,
    atr: payload.atr,
    risk_pips: payload.riskPips ?? null,
    reward_pips: payload.rewardPips ?? null,
    rr_ratio: payload.rrRatio ?? null,
    mae_pips: payload.maePips,
    mfe_pips: payload.mfePips,
    closed_at: payload.closedAt,
    result: payload.result ?? inferTradeResult(payload.netProfit),
    metadata: payload.metadata,
  };
}

function inferTradeResult(netProfit: number | null): TradeResult {
  if (netProfit === null || netProfit === 0) {
    return 'breakeven';
  }

  return netProfit > 0 ? 'win' : 'loss';
}
