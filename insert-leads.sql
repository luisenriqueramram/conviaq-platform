-- Get tenant ID and pipeline/stage IDs first, then insert test leads
WITH tenant AS (
  SELECT id FROM tenants LIMIT 1
),
pipeline AS (
  SELECT id FROM pipelines WHERE tenant_id = (SELECT id FROM tenant) LIMIT 1
),
stage AS (
  SELECT id FROM pipeline_stages WHERE pipeline_id = (SELECT id FROM pipeline) LIMIT 1
),
contacts AS (
  SELECT id FROM contacts WHERE tenant_id = (SELECT id FROM tenant) LIMIT 10
),
insert_data AS (
  VALUES
    (1, 'Juan Pérez', 'Tech Corp'),
    (2, 'María García', 'Digital Solutions'),
    (3, 'Carlos López', 'Innovate Inc'),
    (4, 'Ana Martínez', 'Future Systems'),
    (5, 'Pedro Sánchez', 'NextGen Co'),
    (6, 'Rosa Fernández', 'Smart Industries')
)
INSERT INTO leads (tenant_id, name, company, pipeline_id, stage_id, contact_id, created_at, updated_at)
SELECT 
  (SELECT id FROM tenant),
  insert_data.column2,
  insert_data.column3,
  (SELECT id FROM pipeline),
  (SELECT id FROM stage),
  (SELECT ARRAY_AGG(id) FROM contacts)[insert_data.column1],
  NOW(),
  NOW()
FROM insert_data;
