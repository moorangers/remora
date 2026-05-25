-- Align trade_records with frozen cTrader webhook payload contract.
-- Safe, additive migration only. No drops.

alter table if exists public.trade_records
  add column if not exists risk_pips numeric(20, 10),
  add column if not exists reward_pips numeric(20, 10),
  add column if not exists rr_ratio numeric(20, 10),
  add column if not exists session_name text,
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

create index if not exists trade_records_session_name_idx
  on public.trade_records (session_name)
  where session_name is not null;

create index if not exists trade_records_source_opened_at_idx
  on public.trade_records (source_platform, opened_at desc);

create index if not exists trade_records_metadata_gin_idx
  on public.trade_records using gin (metadata);

comment on column public.trade_records.session_name is
  'Trading session label from source payload (e.g., asia, london, new-york).';

comment on column public.trade_records.risk_pips is
  'Risk distance in pips from source payload.';

comment on column public.trade_records.reward_pips is
  'Reward distance in pips from source payload.';

comment on column public.trade_records.rr_ratio is
  'Risk-reward ratio from source payload.';

comment on column public.trade_records.metadata is
  'Connector-specific context stored as JSON object.';
