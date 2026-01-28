-- Adds an ordering column for pipeline stages and initializes it per pipeline
BEGIN;

ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Initialize positions sequentially per pipeline based on current id order (0-indexed)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY pipeline_id ORDER BY id) - 1 AS pos
  FROM public.pipeline_stages
)
UPDATE public.pipeline_stages ps
SET position = o.pos
FROM ordered o
WHERE o.id = ps.id;

COMMIT;
