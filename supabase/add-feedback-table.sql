-- Run this ONCE in the Supabase SQL Editor.
-- This is ADDITIVE. It does NOT drop or touch existing tables or data.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  giver_id uuid references members(id) not null,
  receiver_id uuid references members(id) not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

-- Open policy consistent with the rest of the app's current phase
drop policy if exists "open_feedback" on feedback;
create policy "open_feedback" on feedback for all using (true) with check (true);
