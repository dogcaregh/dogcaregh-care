-- ============================================================
-- DogCareGH — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── Enums ───────────────────────────────────────────────────
create type user_role         as enum ('owner', 'provider', 'admin');
create type dog_size          as enum ('small', 'medium', 'large', 'xlarge');
create type service_type      as enum ('pet_sitting', 'doggy_daycare', 'dog_boarding', 'mobile_grooming', 'dog_walking');
create type booking_status    as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type transaction_type  as enum ('payment', 'refund', 'payout');
create type transaction_status as enum ('pending', 'successful', 'failed');
create type payment_method    as enum ('mobile_money', 'card', 'bank_transfer');


-- ── Tables ──────────────────────────────────────────────────

-- users: extends Supabase auth.users; id must match auth.users.id
create table users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  email       text        not null unique,
  phone       text,
  role        user_role   not null default 'owner',
  location    text,
  created_at  timestamptz not null default now()
);

create table dogs (
  id                  uuid        primary key default uuid_generate_v4(),
  owner_id            uuid        not null references users(id) on delete cascade,
  name                text        not null,
  breed               text,
  age                 int,
  size                dog_size,
  temperament         text,
  vaccination_status  boolean     not null default false,
  created_at          timestamptz not null default now()
);

create table providers (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null unique references users(id) on delete cascade,
  bio               text,
  years_experience  smallint    check (years_experience >= 0),
  avatar_url        text,
  gallery_photos    text[]      not null default '{}',
  services          service_type[] not null default '{}',
  rates             jsonb       not null default '{}',
  availability      jsonb       not null default '{}',
  rating_avg        numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  review_count      int         not null default 0,
  verified          boolean     not null default false,
  active            boolean     not null default true,
  location          text,
  neighbourhood     text,
  created_at        timestamptz not null default now()
);

create table bookings (
  id                uuid           primary key default uuid_generate_v4(),
  owner_id          uuid           not null references users(id),
  provider_id       uuid           not null references providers(id),
  dog_id            uuid           not null references dogs(id),
  service_type      service_type   not null,
  start_date        date           not null,
  end_date          date           not null,
  status            booking_status not null default 'pending',
  gross_amount      numeric(10,2)  not null,
  commission_amount numeric(10,2)  not null default 0,
  provider_payout   numeric(10,2)  not null default 0,
  payment_ref       text,
  created_at        timestamptz    not null default now(),
  constraint bookings_dates_valid check (end_date >= start_date),
  constraint bookings_amounts_valid check (
    gross_amount >= 0 and
    commission_amount >= 0 and
    provider_payout >= 0 and
    commission_amount + provider_payout <= gross_amount
  )
);

create table reviews (
  id          uuid        primary key default uuid_generate_v4(),
  booking_id  uuid        not null unique references bookings(id),
  owner_id    uuid        not null references users(id),
  provider_id uuid        not null references providers(id),
  rating      smallint    not null check (rating between 1 and 5),
  text        text,
  created_at  timestamptz not null default now()
);

create table transactions (
  id          uuid                primary key default uuid_generate_v4(),
  booking_id  uuid                not null references bookings(id),
  type        transaction_type    not null,
  amount      numeric(10,2)       not null check (amount > 0),
  method      payment_method,
  status      transaction_status  not null default 'pending',
  timestamp   timestamptz         not null default now()
);

create table messages (
  id          uuid        primary key default uuid_generate_v4(),
  booking_id  uuid        not null references bookings(id),
  sender_id   uuid        not null references users(id),
  content     text,
  photo_url   text,
  created_at  timestamptz not null default now(),
  -- require at least one of content or photo_url
  constraint messages_has_body check (content is not null or photo_url is not null)
);


-- ── Indexes ─────────────────────────────────────────────────
create index on dogs        (owner_id);
create index on providers   (user_id);
create index on providers   (active, neighbourhood);
create index on bookings    (owner_id);
create index on bookings    (provider_id);
create index on bookings    (dog_id);
create index on bookings    (status);
create index on reviews     (provider_id);
create index on reviews     (owner_id);
create index on transactions (booking_id);
create index on messages    (booking_id);
create index on messages    (sender_id);


-- ── Trigger: keep providers.rating_avg in sync ──────────────
create or replace function update_provider_rating()
returns trigger language plpgsql security definer as $$
begin
  update providers
  set
    rating_avg   = (select round(avg(rating)::numeric, 2) from reviews where provider_id = new.provider_id),
    review_count = (select count(*)                        from reviews where provider_id = new.provider_id)
  where id = new.provider_id;
  return new;
end;
$$;

create trigger trg_update_provider_rating
  after insert or update on reviews
  for each row execute function update_provider_rating();


-- ── Trigger: auto-create user profile on sign-up ────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ── Row Level Security ───────────────────────────────────────
alter table users        enable row level security;
alter table dogs         enable row level security;
alter table providers    enable row level security;
alter table bookings     enable row level security;
alter table reviews      enable row level security;
alter table transactions enable row level security;
alter table messages     enable row level security;


-- USERS
create policy "users: own row select"
  on users for select
  using (auth.uid() = id);

-- Allows the search page to show provider names without authentication
create policy "users: public read for active providers"
  on users for select
  using (
    exists (
      select 1 from public.providers
      where providers.user_id = users.id
        and providers.active = true
    )
  );

-- Allows the profile page to show reviewer names without authentication
create policy "users: public read for reviewers"
  on users for select
  using (
    exists (
      select 1 from public.reviews
      where reviews.owner_id = users.id
    )
  );

create policy "users: own row insert"
  on users for insert
  with check (auth.uid() = id);

create policy "users: own row update"
  on users for update
  using (auth.uid() = id);


-- DOGS
create policy "dogs: owners manage their dogs"
  on dogs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Providers need to read dog details for their confirmed bookings
create policy "dogs: providers read via bookings"
  on dogs for select
  using (
    exists (
      select 1 from bookings b
      join providers p on p.id = b.provider_id
      where b.dog_id = dogs.id
        and p.user_id = auth.uid()
    )
  );


-- PROVIDERS
-- Public read so pet owners can browse the marketplace
create policy "providers: anyone can view active profiles"
  on providers for select
  using (active = true);

create policy "providers: own profile insert"
  on providers for insert
  with check (auth.uid() = user_id);

create policy "providers: own profile update"
  on providers for update
  using (auth.uid() = user_id);


-- BOOKINGS
create policy "bookings: owners full access"
  on bookings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "bookings: providers select"
  on bookings for select
  using (
    exists (
      select 1 from providers p
      where p.id = bookings.provider_id
        and p.user_id = auth.uid()
    )
  );

-- Providers can update status (confirm, complete, cancel)
create policy "bookings: providers update status"
  on bookings for update
  using (
    exists (
      select 1 from providers p
      where p.id = bookings.provider_id
        and p.user_id = auth.uid()
    )
  );


-- REVIEWS
-- Reviews are public so prospective owners can evaluate providers
create policy "reviews: public read"
  on reviews for select
  using (true);

-- Owners can only review a booking once it's completed
create policy "reviews: owners insert for completed bookings"
  on reviews for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from bookings b
      where b.id = reviews.booking_id
        and b.owner_id = auth.uid()
        and b.status = 'completed'
    )
  );


-- TRANSACTIONS
create policy "transactions: owners view"
  on transactions for select
  using (
    exists (
      select 1 from bookings b
      where b.id = transactions.booking_id
        and b.owner_id = auth.uid()
    )
  );

create policy "transactions: providers view"
  on transactions for select
  using (
    exists (
      select 1 from bookings b
      join providers p on p.id = b.provider_id
      where b.id = transactions.booking_id
        and p.user_id = auth.uid()
    )
  );


-- MESSAGES
create policy "messages: booking parties select"
  on messages for select
  using (
    auth.uid() = sender_id
    or exists (
      select 1 from bookings b
      where b.id = messages.booking_id
        and (
          b.owner_id = auth.uid()
          or exists (
            select 1 from providers p
            where p.id = b.provider_id and p.user_id = auth.uid()
          )
        )
    )
  );

create policy "messages: booking parties insert"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from bookings b
      where b.id = messages.booking_id
        and (
          b.owner_id = auth.uid()
          or exists (
            select 1 from providers p
            where p.id = b.provider_id and p.user_id = auth.uid()
          )
        )
    )
  );


-- ── Storage ──────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('provider-photos', 'provider-photos', true)
on conflict (id) do nothing;

create policy "provider-photos: public read"
  on storage.objects for select
  using (bucket_id = 'provider-photos');

create policy "provider-photos: provider upload"
  on storage.objects for insert
  with check (
    bucket_id = 'provider-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "provider-photos: provider update"
  on storage.objects for update
  using (
    bucket_id = 'provider-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "provider-photos: provider delete"
  on storage.objects for delete
  using (
    bucket_id = 'provider-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
