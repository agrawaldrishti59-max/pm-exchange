-- Run this in Supabase SQL Editor
-- Drop existing tables first
drop table if exists sessions cascade;
drop table if exists slots cascade;
drop table if exists members cascade;

-- MEMBERS
create table members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  linkedin_url text,
  company text,
  role text,
  whatsapp text,
  bio text,
  years_experience integer,
  goal text,
  avatar_url text,
  credits integer default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

-- SLOTS
create table slots (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade not null,
  datetime timestamptz not null,
  is_booked boolean default false,
  created_at timestamptz default now()
);

-- SESSIONS
create table sessions (
  id uuid primary key default gen_random_uuid(),
  booker_id uuid references members(id) not null,
  host_id uuid references members(id) not null,
  slot_id uuid references slots(id),
  status text default 'pending', -- pending | accepted | completed | cancelled
  meet_link text,
  note text,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade not null,
  title text not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table members enable row level security;
alter table slots enable row level security;
alter table sessions enable row level security;
alter table notifications enable row level security;

-- Open policies for now
create policy "open_members" on members for all using (true) with check (true);
create policy "open_slots" on slots for all using (true) with check (true);
create policy "open_sessions" on sessions for all using (true) with check (true);
create policy "open_notifications" on notifications for all using (true) with check (true);
