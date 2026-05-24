import { z } from "zod";

export const tradeEventSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  eventType: z.string().min(1),
  eventTime: z.string().datetime(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime()
});
