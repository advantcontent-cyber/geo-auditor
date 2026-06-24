-- AMN GEO Auditor — Supabase setup
-- Run this once in your Supabase project: SQL Editor > New query > paste > Run.

-- 1. Table to log each audit
create table if not exists public.audits (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  url              text,
  domain           text,
  property_name    text,
  score            int,
  grade            text,
  engine           text,          -- 'ai' | 'heuristic'
  web_search       boolean default false,
  appears          boolean default false,
  worst_dimensions jsonb
);

create index if not exists audits_created_at_idx on public.audits (created_at desc);
create index if not exists audits_domain_idx     on public.audits (domain);

-- 2. Lock the table down. RLS on + no policies = only the service_role key
--    (used by the server) can read or write. The public anon key cannot.
alter table public.audits enable row level security;

-- 3. Aggregates for the dashboard, returned in one call
create or replace function public.admin_audit_stats()
returns json
language sql
stable
as $$
  select json_build_object(
    'total',           (select count(*) from public.audits),
    'unique_sites',    (select count(distinct domain) from public.audits),
    'this_week',       (select count(*) from public.audits where created_at >= now() - interval '7 days'),
    'avg_score',       (select coalesce(round(avg(score)), 0) from public.audits),
    'ai_count',        (select count(*) from public.audits where engine = 'ai'),
    'heuristic_count', (select count(*) from public.audits where engine = 'heuristic'),
    'daily', (
      select coalesce(json_agg(json_build_object('day', day, 'count', c) order by day), '[]'::json)
      from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*) as c
        from public.audits
        where created_at >= now() - interval '14 days'
        group by 1
      ) t
    )
  );
$$;
