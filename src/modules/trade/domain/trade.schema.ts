import { z } from 'zod';
import {
  SOURCE_PLATFORMS,
  TRADE_RESULTS,
  TRADE_SIDES,
  TRADE_STAGES,
  type TradeRecord,
} from './trade.types';

const numberFromUnknown = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value;
}, z.number().finite().nullable());

const requiredNumberFromUnknown = z.preprocess((value) => {
  if (typeof value === 'string') {
    return Number(value);
  }

  return value;
}, z.number().finite());

const dateTimeFromUnknown = z.preprocess((value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return value;
}, z.string().datetime());

const nullableDateTimeFromUnknown = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return value;
}, z.string().datetime().nullable());

export const sourcePlatformSchema = z.enum(SOURCE_PLATFORMS);
export const tradeStageSchema = z.enum(TRADE_STAGES);
export const tradeResultSchema = z.enum(TRADE_RESULTS);
export const tradeSideSchema = z.enum(TRADE_SIDES);

export const cTraderRawPayloadSchema = z.object({
  ticket_id: z.union([z.string(), z.number()]).transform(String),
  stage: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(tradeStageSchema),
  action: z
    .string()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(['buy', 'sell', 'long', 'short'])),
  strategy_name: z.string().min(1),
  strategy_version: z.string().min(1).nullish(),
  symbol: z.string().min(1),
  entry_price: requiredNumberFromUnknown,
  exit_price: numberFromUnknown.optional().default(null),
  stop_loss: numberFromUnknown.optional().default(null),
  take_profit: numberFromUnknown.optional().default(null),
  volume: requiredNumberFromUnknown.pipe(z.number().positive()),
  gross_profit: numberFromUnknown.optional().default(null),
  net_profit: numberFromUnknown.optional().default(null),
  commission: numberFromUnknown.optional().default(null),
  swap_fee: numberFromUnknown.optional().default(null),
  spread: numberFromUnknown.optional().default(null),
  atr: numberFromUnknown.optional().default(null),
  mae_pips: numberFromUnknown.optional().default(null),
  mfe_pips: numberFromUnknown.optional().default(null),
  opened_at: dateTimeFromUnknown,
  closed_at: nullableDateTimeFromUnknown.optional().default(null),
  result: tradeResultSchema.nullish(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const tradeRecordSchema: z.ZodType<TradeRecord> = z
  .object({
    sourcePlatform: sourcePlatformSchema,
    sourceTradeId: z.string().min(1),
    stage: tradeStageSchema,
    strategyName: z.string().min(1),
    strategyVersion: z.string().min(1).nullable(),
    symbol: z.string().min(1),
    side: tradeSideSchema,
    entryPrice: z.number().finite(),
    exitPrice: z.number().finite().nullable(),
    stopLoss: z.number().finite().nullable(),
    takeProfit: z.number().finite().nullable(),
    volume: z.number().positive(),
    grossProfit: z.number().finite().nullable(),
    netProfit: z.number().finite().nullable(),
    commission: z.number().finite().nullable(),
    swapFee: z.number().finite().nullable(),
    spread: z.number().finite().nullable(),
    atr: z.number().finite().nullable(),
    maePips: z.number().finite().nullable(),
    mfePips: z.number().finite().nullable(),
    openedAt: z.string().datetime(),
    closedAt: z.string().datetime().nullable(),
    result: tradeResultSchema,
    metadata: z.record(z.unknown()),
  })
  .superRefine((record, context) => {
    if (record.stage === 'OPEN') {
      if (record.closedAt !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closedAt'],
          message: 'OPEN trades must not include closedAt.',
        });
      }

      if (record.result !== 'open') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['result'],
          message: 'OPEN trades must have result set to open.',
        });
      }
    }

    if (record.stage === 'CLOSE') {
      if (record.closedAt === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closedAt'],
          message: 'CLOSE trades must include closedAt.',
        });
      }

      if (record.exitPrice === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exitPrice'],
          message: 'CLOSE trades must include exitPrice.',
        });
      }
    }
  });

export type SourcePlatformInput = z.infer<typeof sourcePlatformSchema>;
export type TradeStageInput = z.infer<typeof tradeStageSchema>;
export type TradeResultInput = z.infer<typeof tradeResultSchema>;
export type TradeSideInput = z.infer<typeof tradeSideSchema>;

export type CTraderRawPayload = z.infer<typeof cTraderRawPayloadSchema>;
export type TradeRecordInput = z.infer<typeof tradeRecordSchema>;
