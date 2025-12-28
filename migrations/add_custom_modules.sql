-- Agregar columna custom_modules a tabla tenants (BD CRM)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS custom_modules JSONB DEFAULT '[]';

-- Configurar módulo autolavado para tenant 24
UPDATE tenants 
SET custom_modules = '[
  {
    "slug": "autolavado",
    "name": "Autolavado",
    "icon": "car-wash",
    "route": "/portal/custom/autolavado"
  }
]'::jsonb
WHERE id = 24;
