import { describe, expect, it, vi } from 'vitest';
import type { NormalizedTradePayload, TradeRecord } from '@/types';
import type { TradeRepository } from './repository';
import { TradeService } from './service';

const openPayload: NormalizedTradePayload = {
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
  maePips: null,
  mfePips: null,
  openedAt: '2026-05-24T10:00:00.000Z',
  closedAt: null,
  result: 'open',
  metadata: {},
};

const existingTrade: TradeRecord = {
  id: 'b3f28fdf-1dc0-4b8b-954f-99353ff04ad4',
  sourcePlatform: 'ctrader',
  sourceTradeId: '12345',
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
  maePips: null,
  mfePips: null,
  openedAt: '2026-05-24T10:00:00.000Z',
  closedAt: null,
  result: 'open',
  createdAt: '2026-05-24T10:00:00.000Z',
  updatedAt: '2026-05-24T10:00:00.000Z',
};

function createRepository(
  overrides: Partial<TradeRepository> = {},
): TradeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByTradeId: vi.fn().mockResolvedValue(null),
    findLatestTrades: vi.fn().mockResolvedValue([]),
    findByDateRange: vi.fn().mockResolvedValue([]),
    createTrade: vi.fn().mockResolvedValue(existingTrade),
    updateTrade: vi.fn().mockResolvedValue(existingTrade),
    findBySourceTradeId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(existingTrade),
    update: vi.fn().mockResolvedValue(existingTrade),
    upsert: vi.fn().mockResolvedValue(existingTrade),
    ...overrides,
  };
}

describe('TradeService', () => {
  it('creates a trade for OPEN payloads', async () => {
    const repository = createRepository();
    const service = new TradeService(repository);

    await service.ingest(openPayload);

    expect(repository.create).toHaveBeenCalledWith(openPayload);
  });

  it('prevents duplicate trade creation', async () => {
    const repository = createRepository({
      findBySourceTradeId: vi.fn().mockResolvedValue(existingTrade),
    });
    const service = new TradeService(repository);

    const trade = await service.ingest(openPayload);

    expect(trade).toBe(existingTrade);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('updates an existing trade for CLOSE payloads', async () => {
    const closePayload: NormalizedTradePayload = {
      ...openPayload,
      stage: 'CLOSE',
      exitPrice: 1.092,
      netProfit: 70,
      grossProfit: 75,
      closedAt: '2026-05-24T12:00:00.000Z',
      result: 'win',
    };
    const repository = createRepository({
      findBySourceTradeId: vi.fn().mockResolvedValue(existingTrade),
    });
    const service = new TradeService(repository);

    await service.ingest(closePayload);

    expect(repository.update).toHaveBeenCalledWith(
      existingTrade.id,
      closePayload,
    );
  });

  it('rejects CLOSE payloads without a matching OPEN trade', async () => {
    const repository = createRepository();
    const service = new TradeService(repository);
    const closePayload: NormalizedTradePayload = {
      ...openPayload,
      stage: 'CLOSE',
      exitPrice: 1.092,
      closedAt: '2026-05-24T12:00:00.000Z',
      result: 'win',
    };

    await expect(service.ingest(closePayload)).rejects.toThrow(
      'Cannot close trade before an OPEN event is recorded.',
    );
  });

  it('rejects incomplete CLOSE payloads before persistence', async () => {
    const repository = createRepository();
    const service = new TradeService(repository);

    await expect(
      service.ingest({ ...openPayload, stage: 'CLOSE' }),
    ).rejects.toThrow('CLOSE trades must include closedAt and exitPrice.');
    expect(repository.findBySourceTradeId).not.toHaveBeenCalled();
  });
});
