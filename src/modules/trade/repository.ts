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

  async findBySourceTradeId(
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

  async create(payload: NormalizedTradePayload): Promise<TradeRecord> {
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

  async update(
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

  async upsert(payload: NormalizedTradePayload): Promise<TradeRecord> {
    const existing = await this.findBySourceTradeId(
      payload.sourcePlatform,
      payload.sourceTradeId,
    );

    if (existing) {
      return this.update(existing.id, payload);
    }

    return this.create(payload);
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
