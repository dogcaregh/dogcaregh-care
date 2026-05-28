-- ============================================================
-- DogCareGH — Service Types & Provider Services
-- Run in Supabase SQL Editor after schema.sql
-- All prices in Ghana Cedis (GH₵)
-- ============================================================


-- ── service_types ─────────────────────────────────────────────
create table service_types (
  id          uuid        primary key default uuid_generate_v4(),
  slug        text        not null unique,
  name        text        not null,
  rate_unit   text        not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into service_types (id, slug, name, rate_unit, description) values
  (uuid_generate_v4(), 'dog_walking',  'Dog Walking',  'per_walk',    'Daily walks for your dog in your neighbourhood'),
  (uuid_generate_v4(), 'dog_sitting',  'Dog Sitting',  'per_visit',   'In-home visits to feed, play with, and check on your dog'),
  (uuid_generate_v4(), 'dog_daycare',  'Dog Daycare',  'per_day',     'Full-day supervised care at the provider''s home or facility'),
  (uuid_generate_v4(), 'dog_boarding', 'Dog Boarding', 'per_night',   'Overnight stays at the provider''s home or facility'),
  (uuid_generate_v4(), 'dog_grooming', 'Dog Grooming', 'per_session', 'Bathing, trimming, and grooming services for your dog');


-- ── provider_services ─────────────────────────────────────────
create table provider_services (
  id                uuid          primary key default uuid_generate_v4(),
  provider_id       uuid          not null references providers(id) on delete cascade,
  service_type_id   uuid          not null references service_types(id),
  rate_small        numeric(10,2) check (rate_small  >= 0),
  rate_medium       numeric(10,2) check (rate_medium >= 0),
  rate_large        numeric(10,2) check (rate_large  >= 0),
  max_capacity      integer       check (max_capacity > 0),
  description       text,
  grooming_mode     text          check (grooming_mode in ('itemised', 'simple')),
  is_active         boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  unique (provider_id, service_type_id)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_provider_services_updated_at
  before update on provider_services
  for each row execute function set_updated_at();


-- ── grooming_sub_services ─────────────────────────────────────
create table grooming_sub_services (
  id                  uuid          primary key default uuid_generate_v4(),
  provider_service_id uuid          not null references provider_services(id) on delete cascade,
  name                text          not null,
  rate_small          numeric(10,2) check (rate_small  >= 0),
  rate_medium         numeric(10,2) check (rate_medium >= 0),
  rate_large          numeric(10,2) check (rate_large  >= 0),
  is_active           boolean       not null default true
);


-- ── provider_addons ───────────────────────────────────────────
create table provider_addons (
  id          uuid          primary key default uuid_generate_v4(),
  provider_id uuid          not null references providers(id) on delete cascade,
  name        text          not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  is_active   boolean       not null default true
);


-- ── provider_discount_tiers ───────────────────────────────────
create table provider_discount_tiers (
  id              uuid         primary key default uuid_generate_v4(),
  provider_id     uuid         not null references providers(id) on delete cascade,
  service_type_id uuid         not null references service_types(id),
  discount_type   text         not null check (discount_type in ('duration', 'bulk')),
  threshold       integer      not null check (threshold > 0),
  percentage      numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  unique (provider_id, service_type_id, discount_type, threshold)
);


-- ── provider_service_areas ────────────────────────────────────
-- No separate neighbourhoods table exists; neighbourhood is stored as
-- plain text (matches the neighbourhood text column on providers).
create table provider_service_areas (
  provider_id   uuid not null references providers(id) on delete cascade,
  neighbourhood text not null,
  primary key (provider_id, neighbourhood)
);


-- ── Indexes ───────────────────────────────────────────────────
create index on provider_services       (provider_id);
create index on provider_services       (service_type_id);
create index on provider_services       (is_active);
create index on grooming_sub_services   (provider_service_id);
create index on provider_addons         (provider_id);
create index on provider_discount_tiers (provider_id);
create index on provider_service_areas  (provider_id);


-- ── Row Level Security ────────────────────────────────────────
alter table service_types           enable row level security;
alter table provider_services       enable row level security;
alter table grooming_sub_services   enable row level security;
alter table provider_addons         enable row level security;
alter table provider_discount_tiers enable row level security;
alter table provider_service_areas  enable row level security;


-- SERVICE TYPES: anyone can read
create policy "service_types: public read"
  on service_types for select
  using (true);


-- PROVIDER SERVICES
create policy "provider_services: public read"
  on provider_services for select
  using (true);

create policy "provider_services: provider insert"
  on provider_services for insert
  with check (
    exists (
      select 1 from providers p
      where p.id = provider_services.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_services: provider update"
  on provider_services for update
  using (
    exists (
      select 1 from providers p
      where p.id = provider_services.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_services: provider delete"
  on provider_services for delete
  using (
    exists (
      select 1 from providers p
      where p.id = provider_services.provider_id
        and p.user_id = auth.uid()
    )
  );


-- GROOMING SUB SERVICES
create policy "grooming_sub_services: public read"
  on grooming_sub_services for select
  using (true);

create policy "grooming_sub_services: provider insert"
  on grooming_sub_services for insert
  with check (
    exists (
      select 1 from provider_services ps
      join providers p on p.id = ps.provider_id
      where ps.id = grooming_sub_services.provider_service_id
        and p.user_id = auth.uid()
    )
  );

create policy "grooming_sub_services: provider update"
  on grooming_sub_services for update
  using (
    exists (
      select 1 from provider_services ps
      join providers p on p.id = ps.provider_id
      where ps.id = grooming_sub_services.provider_service_id
        and p.user_id = auth.uid()
    )
  );

create policy "grooming_sub_services: provider delete"
  on grooming_sub_services for delete
  using (
    exists (
      select 1 from provider_services ps
      join providers p on p.id = ps.provider_id
      where ps.id = grooming_sub_services.provider_service_id
        and p.user_id = auth.uid()
    )
  );


-- PROVIDER ADDONS
create policy "provider_addons: public read"
  on provider_addons for select
  using (true);

create policy "provider_addons: provider insert"
  on provider_addons for insert
  with check (
    exists (
      select 1 from providers p
      where p.id = provider_addons.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_addons: provider update"
  on provider_addons for update
  using (
    exists (
      select 1 from providers p
      where p.id = provider_addons.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_addons: provider delete"
  on provider_addons for delete
  using (
    exists (
      select 1 from providers p
      where p.id = provider_addons.provider_id
        and p.user_id = auth.uid()
    )
  );


-- PROVIDER DISCOUNT TIERS
create policy "provider_discount_tiers: public read"
  on provider_discount_tiers for select
  using (true);

create policy "provider_discount_tiers: provider insert"
  on provider_discount_tiers for insert
  with check (
    exists (
      select 1 from providers p
      where p.id = provider_discount_tiers.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_discount_tiers: provider update"
  on provider_discount_tiers for update
  using (
    exists (
      select 1 from providers p
      where p.id = provider_discount_tiers.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_discount_tiers: provider delete"
  on provider_discount_tiers for delete
  using (
    exists (
      select 1 from providers p
      where p.id = provider_discount_tiers.provider_id
        and p.user_id = auth.uid()
    )
  );


-- PROVIDER SERVICE AREAS
create policy "provider_service_areas: public read"
  on provider_service_areas for select
  using (true);

create policy "provider_service_areas: provider insert"
  on provider_service_areas for insert
  with check (
    exists (
      select 1 from providers p
      where p.id = provider_service_areas.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_service_areas: provider update"
  on provider_service_areas for update
  using (
    exists (
      select 1 from providers p
      where p.id = provider_service_areas.provider_id
        and p.user_id = auth.uid()
    )
  );

create policy "provider_service_areas: provider delete"
  on provider_service_areas for delete
  using (
    exists (
      select 1 from providers p
      where p.id = provider_service_areas.provider_id
        and p.user_id = auth.uid()
    )
  );
