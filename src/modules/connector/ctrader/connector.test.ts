import { describe, expect, it } from "vitest";
import { CTraderConnector } from "./connector";
import { cTraderPayloadSchema } from "./schema";

const validPayload = {
  ticket_id: 12345,
  stage: "OPEN",
  action: "BUY",
  strategy_name: "London Breakout",
  strategy_version: "1.0.0",
  symbol: "EURUSD",
  entry_price: "1.085",
  stop_loss: "1.08",
  take_profit: "1.095",
  volume: "10000",
  spread: "0.8",
  atr: "12.4",
  opened_at: "2026-05-24T10:00:00Z"
};

describe("CTraderConnector", () => {
  it("normalizes cTrader payloads into the shared domain shape", () => {
    const connector = new CTraderConnector();

    const normalized = connector.normalize(validPayload);

    expect(normalized).toMatchObject({
      sourcePlatform: "ctrader",
      sourceTradeId: "12345",
      stage: "OPEN",
      side: "buy",
      strategyName: "London Breakout",
      entryPrice: 1.085,
      result: "open"
    });
  });

  it("maps short actions to sell", () => {
    const connector = new CTraderConnector();

    const normalized = connector.normalize({
      ...validPayload,
      action: "SHORT"
    });

    expect(normalized.side).toBe("sell");
  });

  it("rejects invalid payloads", () => {
    const parsed = cTraderPayloadSchema.safeParse({
      ...validPayload,
      volume: "not-a-number"
    });

    expect(parsed.success).toBe(false);
  });
});
