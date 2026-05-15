-- Run this in Supabase SQL Editor

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  linkedin_url text,
  company text,
  role text,
  whatsapp text,
  credits integer default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  booker_id uuid references members(id) not null,
  host_id uuid references members(id) not null,
  status text default 'pending',
  meet_link text,
  note text,
  created_at timestamptz default now()
);

alter table members enable row level security;
alter table sessions enable row level security;

-- Members policies
create policy "Anyone can insert member" on members for insert with check (true);
create policy "Anyone can view approved members" on members for select using (true);
create policy "Members can update own record" on members for update using (true);

-- Sessions policies
create policy "Anyone can insert session" on sessions for insert with check (true);
create policy "Anyone can view sessions" on sessions for select using (true);
create policy "Anyone can update session" on sessions for update using (true);
