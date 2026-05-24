# Mira Remora

Mira Remora is a trading intelligence platform that ingests activity from external trading bots, normalizes it into a shared domain model, stores it in Supabase, and prepares clean foundations for analytics dashboards.

## Milestone 1 Architecture

This repository uses a modular monolith shape:

- `src/app/api/ingest/ctrader`: Next.js App Router ingestion endpoint.
- `src/modules/connector`: external platform adapters. Milestone 1 includes cTrader.
- `src/modules/trade`: trade domain schema, service, mapper, and repository contract.
- `src/modules/snapshot`: market snapshot domain schema.
- `src/modules/event`: trade event domain schema.
- `src/lib/supabase`: Supabase client factory.
- `src/lib/errors`: route error handling and structured logging.
- `src/types`: shared domain types.
- `supabase/migrations`: database schema changes.

The route handler owns HTTP concerns only. Payload validation and field mapping live in the connector, OPEN/CLOSE business rules live in `TradeService`, and persistence lives behind `TradeRepository`.

## Ingestion Flow

`POST /api/ingest/ctrader`

1. Receives raw cTrader JSON.
2. Validates and normalizes it through `CTraderConnector`.
3. Applies trade business rules through `TradeService`.
4. Persists through `SupabaseTradeRepository`.
5. Returns `{ ok: true, data: trade }`.

Validation failures return `400 Bad Request`. Unexpected failures return `500 Internal Server Error`.

## cTrader Payload

Required fields:

```json
{
  "ticket_id": 12345,
  "stage": "OPEN",
  "action": "BUY",
  "strategy_name": "London Breakout",
  "strategy_version": "1.0.0",
  "symbol": "EURUSD",
  "entry_price": "1.085",
  "volume": "10000",
  "opened_at": "2026-05-24T10:00:00Z"
}
```

`stage` accepts `OPEN` or `CLOSE`. `action` accepts `buy`, `sell`, `long`, or `short` in any casing.

## Database

Run the Supabase migration in `supabase/migrations/20260524140000_milestone_1_trading_intelligence.sql`.

It creates:

- `trade_records`
- `market_snapshots`
- `trade_events`

`trade_records` has a unique constraint on `(source_platform, source_trade_id)` so future connectors can share the same duplicate-prevention strategy.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Server-side ingestion prefers `SUPABASE_SERVICE_ROLE_KEY` and falls back to `SUPABASE_ANON_KEY`.

## Development

```bash
yarn install
yarn dev
yarn test
```

## Future Connector Path

To add MT5, Binance, Bybit, or custom bots:

1. Add a connector under `src/modules/connector/<platform>`.
2. Implement `TradeConnector.normalize`.
3. Reuse `TradeService` and `TradeRepository`.
4. Add an App Router endpoint under `src/app/api/ingest/<platform>`.
