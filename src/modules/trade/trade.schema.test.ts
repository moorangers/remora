import { describe, expect, it } from "vitest";
import { normalizedTradePayloadSchema } from "./trade.schema";

const basePayload = {
  sourcePlatform: "ctrader",
  sourceTradeId: "12345",
  strategyName: "London Breakout",
  strategyVersion: "1.0.0",
  symbol: "EURUSD",
  side: "buy",
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
  openedAt: "2026-05-24T10:00:00.000Z",
  closedAt: null,
  metadata: {}
} as const;

describe("normalizedTradePayloadSchema", () => {
  it("accepts valid OPEN payloads", () => {
    const parsed = normalizedTradePayloadSchema.safeParse({
      ...basePayload,
      stage: "OPEN",
      result: "open"
    });

    expect(parsed.success).toBe(true);
  });

  it("requires CLOSE payloads to include close information", () => {
    const parsed = normalizedTradePayloadSchema.safeParse({
      ...basePayload,
      stage: "CLOSE",
      result: "win"
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid CLOSE payloads", () => {
    const parsed = normalizedTradePayloadSchema.safeParse({
      ...basePayload,
      stage: "CLOSE",
      exitPrice: 1.092,
      closedAt: "2026-05-24T12:00:00.000Z",
      result: "win"
    });

    expect(parsed.success).toBe(true);
  });
});
