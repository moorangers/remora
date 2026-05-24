import { NextResponse, type NextRequest } from 'next/server';
import { CTraderConnector } from '@/modules/connector/ctrader';
import { SupabaseTradeRepository, TradeService } from '@/modules/trade';
import { handleRouteError, logger } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    logger.info('RAW PAYLOAD', { payload });

    const connector = new CTraderConnector();
    const normalizedPayload = connector.normalize(payload);
    logger.info('NORMALIZED PAYLOAD', { normalizedPayload });

    const tradeService = new TradeService(new SupabaseTradeRepository());
    const trade = await tradeService.ingest(normalizedPayload);

    logger.info('cTrader trade ingested.', {
      tradeId: trade.id,
      sourceTradeId: trade.sourceTradeId,
      stage: normalizedPayload.stage,
    });

    return NextResponse.json({
      ok: true,
      data: trade,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
