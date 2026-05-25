import type { TradeRecord, TradeResult, TradeSide } from './trade.types';
import { cTraderRawPayloadSchema, tradeRecordSchema } from './trade.schema';

function mapActionToSide(action: 'buy' | 'sell' | 'long' | 'short'): TradeSide {
  if (action === 'long') {
    return 'buy';
  }

  if (action === 'short') {
    return 'sell';
  }

  return action;
}

function inferTradeResult(
  stage: TradeRecord['stage'],
  netProfit: number | null,
  explicitResult?: TradeResult,
): TradeResult {
  if (explicitResult) {
    return explicitResult;
  }

  if (stage === 'OPEN') {
    return 'open';
  }

  if (netProfit === null || netProfit === 0) {
    return 'breakeven';
  }

  return netProfit > 0 ? 'win' : 'loss';
}

export function mapCTraderPayloadToTradeRecord(payload: unknown): TradeRecord {
  const parsed = cTraderRawPayloadSchema.parse(payload);

  const normalized: TradeRecord = {
    sourcePlatform: 'ctrader',
    sourceTradeId: parsed.ticket_id,
    stage: parsed.stage,
    strategyName: parsed.strategy_name,
    strategyVersion: parsed.strategy_version ?? null,
    symbol: parsed.symbol,
    side: mapActionToSide(parsed.action),
    entryPrice: parsed.entry_price,
    exitPrice: parsed.exit_price,
    stopLoss: parsed.stop_loss,
    takeProfit: parsed.take_profit,
    volume: parsed.volume,
    grossProfit: parsed.gross_profit,
    netProfit: parsed.net_profit,
    commission: parsed.commission,
    swapFee: parsed.swap_fee,
    spread: parsed.spread,
    atr: parsed.atr,
    maePips: parsed.mae_pips,
    mfePips: parsed.mfe_pips,
    openedAt: parsed.opened_at,
    closedAt: parsed.closed_at,
    result: inferTradeResult(parsed.stage, parsed.net_profit, parsed.result),
    metadata: parsed.metadata,
  };

  return tradeRecordSchema.parse(normalized);
}
