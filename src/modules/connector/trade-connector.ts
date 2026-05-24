import type { NormalizedTradePayload } from "@/types";

export interface TradeConnector {
  normalize(payload: unknown): NormalizedTradePayload;
}
