
/**
 * Drizzle ORM Schema & Migration SQL
 */

export const SCHEMA_SQL = `
-- Enable Row Level Security
alter table if exists users enable row level security;
alter table if exists oauth_tokens enable row level security;
alter table if exists reminders enable row level security;

-- 1. Users Table
create table if not exists users (
  id serial primary key,
  whatsapp_number varchar unique not null,
  name varchar,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. OAuth Tokens Table
create table if not exists oauth_tokens (
  id serial primary key,
  user_id integer references users(id) on delete cascade,
  provider varchar default 'google',
  access_token text not null,
  refresh_token text not null,
  expiry_date bigint, -- Timestamp in milliseconds
  scope text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Reminders Table
create table if not exists reminders (
  id serial primary key,
  user_id integer references users(id) on delete cascade,
  content text not null,
  due_at timestamp with time zone not null,
  status varchar default 'pending', -- pending, sent, cancelled
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Policies (Simple Service Role Access for Webhook)
create policy "Service Role Full Access" on users for all using (true);
create policy "Service Role Full Access" on oauth_tokens for all using (true);
create policy "Service Role Full Access" on reminders for all using (true);
`;
