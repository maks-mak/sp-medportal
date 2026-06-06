create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique,
    auth_email text unique not null,
    full_name text not null,
    short_name text not null,
    login text not null unique,
    department_type text not null,
    department_name text not null,
    position text not null,
    role text not null default 'employee' check (role in ('employee', 'okk_member', 'okk_head', 'admin')),
    status text not null default 'pending' check (status in ('pending', 'approved', 'blocked', 'rejected')),
    is_active boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.registration_requests (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid unique not null references public.profiles(id) on delete cascade,
    auth_user_id uuid unique not null,
    auth_email text unique not null,
    full_name text not null,
    department_type text not null,
    department_name text not null,
    position text not null,
    requested_login text not null unique,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by uuid references public.profiles(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.notices (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null,
    created_by uuid references public.profiles(id),
    created_at timestamptz not null default now()
);

create table if not exists public.notice_reads (
    id uuid primary key default gen_random_uuid(),
    notice_id uuid not null references public.notices(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    read_at timestamptz not null default now(),
    unique (notice_id, profile_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    from_profile_id uuid references public.profiles(id) on delete set null,
    to_channel text not null check (to_channel in ('chief', 'admin')),
    subject text not null,
    body text not null,
    status text not null default 'new' check (status in ('new', 'in_review', 'closed')),
    created_at timestamptz not null default now()
);

create table if not exists public.password_reset_requests (
    id uuid primary key default gen_random_uuid(),
    login text not null,
    department_name text not null,
    note text,
    status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
    reviewed_by uuid references public.profiles(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);

create unique index if not exists password_reset_requests_one_pending_per_login
    on public.password_reset_requests (login)
    where status = 'pending';

create index if not exists registration_requests_status_created_idx
    on public.registration_requests (status, created_at desc);

create index if not exists messages_status_created_idx
    on public.messages (status, created_at desc);

create index if not exists profiles_role_status_idx
    on public.profiles (role, status, created_at desc);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select id
    from public.profiles
    where auth_user_id = auth.uid()
      and is_active = true
      and status = 'approved'
    limit 1
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where auth_user_id = auth.uid()
      and is_active = true
      and status = 'approved'
    limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where auth_user_id = auth.uid()
          and is_active = true
          and status = 'approved'
          and role = 'admin'
    )
$$;

create or replace function public.has_quality_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where auth_user_id = auth.uid()
          and is_active = true
          and status = 'approved'
          and role in ('okk_member', 'okk_head', 'admin')
    )
$$;

alter table public.registration_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.notices enable row level security;
alter table public.notice_reads enable row level security;
alter table public.messages enable row level security;
alter table public.password_reset_requests enable row level security;

drop policy if exists "admins read requests" on public.registration_requests;
create policy "admins read requests"
on public.registration_requests
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins update requests" on public.registration_requests;
create policy "admins update requests"
on public.registration_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "own or admin read profile" on public.profiles;
create policy "own or admin read profile"
on public.profiles
for select
to authenticated
using (
    auth_user_id = auth.uid()
    or public.is_admin()
);

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "approved users read notices" on public.notices;
create policy "approved users read notices"
on public.notices
for select
to authenticated
using (public.current_profile_id() is not null);

drop policy if exists "admins manage notices" on public.notices;
create policy "admins manage notices"
on public.notices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "owners or admin read notice_reads" on public.notice_reads;
create policy "owners or admin read notice_reads"
on public.notice_reads
for select
to authenticated
using (profile_id = public.current_profile_id() or public.is_admin());

drop policy if exists "owners insert notice_reads" on public.notice_reads;
create policy "owners insert notice_reads"
on public.notice_reads
for insert
to authenticated
with check (profile_id = public.current_profile_id());

drop policy if exists "owners update notice_reads" on public.notice_reads;
create policy "owners update notice_reads"
on public.notice_reads
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "own or admin read messages" on public.messages;
create policy "own or admin read messages"
on public.messages
for select
to authenticated
using (
    from_profile_id = public.current_profile_id()
    or public.is_admin()
);

drop policy if exists "approved users insert messages" on public.messages;
create policy "approved users insert messages"
on public.messages
for insert
to authenticated
with check (from_profile_id = public.current_profile_id());

drop policy if exists "admins update messages" on public.messages;
create policy "admins update messages"
on public.messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "allow reset request insert" on public.password_reset_requests;

drop policy if exists "admins read reset requests" on public.password_reset_requests;
create policy "admins read reset requests"
on public.password_reset_requests
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins update reset requests" on public.password_reset_requests;
create policy "admins update reset requests"
on public.password_reset_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
