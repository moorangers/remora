import type { TradeConnector } from '@/modules/connector/trade-connector';
import { normalizedTradePayloadSchema } from '@/modules/trade/trade.schema';
import type { NormalizedTradePayload, TradeSide } from '@/types';
import { cTraderPayloadSchema } from './schema';

export class CTraderConnector implements TradeConnector {
  normalize(payload: unknown): NormalizedTradePayload {
    const parsed = cTraderPayloadSchema.parse(payload);
    const mappedAction = parsed.action === 'long' ? 'buy' : parsed.action;
    const side: TradeSide = mappedAction === 'short' ? 'sell' : mappedAction;

    const normalized = {
      sourcePlatform: parsed.source_platform,
      sourceTradeId: parsed.ticket_id,
      stage: parsed.stage,
      strategyName: parsed.strategy_name,
      strategyVersion: parsed.strategy_version ?? null,
      sessionName: parsed.session_name ?? null,
      symbol: parsed.symbol,
      side,
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
      riskPips: parsed.risk_pips,
      rewardPips: parsed.reward_pips,
      rrRatio: parsed.rr_ratio,
      maePips: parsed.mae_pips,
      mfePips: parsed.mfe_pips,
      openedAt: parsed.opened_at,
      closedAt: parsed.closed_at,
      result: parsed.result ?? (parsed.stage === 'OPEN' ? 'open' : null),
      metadata: parsed.metadata,
    };

    return normalizedTradePayloadSchema.parse(normalized);
  }
}
