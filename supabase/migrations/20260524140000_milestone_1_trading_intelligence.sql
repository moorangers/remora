create extension if not exists "pgcrypto";

create table if not exists public.trade_records (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null,
  source_trade_id text not null,
  strategy_name text not null,
  strategy_version text,
  symbol text not null,
  side text not null,
  entry_price numeric(20, 10) not null,
  exit_price numeric(20, 10),
  stop_loss numeric(20, 10),
  take_profit numeric(20, 10),
  volume numeric(28, 10) not null,
  gross_profit numeric(28, 10),
  net_profit numeric(28, 10),
  commission numeric(28, 10),
  swap_fee numeric(28, 10),
  spread numeric(20, 10),
  atr numeric(20, 10),
  mae_pips numeric(20, 10),
  mfe_pips numeric(20, 10),
  opened_at timestamptz not null,
  closed_at timestamptz,
  result text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trade_records_source_platform_check
    check (source_platform in ('ctrader', 'mt5', 'binance', 'bybit', 'custom')),
  constraint trade_records_side_check
    check (side in ('buy', 'sell')),
  constraint trade_records_result_check
    check (result in ('win', 'loss', 'breakeven', 'open')),
  constraint trade_records_volume_positive_check
    check (volume > 0),
  constraint trade_records_open_close_time_check
    check (closed_at is null or closed_at >= opened_at),
  constraint trade_records_open_result_check
    check (
      (closed_at is null and result = 'open')
      or (closed_at is not null and result in ('win', 'loss', 'breakeven'))
    ),
  constraint trade_records_source_unique
    unique (source_platform, source_trade_id)
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null,
  atr numeric(20, 10),
  adx numeric(20, 10),
  rsi numeric(20, 10),
  spread numeric(20, 10),
  session_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint market_snapshots_trade_id_fkey
    foreign key (trade_id) references public.trade_records(id) on delete cascade,
  constraint market_snapshots_rsi_range_check
    check (rsi is null or (rsi >= 0 and rsi <= 100)),
  constraint market_snapshots_adx_non_negative_check
    check (adx is null or adx >= 0),
  constraint market_snapshots_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.trade_events (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null,
  event_type text not null,
  event_time timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint trade_events_trade_id_fkey
    foreign key (trade_id) references public.trade_records(id) on delete cascade,
  constraint trade_events_event_type_check
    check (event_type in ('open', 'close', 'modify', 'partial_close', 'snapshot', 'note')),
  constraint trade_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists trade_records_source_platform_idx
  on public.trade_records (source_platform);

create index if not exists trade_records_source_trade_id_idx
  on public.trade_records (source_trade_id);

create index if not exists trade_records_strategy_idx
  on public.trade_records (strategy_name, strategy_version);

create index if not exists trade_records_symbol_idx
  on public.trade_records (symbol);

create index if not exists trade_records_opened_at_idx
  on public.trade_records (opened_at desc);

create index if not exists trade_records_platform_symbol_opened_at_idx
  on public.trade_records (source_platform, symbol, opened_at desc);

create index if not exists trade_records_strategy_opened_at_idx
  on public.trade_records (strategy_name, strategy_version, opened_at desc);

create index if not exists trade_records_closed_at_idx
  on public.trade_records (closed_at desc)
  where closed_at is not null;

create index if not exists trade_records_open_positions_idx
  on public.trade_records (source_platform, opened_at desc)
  where closed_at is null;

create index if not exists trade_records_result_idx
  on public.trade_records (result);

create index if not exists market_snapshots_trade_id_idx
  on public.market_snapshots (trade_id);

create index if not exists market_snapshots_session_name_idx
  on public.market_snapshots (session_name)
  where session_name is not null;

create index if not exists market_snapshots_metadata_gin_idx
  on public.market_snapshots using gin (metadata);

create index if not exists trade_events_trade_id_event_time_idx
  on public.trade_events (trade_id, event_time desc);

create index if not exists trade_events_event_type_idx
  on public.trade_events (event_type);

create index if not exists trade_events_event_time_idx
  on public.trade_events (event_time desc);

create index if not exists trade_events_metadata_gin_idx
  on public.trade_events using gin (metadata);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trade_records_set_updated_at on public.trade_records;
create trigger trade_records_set_updated_at
before update on public.trade_records
for each row execute function public.set_updated_at();

drop trigger if exists market_snapshots_set_updated_at on public.market_snapshots;
create trigger market_snapshots_set_updated_at
before update on public.market_snapshots
for each row execute function public.set_updated_at();

comment on table public.trade_records is
  'Normalized trade lifecycle records ingested from external trading platforms such as cTrader, MT5, Binance, Bybit, and custom bots.';

comment on column public.trade_records.source_platform is
  'External platform identifier. Supported values are ctrader, mt5, binance, bybit, and custom.';

comment on column public.trade_records.source_trade_id is
  'Trade or order identifier from the source platform. Unique together with source_platform.';

comment on column public.trade_records.strategy_name is
  'Human-readable strategy or bot name that produced the trade.';

comment on column public.trade_records.strategy_version is
  'Optional strategy version for comparing bot releases and parameter sets.';

comment on column public.trade_records.result is
  'Trade outcome. Open trades must remain open until closed_at is set.';

comment on table public.market_snapshots is
  'Market indicators and contextual metadata captured around a trade.';

comment on column public.market_snapshots.metadata is
  'Connector-specific or dashboard-specific snapshot context stored as a JSON object.';

comment on table public.trade_events is
  'Timeline of normalized trade lifecycle events and annotations.';

comment on column public.trade_events.event_type is
  'Normalized event type for the trade timeline.';

comment on column public.trade_events.metadata is
  'Connector-specific or event-specific context stored as a JSON object.';
