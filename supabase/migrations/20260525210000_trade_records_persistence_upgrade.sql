-- Persistence hardening for trade_records: adds analytics fields and repository query indexes.

alter table if exists public.trade_records
  add column if not exists risk_pips numeric(20, 10),
  add column if not exists reward_pips numeric(20, 10),
  add column if not exists rr_ratio numeric(20, 10),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.trade_records
set metadata = '{}'::jsonb
where metadata is null;

alter table public.trade_records
  alter column metadata set not null,
  alter column metadata set default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_records_metadata_object_check'
      and conrelid = 'public.trade_records'::regclass
  ) then
    alter table public.trade_records
      add constraint trade_records_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_records_source_unique'
      and conrelid = 'public.trade_records'::regclass
  ) then
    alter table public.trade_records
      add constraint trade_records_source_unique
      unique (source_platform, source_trade_id);
  end if;
end;
$$;

-- Query acceleration for latest and date-range retrieval.
create index if not exists trade_records_source_opened_at_idx
  on public.trade_records (source_platform, opened_at desc);

create index if not exists trade_records_opened_closed_idx
  on public.trade_records (opened_at desc, closed_at desc);

create index if not exists trade_records_strategy_symbol_opened_at_idx
  on public.trade_records (strategy_name, symbol, opened_at desc);

create index if not exists trade_records_metadata_gin_idx
  on public.trade_records using gin (metadata);

comment on column public.trade_records.risk_pips is
  'Risk distance in pips, usually |entry_price - stop_loss| converted to pips.';

comment on column public.trade_records.reward_pips is
  'Reward distance in pips, usually |take_profit - entry_price| converted to pips.';

comment on column public.trade_records.rr_ratio is
  'Risk-reward ratio, typically reward_pips / risk_pips.';

comment on column public.trade_records.metadata is
  'Connector-specific payload and analytics context stored as JSON object.';
