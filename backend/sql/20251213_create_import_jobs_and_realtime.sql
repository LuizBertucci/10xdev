-- Migration reference (applied in Supabase): create_import_jobs_and_realtime_publication
-- Creates public.import_jobs and adds tables to publication supabase_realtime.

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,

  status text not null default 'running',
  step text not null default 'starting',
  progress int not null default 0,
  message text,

  ai_requested boolean not null default false,
  ai_used boolean not null default false,
  ai_cards_created int not null default 0,

  cards_created int not null default 0,
  files_processed int not null default 0,

  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_project_id_idx on public.import_jobs(project_id);
create index if not exists import_jobs_created_by_idx on public.import_jobs(created_by);
create index if not exists import_jobs_status_idx on public.import_jobs(status);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_import_jobs_updated_at on public.import_jobs;
create trigger trg_import_jobs_updated_at
before update on public.import_jobs
for each row execute function public.set_updated_at();

alter table public.import_jobs enable row level security;

drop policy if exists "Members can view import jobs" on public.import_jobs;
create policy "Members can view import jobs" on public.import_jobs
for select
using (
  created_by = auth.uid()
  or public.is_project_member(import_jobs.project_id, auth.uid())
);

-- Avoid Supabase REST 500 due to potential RLS recursion when policies query project_members.
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
  );
$$;

grant execute on function public.is_project_member(uuid, uuid) to authenticated;
grant execute on function public.is_project_member(uuid, uuid) to anon;

drop policy if exists "Users can create import jobs" on public.import_jobs;
create policy "Users can create import jobs" on public.import_jobs
for insert
with check (created_by = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'import_jobs'
  ) then
    execute 'alter publication supabase_realtime add table public.import_jobs';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_cards'
  ) then
    execute 'alter publication supabase_realtime add table public.project_cards';
  end if;
end $$;


