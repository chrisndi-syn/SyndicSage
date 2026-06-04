-- ── Maintenance tasks ────────────────────────────────────────────
create table if not exists syndic_maintenance_tasks (
  id                  uuid primary key default gen_random_uuid(),
  building_id         uuid not null references syndic_buildings(id) on delete cascade,
  organization_id     uuid not null,
  title               text not null,
  description         text,
  category            text not null default 'other',
  priority            text not null default 'medium',
  frequency           text not null default 'annual',
  next_due_date       date,
  last_done_date      date,
  remind_days_before  int  not null default 14,
  supplier_name       text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

alter table syndic_maintenance_tasks enable row level security;

create policy "syndic_maintenance_tasks_org" on syndic_maintenance_tasks
  using (organization_id = (
    select organization_id from syndic_members
    where user_id = auth.uid() limit 1
  ));
