-- Enable useful extension for UUID generation
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- opportunities
-- Current curated deal candidates shown in the feed
-- -------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),

  origin_airport text not null default 'PDX',
  destination_code text not null,
  destination text not null,

  category text not null check (category in ('domestic', 'americas', 'europe', 'other')),
  cabin text not null default 'economy' check (cabin in ('economy', 'business')),
  trip_type text not null default 'roundtrip' check (trip_type = 'roundtrip'),

  departure_date date not null,
  return_date date not null,

  fare numeric(10,2) not null check (fare >= 0),
  typical_price numeric(10,2) not null check (typical_price >= 0),
  percent_below_typical numeric(6,2) not null,

  currency text not null default 'USD',

  outbound_stops integer not null default 0 check (outbound_stops >= 0),
  inbound_stops integer not null default 0 check (inbound_stops >= 0),

  deal_found_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opportunities_return_after_departure
    check (return_date >= departure_date),

  constraint opportunities_destination_code_length
    check (char_length(destination_code) = 3),

  constraint opportunities_origin_airport_length
    check (char_length(origin_airport) = 3)
);

create index if not exists opportunities_active_idx
  on public.opportunities (is_active, category, fare);

create index if not exists opportunities_destination_idx
  on public.opportunities (destination_code);

create index if not exists opportunities_departure_idx
  on public.opportunities (departure_date);

create unique index if not exists opportunities_unique_live_trip_idx
  on public.opportunities (
    origin_airport,
    destination_code,
    departure_date,
    return_date,
    cabin
  )
  where is_active = true;

-- -------------------------------------------------------------------
-- fare_history
-- Historical fare observations used to calculate "typical" pricing
-- -------------------------------------------------------------------
create table if not exists public.fare_history (
  id uuid primary key default gen_random_uuid(),

  origin_airport text not null default 'PDX',
  destination_code text not null,

  category text not null check (category in ('domestic', 'americas', 'europe', 'other')),
  cabin text not null default 'economy' check (cabin in ('economy', 'business')),
  trip_type text not null default 'roundtrip' check (trip_type = 'roundtrip'),

  departure_date date not null,
  return_date date not null,

  observed_fare numeric(10,2) not null check (observed_fare >= 0),
  currency text not null default 'USD',
  observed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint fare_history_return_after_departure
    check (return_date >= departure_date),

  constraint fare_history_destination_code_length
    check (char_length(destination_code) = 3),

  constraint fare_history_origin_airport_length
    check (char_length(origin_airport) = 3)
);

create index if not exists fare_history_lookup_idx
  on public.fare_history (
    origin_airport,
    destination_code,
    cabin,
    departure_date,
    return_date,
    observed_at desc
  );

create index if not exists fare_history_category_idx
  on public.fare_history (category);

-- -------------------------------------------------------------------
-- updated_at trigger for opportunities
-- -------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists opportunities_set_updated_at on public.opportunities;

create trigger opportunities_set_updated_at
before update on public.opportunities
for each row
execute function public.set_updated_at();