import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedTradePayload } from '@/types';
import { SupabaseTradeRepository } from './repository';

type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code?: string; message: string } };

type QueryBuilderState<T> = {
  result: QueryResult<T>;
  data: T | null;
  error: { code?: string; message: string } | null;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function createChainableQuery<T>(result: QueryResult<T>): QueryBuilderState<T> {
  const state = {} as QueryBuilderState<T>;

  state.result = result;
  state.data = result.data;
  state.error = result.error;
  state.eq = vi.fn(() => state);
  state.gte = vi.fn(() => state);
  state.lte = vi.fn(() => state);
  state.order = vi.fn(() => state);
  state.limit = vi.fn(() => state);
  state.maybeSingle = vi.fn(async () => result);

  return state;
}

const samplePayload: NormalizedTradePayload = {
  sourcePlatform: 'ctrader',
  sourceTradeId: '12345',
  stage: 'OPEN',
  strategyName: 'London Breakout',
  strategyVersion: '1.0.0',
  symbol: 'EURUSD',
  side: 'buy',
  entryPrice: 1.085,
  exitPrice: null,
  stopLoss: 1.08,
  takeProfit: 1.095,
  volume: 10000,
  grossProfit: null,
  netProfit: null,
  commission: null,
  swapFee: null,
  spread: 0.8,
  atr: 12.4,
  riskPips: null,
  rewardPips: null,
  rrRatio: null,
  maePips: null,
  mfePips: null,
  openedAt: '2026-05-24T10:00:00.000Z',
  closedAt: null,
  result: 'open',
  metadata: {},
};

const sampleRow = {
  id: 'b3f28fdf-1dc0-4b8b-954f-99353ff04ad4',
  source_platform: 'ctrader',
  source_trade_id: '12345',
  strategy_name: 'London Breakout',
  strategy_version: '1.0.0',
  session_name: null,
  symbol: 'EURUSD',
  side: 'buy',
  entry_price: 1.085,
  exit_price: null,
  stop_loss: 1.08,
  take_profit: 1.095,
  volume: 10000,
  gross_profit: null,
  net_profit: null,
  commission: null,
  swap_fee: null,
  spread: 0.8,
  atr: 12.4,
  risk_pips: null,
  reward_pips: null,
  rr_ratio: null,
  mae_pips: null,
  mfe_pips: null,
  opened_at: '2026-05-24T10:00:00.000Z',
  closed_at: null,
  result: 'open',
  metadata: {},
  created_at: '2026-05-24T10:00:00.000Z',
  updated_at: '2026-05-24T10:00:00.000Z',
} as const;

describe('SupabaseTradeRepository', () => {
  it('findById returns matching trade', async () => {
    const query = createChainableQuery({ data: sampleRow, error: null });
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const found = await repository.findById(sampleRow.id);

    expect(query.eq).toHaveBeenCalledWith('id', sampleRow.id);
    expect(found?.id).toBe(sampleRow.id);
  });

  it('createTrade inserts and returns normalized trade', async () => {
    const single = vi.fn(async () => ({ data: sampleRow, error: null }));
    const selectAfterInsert = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectAfterInsert }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const created = await repository.createTrade(samplePayload);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(created.sourceTradeId).toBe('12345');
    expect(created.metadata).toEqual({});
  });

  it('updateTrade updates by id and returns normalized trade', async () => {
    const single = vi.fn(async () => ({ data: sampleRow, error: null }));
    const selectAfterUpdate = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select: selectAfterUpdate }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const updated = await repository.updateTrade(sampleRow.id, samplePayload);

    expect(eq).toHaveBeenCalledWith('id', sampleRow.id);
    expect(updated.id).toBe(sampleRow.id);
  });

  it('findByTradeId returns matching trade', async () => {
    const query = createChainableQuery({ data: sampleRow, error: null });
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const found = await repository.findByTradeId('ctrader', '12345');

    expect(query.eq).toHaveBeenNthCalledWith(1, 'source_platform', 'ctrader');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'source_trade_id', '12345');
    expect(found?.sourceTradeId).toBe('12345');
  });

  it('findLatestTrades returns ordered rows with optional filters', async () => {
    const query = createChainableQuery({ data: [sampleRow], error: null });
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const rows = await repository.findLatestTrades({
      limit: 25,
      sourcePlatform: 'ctrader',
      symbol: 'EURUSD',
    });

    expect(query.order).toHaveBeenCalledWith('opened_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.eq).toHaveBeenNthCalledWith(1, 'source_platform', 'ctrader');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'symbol', 'EURUSD');
    expect(rows).toHaveLength(1);
  });

  it('findByDateRange filters by opened_at range and platform', async () => {
    const query = createChainableQuery({ data: [sampleRow], error: null });
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const repository = new SupabaseTradeRepository(supabase);
    const rows = await repository.findByDateRange({
      from: '2026-05-24T00:00:00.000Z',
      to: '2026-05-25T00:00:00.000Z',
      sourcePlatform: 'ctrader',
    });

    expect(query.gte).toHaveBeenCalledWith(
      'opened_at',
      '2026-05-24T00:00:00.000Z',
    );
    expect(query.lte).toHaveBeenCalledWith(
      'opened_at',
      '2026-05-25T00:00:00.000Z',
    );
    expect(query.eq).toHaveBeenCalledWith('source_platform', 'ctrader');
    expect(rows).toHaveLength(1);
  });
});
