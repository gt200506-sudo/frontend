-- Full plain-text body for web detection; text_snippet remains a short preview.

alter table public.content add column if not exists full_text text;

comment on column public.content.full_text is 'Full extracted readable text for plagiarism-style detection; text_snippet is UI preview (first ~1k chars).';
