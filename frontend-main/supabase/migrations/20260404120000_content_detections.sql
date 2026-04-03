-- Piracy pipeline metadata (async scan). Run in Supabase SQL Editor after initial content table exists.

alter table public.content add column if not exists perceptual_hash text;
alter table public.content add column if not exists text_snippet text;
alter table public.content add column if not exists detections jsonb not null default '[]'::jsonb;
alter table public.content add column if not exists scan_status text not null default 'scanning';

comment on column public.content.detections is 'JSON array of { id, url, matchType, confidence, excerpt, detectedAt }';
comment on column public.content.scan_status is 'scanning | safe | flagged';
