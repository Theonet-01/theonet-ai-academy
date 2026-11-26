-- TheoNet AI Academy: Paystack + fixed course pricing migration
-- Run once in Supabase SQL Editor after taking a database backup.

-- Every individual course has a fixed price of NGN 5,000.
update public.courses set price_ngn = 5000 where price_ngn <> 5000;

-- Keep the earlier test-only course out of the public catalogue.
update public.courses set is_published = false
where lower(title) like 'test course%';

alter table public.courses
  drop constraint if exists courses_price_ngn_fixed_5000;
alter table public.courses
  add constraint courses_price_ngn_fixed_5000 check (price_ngn = 5000);

-- Identify whether a Paystack payment is for one course or the complete bundle.
alter table public.payments
  add column if not exists item_type text not null default 'course';
alter table public.payments
  drop constraint if exists payments_item_type_check;
alter table public.payments
  add constraint payments_item_type_check check (item_type in ('course','bundle'));

-- Seed the three advertised individual courses if they are not already present.
insert into public.courses (title, description, price_ngn, image_url, is_published)
select 'AI Image Generation', 'Learn structured visual prompting, style direction and AI image generation workflows.', 5000,
       'https://res.cloudinary.com/hvncv4da/image/upload/v1789913646/main-sample.png', true
where not exists (select 1 from public.courses where lower(title) = lower('AI Image Generation'));

insert into public.courses (title, description, price_ngn, image_url, is_published)
select 'AI Video Generation', 'Plan scenes, write scripts and learn practical AI video creation workflows.', 5000,
       'https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/v.jpg', true
where not exists (select 1 from public.courses where lower(title) = lower('AI Video Generation'));

insert into public.courses (title, description, price_ngn, image_url, is_published)
select 'AI Animation', 'Explore motion sequences, character flow and AI-assisted visual storytelling.', 5000,
       'https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/6.jpg', true
where not exists (select 1 from public.courses where lower(title) = lower('AI Animation'));

-- Existing RLS policies should remain enabled. The Edge Functions use the
-- server-side Supabase secret key to create/verify payments and enrolments.
-- Do not add a browser-side INSERT/UPDATE policy for payments.
