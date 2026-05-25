import { describe, expect, it } from 'vitest';
import { mapCTraderPayloadToTradeRecord } from './trade.mapper';

const basePayload = {
  ticket_id: 12345,
  stage: 'OPEN',
  action: 'long',
  strategy_name: 'London Breakout',
  strategy_version: '1.0.0',
  symbol: 'EURUSD',
  entry_price: '1.085',
  exit_price: null,
  stop_loss: 1.08,
  take_profit: 1.095,
  volume: '10000',
  gross_profit: null,
  net_profit: null,
  commission: null,
  swap_fee: null,
  spread: '0.8',
  atr: '12.4',
  mae_pips: null,
  mfe_pips: null,
  opened_at: '2026-05-24T10:00:00Z',
  closed_at: null,
  result: 'open',
  metadata: { source: 'ctrader' },
} as const;

describe('trade domain contract', () => {
  it('accepts a valid cTrader payload', () => {
    const trade = mapCTraderPayloadToTradeRecord(basePayload);

    expect(trade).toMatchObject({
      sourcePlatform: 'ctrader',
      sourceTradeId: '12345',
      side: 'buy',
      result: 'open',
    });
  });

  it('rejects invalid payload', () => {
    expect(() =>
      mapCTraderPayloadToTradeRecord({
        ...basePayload,
        volume: 'not-a-number',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    const payloadMissingTicketId = { ...basePayload };
    delete (payloadMissingTicketId as Record<string, unknown>).ticket_id;

    expect(() =>
      mapCTraderPayloadToTradeRecord(payloadMissingTicketId),
    ).toThrow();
  });

  it('accepts null stop_loss', () => {
    const trade = mapCTraderPayloadToTradeRecord({
      ...basePayload,
      stop_loss: null,
    });

    expect(trade.stopLoss).toBeNull();
  });

  it('accepts null take_profit', () => {
    const trade = mapCTraderPayloadToTradeRecord({
      ...basePayload,
      take_profit: null,
    });

    expect(trade.takeProfit).toBeNull();
  });

  it('maps short action to sell and normalizes dates', () => {
    const trade = mapCTraderPayloadToTradeRecord({
      ...basePayload,
      action: 'short',
      opened_at: 1716544800000,
    });

    expect(trade.side).toBe('sell');
    expect(trade.openedAt).toBe('2024-05-24T10:00:00.000Z');
  });
});
