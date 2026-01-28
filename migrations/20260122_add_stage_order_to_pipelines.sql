-- Agrega columna para guardar el orden de stages por pipeline
-- La columna es un arreglo de IDs de stages
BEGIN;

ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS stage_order INT[];

-- Inicializa la columna con el orden actual de los stages para cada pipeline
UPDATE public.pipelines p
SET stage_order = (
  SELECT ARRAY(
    SELECT id FROM public.pipeline_stages s
    WHERE s.pipeline_id = p.id
    ORDER BY s.id
  )
);

COMMIT;

-- Ejemplo para el pipeline con id=13:
-- SELECT stage_order FROM public.pipelines WHERE id = 13;
-- Devuelve el arreglo de IDs de stages en el orden actual.