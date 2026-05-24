import { z } from "zod";

export const marketSnapshotSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  atr: z.number().finite().nullable(),
  adx: z.number().finite().nullable(),
  rsi: z.number().finite().nullable(),
  spread: z.number().finite().nullable(),
  sessionName: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
