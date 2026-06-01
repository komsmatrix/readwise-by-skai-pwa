-- ═══════════════════════════════════════════════════════════════════
-- READWISE BY SKAI — Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable UUID extension ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Customers table ─────────────────────────────────────────────────
-- Stores all customer accounts
create table if not exists customers (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text not null unique,
  key_used     text not null,
  activated_at timestamptz default now(),
  created_at   timestamptz default now(),
  is_active    boolean default true,
  notes        text default ''
);

-- ── Access keys table ───────────────────────────────────────────────
-- Stores all generated access keys
create table if not exists access_keys (
  id           uuid primary key default uuid_generate_v4(),
  key          text not null unique,
  name         text not null,
  email        text default '',
  created_at   timestamptz default now(),
  expires_at   timestamptz,
  used_at      timestamptz,
  activated_by text,
  is_owner     boolean default false,
  notes        text default ''
);

-- ── Books table ─────────────────────────────────────────────────────
-- Your curated library — all customers see these
create table if not exists books (
  id             text primary key,
  title          text not null,
  author         text not null,
  category       text not null,
  description    text default '',
  tags           text[] default '{}',
  pages          int default 0,
  file_path      text,       -- path in Supabase storage
  text_path      text,       -- HTML text version path
  cover_path     text,       -- cover image path
  preferred_mode text default 'text',  -- 'text' | 'pdf'
  text_quality   text default 'great', -- 'great' | 'ok' | 'poor'
  created_at     timestamptz default now(),
  is_active      boolean default true
);

-- ── Reading progress table ──────────────────────────────────────────
-- Saves each customer's reading progress per book
create table if not exists reading_progress (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid references customers(id) on delete cascade,
  book_id         text references books(id) on delete cascade,
  current_page    int default 1,
  scroll_position float default 0,
  percent         int default 0,
  bookmarks       jsonb default '[]',
  updated_at      timestamptz default now(),
  unique (customer_id, book_id)
);

-- ── Personal books table ────────────────────────────────────────────
-- Books customers upload themselves (private, only visible to them)
create table if not exists personal_books (
  id             uuid primary key default uuid_generate_v4(),
  customer_id    uuid references customers(id) on delete cascade,
  title          text not null,
  author         text default '',
  file_path      text not null,
  text_path      text,
  cover_path     text,
  preferred_mode text default 'text',
  text_quality   text default 'great',
  pages          int default 0,
  created_at     timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────────────
-- Books are public (all authenticated users can read)
alter table books enable row level security;
create policy "Books are readable by all" on books for select using (true);

-- Progress is private per customer (matched by email in JWT)
alter table reading_progress enable row level security;

-- Personal books are private per customer
alter table personal_books enable row level security;

-- Access keys and customers are admin-only (service role bypasses RLS)
alter table access_keys enable row level security;
alter table customers    enable row level security;

-- ── Storage buckets ─────────────────────────────────────────────────
-- Create storage buckets for book files
insert into storage.buckets (id, name, public)
values ('books', 'books', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('personal', 'personal', false)
on conflict (id) do nothing;

-- Allow public read on books and covers
create policy "Books are publicly readable" on storage.objects
  for select using (bucket_id = 'books');

create policy "Covers are publicly readable" on storage.objects
  for select using (bucket_id = 'covers');
