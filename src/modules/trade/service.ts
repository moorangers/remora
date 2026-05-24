import { AppError } from "@/lib/errors/app-error";
import type { NormalizedTradePayload, TradeRecord } from "@/types";
import type { TradeRepository } from "./repository";

export class TradeService {
  constructor(private readonly repository: TradeRepository) {}

  async ingest(payload: NormalizedTradePayload): Promise<TradeRecord> {
    this.assertLifecyclePayload(payload);

    if (payload.stage === "OPEN") {
      return this.createTrade(payload);
    }

    return this.closeTrade(payload);
  }

  async createTrade(payload: NormalizedTradePayload): Promise<TradeRecord> {
    const existing = await this.repository.findBySourceTradeId(payload.sourcePlatform, payload.sourceTradeId);

    if (existing) {
      return existing;
    }

    return this.repository.create(payload);
  }

  async closeTrade(payload: NormalizedTradePayload): Promise<TradeRecord> {
    const existing = await this.repository.findBySourceTradeId(payload.sourcePlatform, payload.sourceTradeId);

    if (!existing) {
      throw new AppError("Cannot close trade before an OPEN event is recorded.", 400, {
        sourcePlatform: payload.sourcePlatform,
        sourceTradeId: payload.sourceTradeId
      });
    }

    return this.repository.update(existing.id, payload);
  }

  private assertLifecyclePayload(payload: NormalizedTradePayload) {
    if (payload.stage === "OPEN" && payload.result !== "open") {
      throw new AppError("OPEN trades must have result set to open.", 400, {
        sourcePlatform: payload.sourcePlatform,
        sourceTradeId: payload.sourceTradeId
      });
    }

    if (payload.stage === "CLOSE" && (!payload.closedAt || payload.exitPrice === null)) {
      throw new AppError("CLOSE trades must include closedAt and exitPrice.", 400, {
        sourcePlatform: payload.sourcePlatform,
        sourceTradeId: payload.sourceTradeId
      });
    }
  }
}
