# Supabase Reset Runbook (Local + Remote)

Project: Mira Remora Trading Intelligence

Use case:

- Apply destructive reset migration safely
- Recreate trading intelligence schema
- Verify critical columns and runtime behavior after apply

Target migration:

- supabase/migrations/20260525234500_reset_trading_intelligence_schema.sql

---

## 0) Prerequisites

1. Supabase CLI installed and authenticated
2. Access to target Supabase project
3. Ingestion traffic can be paused during migration window
4. Backup policy confirmed (mandatory for remote)

---

## 1) Local End-to-End (copy and run)

Run from repository root.

Step 1: Start local stack

PowerShell:

supabase stop
supabase start

Checkpoint:

- Local containers are healthy
- No startup errors

Step 2: Reset local database using migrations

PowerShell:

supabase db reset

Checkpoint:

- Reset completes without errors
- New reset migration is applied

Step 3: Run test suite

PowerShell:

yarn vitest run src/modules/connector/ctrader/connector.test.ts src/modules/trade/service.test.ts src/modules/trade/trade.schema.test.ts src/modules/trade/repository.test.ts src/modules/trade/domain/trade.contract.test.ts src/modules/trade/analytics.test.ts src/modules/trade/analytics.validation.test.ts

Checkpoint:

- All tests pass

Step 4: Execute smoke SQL on local

PowerShell:

supabase db connect --local

Then execute the SQL in section 3.

Checkpoint:

- All smoke queries return expected PASS conditions

---

## 2) Remote Apply (safe step-by-step)

Important:

- This migration drops and recreates trade_records, market_snapshots, trade_events
- Existing data in these tables will be lost

### 2.1 Pre-flight safety

Step A: Freeze writes to ingestion endpoint

Checklist:

- Pause webhook sender OR disable ingest route at edge/app level
- Confirm no new writes arriving

Step B: Backup before apply

Checklist:

- Create backup/snapshot from Supabase Dashboard
- Record backup timestamp and operator

Step C: Link CLI to correct project

PowerShell:

supabase link --project-ref YOUR_PROJECT_REF

Checkpoint:

- Link target is correct production/staging project

Step D: Inspect pending migrations

PowerShell:

supabase migration list

Checkpoint:

- Verify expected pending migration includes reset file
- Verify no unintended migration will be applied

### 2.2 Apply migration

PowerShell:

supabase db push

Checkpoint:

- Push completes with success
- No SQL errors

### 2.3 Post-apply verification

Step E: Run smoke SQL on remote

PowerShell:

supabase db connect

Then execute the SQL in section 3.

Checkpoint:

- Column existence checks pass
- Insert/rollback contract check passes

Step F: Functional checks

Checklist:

- Ingest one OPEN payload
- Ingest one CLOSE payload for same source_trade_id
- Verify read path works via repository queries
- Verify analytics endpoints/jobs can read data

Step G: Unfreeze writes

Checklist:

- Re-enable webhook sender / ingest endpoint
- Monitor logs for 15-30 minutes

Rollback note:

- Since this is destructive reset, rollback means restore from backup snapshot

---

## 3) SQL Smoke Queries (post-apply)

Run these in SQL editor or via supabase db connect.

### 3.1 Verify required columns exist

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
and table_name = 'trade_records'
and column_name in (
'risk_pips',
'reward_pips',
'rr_ratio',
'metadata',
'session_name'
)
order by column_name;

Expected:

- 5 rows returned

### 3.2 Verify metadata is jsonb and object check is valid in practice

select
pg_typeof(metadata) as metadata_type,
count(\*) as rows_checked
from public.trade_records
group by pg_typeof(metadata);

Expected:

- metadata_type is jsonb when rows exist

### 3.3 Verify unique key exists (source_platform, source_trade_id)

select conname
from pg_constraint
where conrelid = 'public.trade_records'::regclass
and conname = 'trade_records_source_unique';

Expected:

- one row: trade_records_source_unique

### 3.4 Verify write contract with transaction rollback

begin;

insert into public.trade_records (
source_platform,
source_trade_id,
strategy_name,
strategy_version,
session_name,
symbol,
side,
entry_price,
exit_price,
stop_loss,
take_profit,
volume,
gross_profit,
net_profit,
commission,
swap_fee,
spread,
atr,
risk_pips,
reward_pips,
rr_ratio,
mae_pips,
mfe_pips,
opened_at,
closed_at,
result,
metadata
)
values (
'ctrader',
'smoke-contract-001',
'Smoke Strategy',
'1.0.0',
'london',
'EURUSD',
'buy',
1.10000,
null,
1.09500,
1.11000,
10000,
null,
null,
0,
0,
1,
12,
10,
20,
2,
null,
null,
now(),
null,
'open',
'{}'::jsonb
);

select
source_platform,
source_trade_id,
risk_pips,
reward_pips,
rr_ratio,
metadata,
session_name
from public.trade_records
where source_trade_id = 'smoke-contract-001';

rollback;

Expected:

- insert/select succeeds
- row visible inside transaction
- no persistence after rollback

### 3.5 Verify critical indexes exist

select indexname
from pg_indexes
where schemaname = 'public'
and tablename = 'trade_records'
and indexname in (
'trade_records_source_unique',
'trade_records_source_platform_idx',
'trade_records_source_trade_id_idx',
'trade_records_source_opened_at_idx',
'trade_records_session_name_idx',
'trade_records_metadata_gin_idx'
)
order by indexname;

Expected:

- Index set exists as designed

---

## 4) Go/No-Go Checklist

Go only if all true:

1. Migration apply succeeded
2. Required 5 columns exist (risk_pips, reward_pips, rr_ratio, metadata, session_name)
3. Insert/rollback smoke test passed
4. OPEN and CLOSE ingest flow passed
5. No runtime errors in logs for missing columns

If any fail:

- Keep ingest paused
- Restore from backup (remote) or rerun local reset (local)
- Fix migration/code mismatch before retry
