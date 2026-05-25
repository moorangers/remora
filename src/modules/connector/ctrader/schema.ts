import { z } from 'zod';

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

export const cTraderPayloadSchema = z.object({
  source_platform: z
    .string()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(['ctrader', 'mt5', 'binance', 'bybit', 'custom']))
    .optional()
    .default('ctrader'),
  ticket_id: z.union([z.string(), z.number()]).transform(String),
  stage: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(['OPEN', 'CLOSE'])),
  action: z
    .string()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(['buy', 'sell', 'long', 'short'])),
  strategy_name: z.string().min(1),
  strategy_version: z.string().min(1).nullish(),
  session_name: z.string().min(1).nullish(),
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
  risk_pips: numberFromUnknown.optional().default(null),
  reward_pips: numberFromUnknown.optional().default(null),
  rr_ratio: numberFromUnknown.optional().default(null),
  mae_pips: numberFromUnknown.optional().default(null),
  mfe_pips: numberFromUnknown.optional().default(null),
  opened_at: dateTimeFromUnknown,
  closed_at: nullableDateTimeFromUnknown.optional().default(null),
  result: z.enum(['win', 'loss', 'breakeven', 'open']).nullish(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CTraderPayload = z.infer<typeof cTraderPayloadSchema>;
