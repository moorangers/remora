# MS2 Production Readiness Audit

Project: Mira Remora Trading Intelligence
Date: 2026-05-25
Reviewer: Senior Staff Engineer

## 1) Scope Discovery

### Trade Entity Definitions

- src/types/domain.ts
- src/modules/trade/domain/trade.types.ts

### Zod Schemas

- src/modules/connector/ctrader/schema.ts
- src/modules/trade/trade.schema.ts
- src/modules/trade/domain/trade.schema.ts

### DTOs / Contract Shapes

- src/types/domain.ts (NormalizedTradePayload, TradeRecord)
- src/modules/connector/ctrader/schema.ts (CTraderPayload)
- src/modules/trade/trade.schema.ts (NormalizedTradePayloadInput)
- src/modules/trade/domain/trade.schema.ts (CTraderRawPayload, TradeRecordInput)

### Repository Mapping

- src/modules/trade/trade.mapper.ts

### Supabase Statements (insert/update/select)

- src/modules/trade/repository.ts
- src/lib/supabase/index.ts

### Analytics Queries / Computation Inputs

- src/modules/trade/analytics.ts
- src/modules/trade/analytics.validation.datasets.ts

## 2) Data Contract Matrix

| Field Name       | Type                     | Required     | Source          | DB Column             | Used By                                                                    |
| ---------------- | ------------------------ | ------------ | --------------- | --------------------- | -------------------------------------------------------------------------- |
| source_platform  | enum                     | Yes          | cTrader payload | source_platform       | connector parser, repository filters                                       |
| ticket_id        | string                   | Yes          | cTrader payload | source_trade_id       | connector normalize, repository key lookup                                 |
| stage            | enum OPEN/CLOSE          | Yes          | cTrader payload | N/A (lifecycle logic) | service ingest logic, zod lifecycle checks                                 |
| strategy_name    | string                   | Yes          | cTrader payload | strategy_name         | schema validation, repository mapping, strategy analytics readiness        |
| strategy_version | string nullable          | Yes nullable | cTrader payload | strategy_version      | schema validation, repository mapping, strategy-version analysis readiness |
| session_name     | string nullable          | Yes nullable | cTrader payload | session_name          | connector normalize, repository mapping, session analytics readiness       |
| symbol           | string                   | Yes          | cTrader payload | symbol                | repository filters, symbol analytics                                       |
| action           | enum buy/sell/long/short | Yes          | cTrader payload | mapped to side        | connector side mapping                                                     |
| entry_price      | number                   | Yes          | cTrader payload | entry_price           | schema validation, persistence                                             |
| exit_price       | number nullable          | Yes nullable | cTrader payload | exit_price            | lifecycle close validation, persistence                                    |
| stop_loss        | number nullable          | Yes nullable | cTrader payload | stop_loss             | persistence                                                                |
| take_profit      | number nullable          | Yes nullable | cTrader payload | take_profit           | persistence                                                                |
| volume           | number                   | Yes          | cTrader payload | volume                | schema validation, persistence                                             |
| gross_profit     | number nullable          | Yes nullable | cTrader payload | gross_profit          | persistence                                                                |
| net_profit       | number nullable          | Yes nullable | cTrader payload | net_profit            | analytics (win rate/profit factor/expectancy/net)                          |
| commission       | number nullable          | Yes nullable | cTrader payload | commission            | persistence                                                                |
| swap_fee         | number nullable          | Yes nullable | cTrader payload | swap_fee              | persistence                                                                |
| spread           | number nullable          | Yes nullable | cTrader payload | spread                | persistence                                                                |
| atr              | number nullable          | Yes nullable | cTrader payload | atr                   | persistence, ATR analysis readiness                                        |
| risk_pips        | number nullable          | Yes nullable | cTrader payload | risk_pips             | persistence, RR analysis readiness                                         |
| reward_pips      | number nullable          | Yes nullable | cTrader payload | reward_pips           | persistence, RR analysis readiness                                         |
| rr_ratio         | number nullable          | Yes nullable | cTrader payload | rr_ratio              | persistence, average RR readiness                                          |
| mae_pips         | number nullable          | Yes nullable | cTrader payload | mae_pips              | MAE analytics                                                              |
| mfe_pips         | number nullable          | Yes nullable | cTrader payload | mfe_pips              | MFE analytics                                                              |
| opened_at        | datetime                 | Yes          | cTrader payload | opened_at             | persistence, date-range queries                                            |
| closed_at        | datetime nullable        | Yes nullable | cTrader payload | closed_at             | close lifecycle, persistence                                               |
| result           | enum                     | Yes          | cTrader payload | result                | lifecycle, win/loss analytics                                              |
| metadata         | json object              | Yes          | cTrader payload | metadata              | persistence, session fallback analytics                                    |

## 3) Missing Columns Report

Columns referenced by code that can be missing in runtime DB when contract migrations are not applied:

- risk_pips
- reward_pips
- rr_ratio
- metadata
- session_name

Observed runtime examples (reported):

- trade_records.risk_pips does not exist
- trade_records.reward_pips does not exist
- trade_records.rr_ratio does not exist
- trade_records.metadata does not exist

## 4) Dead Columns Report

Trade table dead columns found: none.

All current trade_records columns are consumed by mapping, filtering, lifecycle, or analytics readiness paths.

## 5) Migration SQL (Single File)

Generated migration:

- supabase/migrations/20260525233000_trade_records_payload_contract_alignment.sql

Highlights:

- ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS risk_pips
- ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS reward_pips
- ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS rr_ratio
- ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS session_name
- ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS metadata
- metadata not-null/default/object-check guard
- additive indexes for session_name, source+opened_at, metadata gin

No drop operations included.

## 6) Repository Fixes

Updated:

- createTrade() mapping consistency
- updateTrade() mapping consistency
- findBySourceTradeId() consistency (delegates to findByTradeId)
- findById() added and implemented

Files:

- src/modules/trade/repository.ts
- src/modules/trade/trade.mapper.ts

## 7) Analytics Readiness Report

Schema support status:

- Win Rate: supported (result, net_profit)
- Profit Factor: supported (result, net_profit)
- Average RR: supported at schema level (rr_ratio)
- Expectancy: supported (net_profit)
- MAE/MFE Analysis: supported (mae_pips, mfe_pips)
- Session Analysis: supported (session_name; metadata fallback)
- Symbol Analysis: supported (symbol)
- Strategy Version Analysis: supported (strategy_version)

Notes:

- analytics.ts now resolves session from sessionName first, then metadata.sessionName fallback.
- Average RR computation function is not implemented in analytics.ts yet, but required data fields are now present in schema/mapping.

## Freeze Recommendation

READY_FOR_MS2 = FALSE

Reason:

- Code, DTOs, schemas, and mappings are aligned after this audit pass.
- Runtime DB in target environment is still out-of-sync until migration is applied.
- Set to TRUE only after executing pending migration(s) in the target Supabase environment and validating ingest at runtime.
