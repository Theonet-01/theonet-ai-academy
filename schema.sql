-- TheoNet Academy starter schema for Supabase
-- Run this in Supabase SQL Editor. Review before production use.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price_ngn numeric(12,2) not null default 0 check (price_ngn >= 0),
  image_url text,
  video_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','active','rejected')),
  created_at timestamptz not null default now(),
  unique(student_id, course_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid references public.courses(id) on delete set null,
  amount_ngn numeric(12,2) not null check (amount_ngn >= 0),
  provider text not null default 'manual',
  provider_reference text unique,
  status text not null default 'pending' check (status in ('pending','successful','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_title text not null,
  brief text not null default '',
  quoted_amount_ngn numeric(12,2),
  status text not null default 'new' check (status in ('new','quoted','paid','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  certificate_code text not null unique,
  issued_at timestamptz not null default now(),
  unique(student_id, course_id)
);

-- Automatically create a student profile after Supabase Auth registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Role check helper; SECURITY DEFINER avoids recursive profile RLS evaluation.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;
alter table public.service_orders enable row level security;
alter table public.certificates enable row level security;

create policy "Profiles readable by owner or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Users update own basic profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'student');
create policy "Admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Published courses visible to everyone" on public.courses
for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "Admins manage courses" on public.courses
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students see own enrolments" on public.enrollments
for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Students request own enrolment" on public.enrollments
for insert to authenticated with check (student_id = auth.uid() and status = 'pending');
create policy "Admins manage enrolments" on public.enrollments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students see own payments" on public.payments
for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage payments" on public.payments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Customers see own service orders" on public.service_orders
for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "Customers create own service orders" on public.service_orders
for insert to authenticated with check (customer_id = auth.uid());
create policy "Admins manage service orders" on public.service_orders
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students see own certificates" on public.certificates
for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage certificates" on public.certificates
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Create your first admin only AFTER registering your own account.
-- Replace the email with the exact email used for your TheoNet account.
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'YOUR-ADMIN-EMAIL');

-- Storage: create private buckets named "course-videos" and "course-files"
-- in Supabase Storage. Add policies that grant reads only to enrolled students
-- and admins. Do not make paid course media public.
