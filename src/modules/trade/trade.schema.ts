import { z } from 'zod';

export const sourcePlatformSchema = z.enum([
  'ctrader',
  'mt5',
  'binance',
  'bybit',
  'custom',
]);
export const tradeSideSchema = z.enum(['buy', 'sell']);
export const tradeStageSchema = z.enum(['OPEN', 'CLOSE']);
export const tradeResultSchema = z.enum(['win', 'loss', 'breakeven', 'open']);

export const normalizedTradePayloadSchema = z
  .object({
    sourcePlatform: sourcePlatformSchema,
    sourceTradeId: z.string().min(1),
    stage: tradeStageSchema,
    strategyName: z.string().min(1),
    strategyVersion: z.string().min(1).nullable(),
    sessionName: z.string().min(1).nullable().optional(),
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
    riskPips: z.number().finite().nullable().optional(),
    rewardPips: z.number().finite().nullable().optional(),
    rrRatio: z.number().finite().nullable().optional(),
    maePips: z.number().finite().nullable(),
    mfePips: z.number().finite().nullable(),
    openedAt: z.string().datetime(),
    closedAt: z.string().datetime().nullable(),
    result: tradeResultSchema.nullable(),
    metadata: z.record(z.unknown()),
  })
  .superRefine((payload, context) => {
    if (payload.stage === 'OPEN' && payload.closedAt !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closedAt'],
        message: 'OPEN trades must not include closedAt.',
      });
    }

    if (payload.stage === 'OPEN' && payload.result !== 'open') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['result'],
        message: 'OPEN trades must have result set to open.',
      });
    }

    if (payload.stage === 'CLOSE' && payload.closedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closedAt'],
        message: 'CLOSE trades must include closedAt.',
      });
    }

    if (payload.stage === 'CLOSE' && payload.exitPrice === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['exitPrice'],
        message: 'CLOSE trades must include exitPrice.',
      });
    }
  });

export type NormalizedTradePayloadInput = z.infer<
  typeof normalizedTradePayloadSchema
>;
