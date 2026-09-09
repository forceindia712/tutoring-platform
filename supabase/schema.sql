-- ============================================================
-- Spotkania z uczniem – schemat bazy danych
-- Uruchom ten plik w Supabase: SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabele
-- ------------------------------------------------------------

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  notes text,
  student_access_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  meeting_number integer not null,
  meeting_date date not null,
  meeting_time time not null,
  meeting_url text,
  instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint meetings_student_number_unique unique (student_id, meeting_number)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  type text not null
    check (type in ('link', 'file', 'text', 'assignment', 'note')),
  title text not null,
  description text,
  url text,
  file_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meetings_student_date_idx
  on public.meetings (student_id, meeting_date desc, meeting_time desc);

create index if not exists materials_meeting_order_idx
  on public.materials (meeting_id, sort_order asc);

-- Aktualizacja pola updated_at przy edycji spotkania
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
-- Dostęp mają wyłącznie zalogowani (uwierzytelnieni) użytkownicy,
-- czyli nauczyciel. Strona ucznia nie czyta bazy bezpośrednio z
-- przeglądarki – obsługuje ją serwer aplikacji (service role).
-- ------------------------------------------------------------

alter table public.students enable row level security;
alter table public.meetings enable row level security;
alter table public.materials enable row level security;

create policy "Teacher can manage students"
  on public.students
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Teacher can manage meetings"
  on public.meetings
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Teacher can manage materials"
  on public.materials
  for all
  to authenticated
  using (true)
  with check (true);

-- Role bez logowania nie widzą nic (brak polityk dla anon).
-- Uprawnienia tabel nadajemy tylko uwierzytelnionemu nauczycielowi:
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant select, insert, update, delete on public.materials to authenticated;

-- ------------------------------------------------------------
-- Storage (prywatny koszyk na pliki materiałów)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('meeting-materials', 'meeting-materials', false)
on conflict (id) do nothing;

create policy "Teacher can upload meeting materials"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'meeting-materials' and owner_id = auth.uid());

create policy "Teacher can view meeting materials"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'meeting-materials' and owner_id = auth.uid());

create policy "Teacher can update meeting materials"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'meeting-materials' and owner_id = auth.uid())
  with check (bucket_id = 'meeting-materials' and owner_id = auth.uid());

create policy "Teacher can delete meeting materials"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'meeting-materials' and owner_id = auth.uid());

-- Uczniowie pobierają pliki przez krótkotrwałe podpisane URL-e
-- generowane przez aplikację (service role), więc nie potrzebują
-- żadnej polityki odczytu.
