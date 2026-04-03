-- Persist Content Library AI scan results (SerpAPI + similarity). Optional column.

alter table public.content add column if not exists library_matches jsonb;

comment on column public.content.library_matches is 'Last library scan: { scannedAt, fingerprint, matches: [{url,similarity,status,title,snippet}], queries: [] }';
