-- Inicializa stage_order para todos los pipelines que no lo tengan
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM pipelines WHERE stage_order IS NULL OR array_length(stage_order,1) = 0 LOOP
    UPDATE pipelines
    SET stage_order = (
      SELECT ARRAY(
        SELECT id FROM pipeline_stages
        WHERE pipeline_id = r.id
        ORDER BY position ASC
      )
    )
    WHERE id = r.id;
  END LOOP;
END $$;