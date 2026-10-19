-- Content Autopilot - WhatsApp leads
-- Run after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- settings: WhatsApp contact
-- ---------------------------------------------------------------------------
alter table public.settings
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_message text;

-- ---------------------------------------------------------------------------
-- leads: visitors who asked to chat on WhatsApp
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_phone text not null,
  visitor_name text,
  visitor_message text,
  page_path text,
  article_slug text,
  referrer text,
  user_agent text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_leads_created_idx
  on public.whatsapp_leads (created_at desc);
create index if not exists whatsapp_leads_status_idx
  on public.whatsapp_leads (status, created_at desc);

alter table public.whatsapp_leads enable row level security;

-- No public policies: the public write goes through /api/leads/whatsapp
-- (service-role), and reads are admin-only. The anon key cannot touch this table.

drop trigger if exists whatsapp_leads_set_updated_at on public.whatsapp_leads;
create trigger whatsapp_leads_set_updated_at
  before update on public.whatsapp_leads
  for each row execute function public.set_updated_at();
