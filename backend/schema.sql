-- Run this in Supabase SQL Editor

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  whatsapp text,
  business_type text,
  city text,
  team_size text,
  revenue_range text,
  source text,
  score integer default 40,
  score_reason text,
  ai_recommendation text,
  archived boolean default false,
  created_at timestamptz default now()
);

create table call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  date date,
  duration_min integer,
  outcome text,
  objection text,
  interest_rating integer check (interest_rating between 1 and 5),
  followup_date date,
  notes text,
  created_at timestamptz default now()
);

create table whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  date date,
  raw_text text,
  ai_sentiment text,
  ai_objection text,
  ai_cohort_promise text,
  ai_interest_signal text,
  ai_followup_needed boolean,
  ai_summary text,
  created_at timestamptz default now()
);

create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  is_active boolean default false,
  is_future boolean default false,
  created_at timestamptz default now()
);

create table cohort_leads (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  standing text default 'Interested',
  status text default 'active',
  added_at timestamptz default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  cohort_id uuid references cohorts(id),
  trigger_type text,
  message text,
  fire_at date,
  dismissed boolean default false,
  created_at timestamptz default now()
);

-- Seed: Future Cohort (permanent system bucket)
insert into cohorts (name, is_active, is_future) values ('Future Cohort', false, true);

-- Seed: Active cohort example
insert into cohorts (name, start_date, is_active, is_future) values ('July 2025', '2025-07-01', true, false);
