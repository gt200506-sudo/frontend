-- Run this in Supabase SQL Editor (or via Supabase CLI) to persist upload metadata.
-- IPFS (Pinata) stores files; this table indexes metadata per user.

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  file_name text not null,
  file_type text not null,
  ipfs_hash text,
  gateway_url text,
  -- SHA-256 hex from upload (API compatibility; optional for rows created without upload)
  content_hash text,
  created_at timestamptz not null default now()
);

create index if not exists content_user_id_created_at_idx
  on public.content (user_id, created_at desc);

comment on table public.content is 'ContentGuard asset metadata; files live on IPFS (Pinata).';
