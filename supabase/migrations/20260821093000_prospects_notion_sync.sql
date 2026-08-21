-- Ties a prospect back to the Notion page it came from, so the live import can
-- be re-run without duplicating everybody.
--
-- Two columns, doing two different jobs:
--
--   notion_page_id         identity. The import matches on this to decide
--                          "update" vs "insert".
--   notion_last_edited_at  the page's last_edited_time as of the last import.
--                          Compared against the value Notion reports now, so a
--                          re-sync can skip fetching bodies for pages nobody
--                          has touched — that fetch is the slow part (one API
--                          request per page against a ~3/second limit), so this
--                          is the difference between minutes and seconds.
--
-- Both stay null for prospects added by hand or from the LinkedIn CSV, which is
-- why the unique index below is partial: many nulls are fine, but a given
-- Notion page may only ever map to one prospect.
--
-- Run in: Supabase -> SQL Editor.

alter table prospects add column if not exists notion_page_id        text;
alter table prospects add column if not exists notion_last_edited_at timestamptz;

-- Partial: uniqueness applies only to rows that actually came from Notion.
-- A plain unique constraint would allow just one null, which would break every
-- manually created prospect after the first.
create unique index if not exists prospects_notion_page_id_key
  on prospects (notion_page_id)
  where notion_page_id is not null;

comment on column prospects.notion_page_id is
  'Notion page this prospect was imported from; null for manual/LinkedIn rows.';
comment on column prospects.notion_last_edited_at is
  'Notion last_edited_time as of the last import, used to skip unchanged pages.';
