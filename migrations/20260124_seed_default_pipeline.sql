-- Seed a default pipeline and typical stages if none exist
BEGIN;

-- Only create if there are no pipelines at all (safe guard)
DO $$
DECLARE _pipeline_id int;
BEGIN
  IF (SELECT COUNT(*) FROM public.pipelines) = 0 THEN
    -- Create universal default pipeline
    INSERT INTO public.pipelines (name, tenant_id, is_default)
    VALUES ('Default Pipeline', NULL, true)
    RETURNING id INTO _pipeline_id;

    -- Insert common stages
    INSERT INTO public.pipeline_stages (pipeline_id, name, position, color)
    VALUES
      (_pipeline_id, 'Nuevo', 0, '#0ea5e9'),
      (_pipeline_id, 'Contacto', 1, '#34d399'),
      (_pipeline_id, 'Propuesta', 2, '#f59e0b'),
      (_pipeline_id, 'Negociación', 3, '#fb7185'),
      (_pipeline_id, 'Ganado', 4, '#60a5fa');

    -- Initialize stage_order for the pipeline
    UPDATE public.pipelines p
    SET stage_order = (
      SELECT ARRAY(SELECT id FROM public.pipeline_stages s WHERE s.pipeline_id = p.id ORDER BY position ASC)
    )
    WHERE p.id = _pipeline_id;
  END IF;
END$$;

COMMIT;

-- NOTE: If you already have pipelines but stages are missing for a specific tenant,
-- run a targeted insert replacing NULL tenant_id with the tenant id.
