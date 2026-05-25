import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors/app-error';
import { logger } from '@/lib/errors/logger';
import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  NormalizedTradePayload,
  SourcePlatform,
  TradeRecord,
} from '@/types';
import {
  toCloseUpdateRow,
  toCreateRow,
  toTradeRecord,
  TRADE_RECORD_SELECT,
  type TradeRecordRow,
} from './trade.mapper';

export interface TradeRepository {
  findById(id: string): Promise<TradeRecord | null>;
  findByTradeId(
    sourcePlatform: SourcePlatform,
    sourceTradeId: string,
  ): Promise<TradeRecord | null>;
  findLatestTrades(options?: {
    limit?: number;
    sourcePlatform?: SourcePlatform;
    symbol?: string;
  }): Promise<TradeRecord[]>;
  findByDateRange(options: {
    from: string;
    to: string;
    sourcePlatform?: SourcePlatform;
  }): Promise<TradeRecord[]>;
  createTrade(payload: NormalizedTradePayload): Promise<TradeRecord>;
  updateTrade(
    id: string,
    payload: NormalizedTradePayload,
  ): Promise<TradeRecord>;

  // Backward-compatible aliases used by existing service code.
  findBySourceTradeId(
    sourcePlatform: SourcePlatform,
    sourceTradeId: string,
  ): Promise<TradeRecord | null>;
  create(payload: NormalizedTradePayload): Promise<TradeRecord>;
  update(id: string, payload: NormalizedTradePayload): Promise<TradeRecord>;
  upsert(payload: NormalizedTradePayload): Promise<TradeRecord>;
}

export class SupabaseTradeRepository implements TradeRepository {
  constructor(
    private readonly supabase: SupabaseClient = getSupabaseClient(),
  ) {}

  async findById(id: string): Promise<TradeRecord | null> {
    const { data, error } = await this.supabase
      .from('trade_records')
      .select(TRADE_RECORD_SELECT)
      .eq('id', id)
      .maybeSingle<TradeRecordRow>();

    if (error) {
      throw toRepositoryError('find trade by id', error);
    }

    return data ? toTradeRecord(data) : null;
  }

  async findByTradeId(
    sourcePlatform: SourcePlatform,
    sourceTradeId: string,
  ): Promise<TradeRecord | null> {
    const { data, error } = await this.supabase
      .from('trade_records')
      .select(TRADE_RECORD_SELECT)
      .eq('source_platform', sourcePlatform)
      .eq('source_trade_id', sourceTradeId)
      .maybeSingle<TradeRecordRow>();

    if (error) {
      throw toRepositoryError('find trade by source id', error);
    }

    return data ? toTradeRecord(data) : null;
  }

  async findBySourceTradeId(
    sourcePlatform: SourcePlatform,
    sourceTradeId: string,
  ): Promise<TradeRecord | null> {
    return this.findByTradeId(sourcePlatform, sourceTradeId);
  }

  async findLatestTrades(options?: {
    limit?: number;
    sourcePlatform?: SourcePlatform;
    symbol?: string;
  }): Promise<TradeRecord[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 50, 500));
    let query = this.supabase
      .from('trade_records')
      .select(TRADE_RECORD_SELECT)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (options?.sourcePlatform) {
      query = query.eq('source_platform', options.sourcePlatform);
    }

    if (options?.symbol) {
      query = query.eq('symbol', options.symbol);
    }

    const { data, error } = await query;

    if (error) {
      throw toRepositoryError('find latest trades', error);
    }

    return (data ?? []).map((row) => toTradeRecord(row as TradeRecordRow));
  }

  async findByDateRange(options: {
    from: string;
    to: string;
    sourcePlatform?: SourcePlatform;
  }): Promise<TradeRecord[]> {
    let query = this.supabase
      .from('trade_records')
      .select(TRADE_RECORD_SELECT)
      .gte('opened_at', options.from)
      .lte('opened_at', options.to)
      .order('opened_at', { ascending: false });

    if (options.sourcePlatform) {
      query = query.eq('source_platform', options.sourcePlatform);
    }

    const { data, error } = await query;

    if (error) {
      throw toRepositoryError('find trades by date range', error);
    }

    return (data ?? []).map((row) => toTradeRecord(row as TradeRecordRow));
  }

  async createTrade(payload: NormalizedTradePayload): Promise<TradeRecord> {
    const insertRow = toCreateRow(payload);
    logger.info('DB INSERT PAYLOAD', {
      table: 'trade_records',
      payload: insertRow,
    });

    const { data, error } = await this.supabase
      .from('trade_records')
      .insert(insertRow)
      .select(TRADE_RECORD_SELECT)
      .single<TradeRecordRow>();

    if (error) {
      throw toRepositoryError('create trade', error);
    }

    return toTradeRecord(data);
  }

  async create(payload: NormalizedTradePayload): Promise<TradeRecord> {
    return this.createTrade(payload);
  }

  async updateTrade(
    id: string,
    payload: NormalizedTradePayload,
  ): Promise<TradeRecord> {
    const updateRow = toCloseUpdateRow(payload);
    logger.info('DB UPDATE PAYLOAD', {
      table: 'trade_records',
      id,
      payload: updateRow,
    });

    const { data, error } = await this.supabase
      .from('trade_records')
      .update(updateRow)
      .eq('id', id)
      .select(TRADE_RECORD_SELECT)
      .single<TradeRecordRow>();

    if (error) {
      throw toRepositoryError('update trade', error);
    }

    return toTradeRecord(data);
  }

  async update(
    id: string,
    payload: NormalizedTradePayload,
  ): Promise<TradeRecord> {
    return this.updateTrade(id, payload);
  }

  async upsert(payload: NormalizedTradePayload): Promise<TradeRecord> {
    const existing = await this.findByTradeId(
      payload.sourcePlatform,
      payload.sourceTradeId,
    );

    if (existing) {
      return this.updateTrade(existing.id, payload);
    }

    return this.createTrade(payload);
  }
}

function toRepositoryError(
  operation: string,
  error: { code?: string; message: string; details?: string; hint?: string },
) {
  const isUniqueViolation = error.code === '23505';
  const message = isUniqueViolation
    ? 'Trade already exists.'
    : `Failed to ${operation}.`;
  const statusCode = isUniqueViolation ? 409 : 500;

  return new AppError(message, statusCode, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}
