ALTER TABLE public.tracks
DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE public.tracks
DROP COLUMN IF EXISTS deleted_by;
