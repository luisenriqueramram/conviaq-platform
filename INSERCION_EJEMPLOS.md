# EJEMPLOS DE INSERT PRÁCTICOS - Conviaq Platform

**Documento complementario** con ejemplos reales de cómo insertar datos en cada tabla con valores consistentes.

---

## EJEMPLO COMPLETO: Crear un Tenant Nuevo desde Cero

```sql
-- Transacción completa para provisionar un nuevo tenant
BEGIN;

-- 1. CREAR TENANT
INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at)
VALUES (
  'Empresa XYZ',
  'empresa-xyz',
  1,
  'active',
  NOW(),
  NOW()
)
RETURNING id, name, slug;
-- Resultado: tenant_id = 100

-- 2. CREAR USUARIO ADMIN (tenant_id = 100)
INSERT INTO users (tenant_id, name, email, role, password_hash, is_active, created_at, updated_at)
VALUES (
  100,
  'Juan Admin',
  'admin@empresaxyz.com',
  'admin',
  'hashed_password_here',
  true,
  NOW(),
  NOW()
)
RETURNING id, email, role;

-- 3. CREAR RUNTIME STATE (tenant_id = 100)
INSERT INTO tenant_runtime_state (
  tenant_id,
  human_outbound_ai_behavior,
  human_outbound_cooldown_minutes,
  ai_force_off,
  welcome_enabled,
  welcome_message,
  reengagement_enabled,
  reengagement_after_days,
  created_at
) VALUES (
  100,
  'none',           -- IA deshabilitada por default
  0,                -- sin cooldown
  false,            -- IA no está forzadamente deshabilitada
  false,            -- sin mensaje de bienvenida
  null,
  false,            -- reengagement deshabilitado
  null,
  NOW()
)
RETURNING tenant_id;

-- 4. CREAR BOT PROFILE (tenant_id = 100)
INSERT INTO bot_profiles (
  tenant_id,
  ai_enabled,
  name,
  tone,
  attitude,
  purpose,
  language,
  use_custom_prompt,
  custom_prompt,
  tools,
  policies,
  created_at
) VALUES (
  100,
  true,
  'Bot Asistente',
  'amigable y profesional',
  'receptivo y empático',
  'Asistente de atención al cliente',
  'es',
  false,
  null,
  '{"kb": false, "email": false, "media": false, "calendar": false}'::jsonb,
  '{
    "vibes": {
      "tone": "amigable y profesional",
      "style_rules": {
        "avoid_phrases": ["por favor", "debe"],
        "preferred_phrases": ["con gusto", "podemos"]
      }
    },
    "config": {"mode": "guided"},
    "guided": {
      "can_do": "pedir datos de contacto",
      "cannot_do": "no da información sensible",
      "escalation": "cuando no sepa responder",
      "procedures": "saluda, pide nombre, ofrece ayuda",
      "limitations": "ninguna"
    },
    "behavior": {"never_do": [], "always_do": []},
    "knowledge": {"source": "external", "raw_text": ""}
  }'::jsonb,
  NOW()
)
RETURNING id, tenant_id;

-- 5. CREAR PIPELINE DEFAULT (tenant_id = 100)
INSERT INTO pipelines (tenant_id, name, kind, is_default, created_at)
VALUES (
  100,
  'Default',
  'sales',
  true,
  NOW()
)
RETURNING id, name;
-- Resultado: pipeline_id = 50

-- 6. CREAR PIPELINE STAGES (pipeline_id = 50)
INSERT INTO pipeline_stages (
  pipeline_id, name, stage_key, position, color, is_final, description, created_at
) VALUES
  (50, 'Nuevo', 'new', 0, '#0ea5e9', false, 'Nuevo lead ingresado', NOW()),
  (50, 'Contactado', 'contacted', 1, '#34d399', false, 'Se contactó con el lead', NOW()),
  (50, 'Propuesta', 'quoted', 2, '#f59e0b', false, 'Se envió propuesta', NOW()),
  (50, 'Negociación', 'negotiation', 3, '#fb7185', false, 'En negociación', NOW()),
  (50, 'Ganado', 'won', 4, '#60a5fa', true, 'Deal ganado', NOW()),
  (50, 'Perdido', 'lost', 5, '#8b5cf6', true, 'Deal perdido', NOW())
RETURNING id, pipeline_id, name, position;
-- Resultado: stage_ids = [101, 102, 103, 104, 105, 106]

-- 7. ACTUALIZAR stage_order EN PIPELINE
UPDATE pipelines
SET stage_order = ARRAY[101, 102, 103, 104, 105, 106]
WHERE id = 50
RETURNING id, stage_order;

-- 8. CREAR INTEGRATION WHATSAPP (tenant_id = 100)
INSERT INTO integrations (tenant_id, type, name, config, is_active, created_at)
VALUES (
  100,
  'whatsapp',
  'WhatsApp Integration',
  '{
    "provider": "evolution",
    "version": "1.0"
  }'::jsonb,
  true,
  NOW()
)
RETURNING id, type, name;
-- Resultado: integration_id = 20

-- 9. CREAR CHANNEL ACCOUNT WHATSAPP (tenant_id = 100)
INSERT INTO channel_accounts (
  tenant_id,
  channel_type,
  provider,
  account_type,
  account_label,
  phone_e164,
  wa_business_account_id,
  wa_phone_number_id,
  provider_account_id,
  integration_id,
  is_default,
  is_active,
  created_at
) VALUES (
  100,
  'whatsapp',
  'evolution',
  'business',
  'WhatsApp Principal',
  '+525512345678',
  'instance-name-xyz',
  'phone-number-id-123',
  'instance-name-xyz',
  20,
  true,
  true,
  NOW()
)
RETURNING id, channel_type, phone_e164;

-- 10. CREAR TENANT_FEATURES (tenant_id = 100)
INSERT INTO tenant_features (tenant_id, feature_key, enabled, created_at) VALUES
  (100, 'calendar', true, NOW()),
  (100, 'automation', true, NOW()),
  (100, 'workflows', true, NOW()),
  (100, 'custom_fields', false, NOW()),
  (100, 'solar_logic', false, NOW())
RETURNING tenant_id, feature_key, enabled;

-- 11. CREAR TAGS (tenant_id = 100)
INSERT INTO tags (tenant_id, name, color, description, is_system, created_at) VALUES
  (100, 'Urgent', '#ef4444', 'Problemas urgentes', false, NOW()),
  (100, 'VIP', '#fbbf24', 'Clientes VIP', false, NOW()),
  (100, 'Follow-up', '#3b82f6', 'Requiere seguimiento', false, NOW())
RETURNING id, tenant_id, name;

-- 12. CREAR WORKFLOWS (tenant_id = 100)
INSERT INTO workflows (
  tenant_id, key, name, engine, trigger_type, is_active, created_at
) VALUES
  (100, 'welcome', 'Mensaje de Bienvenida', 'n8n', 'conversation_started', true, NOW()),
  (100, 'handoff', 'Handoff a Humano', 'n8n', 'message_contains', true, NOW())
RETURNING id, key, name;

-- 13. CREAR TENANT_APPS (tenant_id = 100)
INSERT INTO tenant_apps (
  tenant_id, key, name, ui_url, api_webhook_url, is_active, created_at, updated_at
) VALUES (
  100,
  'custom-crm',
  'Custom CRM Integration',
  'https://custom-crm.example.com/ui',
  'https://custom-crm.example.com/webhook',
  true,
  NOW(),
  NOW()
)
RETURNING id, key, name;

-- 14. CREAR INDUSTRY_CONFIG (calendar para tenant_id = 100)
INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at)
VALUES (
  100,
  NULL,
  '{
    "active": true,
    "timezone": "America/Mexico_City",
    "services": {
      "service-1": {"name": "Consulta General", "duration": 30, "price": 500}
    },
    "schedules": {},
    "metadata": {}
  }'::jsonb,
  NOW(),
  NOW()
)
RETURNING id, industry;

-- 15. CREAR TENANT_SCHEDULING_CONFIG (tenant_id = 100)
INSERT INTO tenant_scheduling_config (
  tenant_id,
  timezone,
  slot_interval_min,
  lead_time_min,
  default_travel_time_min,
  before_buffer_min,
  after_buffer_min,
  same_day_cutoff_local,
  updated_at
) VALUES (
  100,
  'America/Mexico_City',
  30,
  60,
  0,
  0,
  0,
  '12:00:00',
  NOW()
)
RETURNING tenant_id;

-- 16. CREAR TENANT_WEEKLY_HOURS (tenant_id = 100, lunes a viernes)
INSERT INTO tenant_weekly_hours (
  tenant_id, day_of_week, is_open, open_time_local, close_time_local, breaks_json
) VALUES
  (100, 1, true, '09:00:00', '18:00:00', '{"lunch": ["12:00", "13:00"]}'::jsonb), -- Monday
  (100, 2, true, '09:00:00', '18:00:00', '{"lunch": ["12:00", "13:00"]}'::jsonb), -- Tuesday
  (100, 3, true, '09:00:00', '18:00:00', '{"lunch": ["12:00", "13:00"]}'::jsonb), -- Wednesday
  (100, 4, true, '09:00:00', '18:00:00', '{"lunch": ["12:00", "13:00"]}'::jsonb), -- Thursday
  (100, 5, true, '09:00:00', '17:00:00', '{"lunch": ["12:00", "13:00"]}'::jsonb), -- Friday
  (100, 6, false, NULL, NULL, NULL), -- Saturday
  (100, 0, false, NULL, NULL, NULL)  -- Sunday
RETURNING id, tenant_id, day_of_week;

-- 17. CREAR TENANT_SERVICES (tenant_id = 100)
INSERT INTO tenant_services (
  tenant_id, code, name, base_duration_min, duration_delta_min, price_mxn, metadata
) VALUES
  (100, 'consul-general', 'Consulta General', 30, 0, 500.00, '{"category": "consultation"}'::jsonb),
  (100, 'consul-premium', 'Consulta Premium', 60, 0, 1000.00, '{"category": "consultation"}'::jsonb),
  (100, 'followup', 'Seguimiento', 15, 0, 250.00, '{"category": "followup"}'::jsonb)
RETURNING id, tenant_id, code;

-- 18. CREAR CONTACT (tenant_id = 100)
INSERT INTO contacts (
  tenant_id, name, wa_jid, phone_e164, email, metadata, created_at
) VALUES (
  100,
  'Carlos Pérez',
  '525512345678@s.whatsapp.net',
  '+525512345678',
  'carlos@example.com',
  '{"source": "whatsapp", "tags": ["vip"]}'::jsonb,
  NOW()
)
RETURNING id, name, wa_jid;
-- Resultado: contact_id = 201

-- 19. CREAR LEAD (tenant_id = 100)
INSERT INTO leads (
  tenant_id, name, company, email, phone, deal_value, currency,
  pipeline_id, stage_id, contact_id, created_at, updated_at
) VALUES (
  100,
  'Carlos Pérez - Empresa ABC',
  'Empresa ABC',
  'carlos@empresaabc.com',
  '+525512345678',
  5000.00,
  'MXN',
  50,
  101,  -- stage_id = 'new'
  201,
  NOW(),
  NOW()
)
RETURNING id, name, stage_id, deal_value;

-- 20. CREAR CONVERSATION (tenant_id = 100)
INSERT INTO conversations (
  tenant_id, contact_id, channel_type, channel_identifier, status, started_at, created_at
) VALUES (
  100,
  201,
  'whatsapp',
  '525512345678@s.whatsapp.net',
  'open',
  NOW(),
  NOW()
)
RETURNING id, contact_id, channel_identifier, status;

COMMIT;
```

---

## EJEMPLO 2: Crear Lead desde Conversación Existente

```sql
BEGIN;

-- Asumir:
-- tenant_id = 100
-- pipeline_id = 50 (Default)
-- stage_id = 101 (New)
-- contact_id = 201 (Carlos Pérez)
-- conversation ya existe

INSERT INTO leads (
  tenant_id,
  name,
  company,
  email,
  phone,
  deal_value,
  currency,
  pipeline_id,
  stage_id,
  contact_id,
  created_at,
  updated_at
) VALUES (
  100,
  'Carlos Pérez - Venta Premium',
  NULL,
  NULL,
  NULL,
  15000.00,
  'MXN',
  50,
  101,
  201,
  NOW(),
  NOW()
)
RETURNING id, name, deal_value;

COMMIT;
```

---

## EJEMPLO 3: Cambiar Lead de Stage

```sql
BEGIN;

-- Lead id=1000 pasa de "new" (101) a "contacted" (102)
UPDATE leads
SET stage_id = 102, updated_at = NOW()
WHERE id = 1000 AND tenant_id = 100
RETURNING id, stage_id, updated_at;

-- OPCIONAL: Log del evento
INSERT INTO events (tenant_id, event_type, payload, created_at)
VALUES (
  100,
  'lead_stage_changed',
  '{"lead_id": 1000, "from_stage": 101, "to_stage": 102}'::jsonb,
  NOW()
);

COMMIT;
```

---

## EJEMPLO 4: Crear Tag y Asignar a Lead

```sql
BEGIN;

-- Crear tag
INSERT INTO tags (tenant_id, name, color, description, is_system, created_at)
VALUES (
  100,
  'Hot Lead',
  '#dc2626',
  'Lead muy caliente - prioridad máxima',
  false,
  NOW()
)
RETURNING id, name;

-- NOTA: La asignación de tags a leads típicamente se hace en una tabla pivot
-- (tags_on_leads) que no está documentada en el análisis. 
-- Si no existe, puede ser implementada como:

-- CREATE TABLE lead_tags (
--   lead_id bigint REFERENCES leads(id) ON DELETE CASCADE,
--   tag_id bigint REFERENCES tags(id) ON DELETE CASCADE,
--   PRIMARY KEY (lead_id, tag_id)
-- );

INSERT INTO lead_tags (lead_id, tag_id) VALUES (1000, LASTVAL());

COMMIT;
```

---

## EJEMPLO 5: Crear Workflow con Trigger

```sql
BEGIN;

-- Crear integration primero (si no existe)
INSERT INTO integrations (tenant_id, type, name, is_active, created_at)
VALUES (100, 'n8n', 'N8N Automation', true, NOW())
RETURNING id;
-- Resultado: integration_id = 21

-- Crear workflow
INSERT INTO workflows (
  tenant_id,
  key,
  name,
  engine,
  trigger_type,
  trigger_filter,
  integration_id,
  is_active,
  created_at
) VALUES (
  100,
  'escalate_to_human',
  'Escalate Hot Leads',
  'n8n',
  'conversation_message',
  '{"contains": ["ayuda", "problema", "urgente"]}'::jsonb,
  21,
  true,
  NOW()
)
RETURNING id, key, name;
-- Resultado: workflow_id = 300

-- Asignar workflow a leads en ciertos stages
INSERT INTO workflow_assignments (
  workflow_id,
  tenant_id,
  target_type,
  target_filter,
  is_active,
  created_at
) VALUES (
  300,
  100,
  'lead',
  '{"pipeline_id": 50, "stage_id": [101, 102]}'::jsonb,
  true,
  NOW()
)
RETURNING id, workflow_id, target_type;

COMMIT;
```

---

## EJEMPLO 6: Actualizar Bot Profile

```sql
BEGIN;

UPDATE bot_profiles
SET
  ai_enabled = true,
  tone = 'profesional y empático',
  attitude = 'proactivo',
  custom_prompt = 'Eres un asistente de ventas. Debes ser amable pero directo. Siempre ofrece soluciones.',
  use_custom_prompt = true,
  updated_at = NOW()
WHERE tenant_id = 100
RETURNING id, tenant_id, ai_enabled;

COMMIT;
```

---

## EJEMPLO 7: Deshabilitar IA Globalmente

```sql
BEGIN;

UPDATE tenant_runtime_state
SET
  ai_force_off = true,
  ai_disabled_reason = 'Mantenimiento programado',
  ai_disabled_until = NOW() + INTERVAL '2 hours',
  updated_at = NOW()
WHERE tenant_id = 100
RETURNING tenant_id, ai_force_off, ai_disabled_until;

COMMIT;
```

---

## EJEMPLO 8: Habilitar Feature

```sql
BEGIN;

INSERT INTO tenant_features (tenant_id, feature_key, enabled, created_at)
VALUES (100, 'solar_logic', true, NOW())
ON CONFLICT (tenant_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled
RETURNING tenant_id, feature_key, enabled;

-- IMPORTANTE: Si se habilita solar_logic, crear industry_config también:
INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at)
VALUES (100, 'solar_logic', '{}'::jsonb, NOW())
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## EJEMPLO 9: Crear Tour (Turismo)

```sql
BEGIN;

INSERT INTO tours_calendar (
  tenant_id,
  route_key,
  trip_date,
  departure_time,
  price,
  status,
  origin_area,
  destination_area,
  metadata,
  created_at,
  updated_at
) VALUES (
  24,  -- Tenant específico de turismo
  'norte-a-sur',
  '2026-03-15',
  '08:00:00',
  1500.00,
  'available',
  'Monterrey',
  'Tampico',
  '{
    "stops": [{"place": "Cerro de la Silla", "duration": 30}],
    "included": ["water", "snacks"],
    "guide": "Juan García"
  }'::jsonb,
  NOW(),
  NOW()
)
RETURNING id, route_key, trip_date, status;

COMMIT;
```

---

## EJEMPLO 10: Actualizar Industry Config (Calendar)

```sql
BEGIN;

UPDATE industry_configs
SET
  booking_schema = '{
    "active": true,
    "timezone": "America/Mexico_City",
    "services": {
      "service-1": {
        "name": "Consulta 30 min",
        "duration": 30,
        "price": 500,
        "buffer_after": 15
      },
      "service-2": {
        "name": "Consulta 60 min",
        "duration": 60,
        "price": 900,
        "buffer_after": 30
      }
    },
    "metadata": {"last_updated": "2026-02-15"}
  }'::jsonb,
  updated_at = NOW()
WHERE tenant_id = 100 AND industry IS NULL
RETURNING id, industry, booking_schema;

COMMIT;
```

---

## CHECKLIST: Crear Tenant Completo

- [x] tenants
- [x] users (admin)
- [x] tenant_runtime_state
- [x] bot_profiles
- [x] pipelines
- [x] pipeline_stages
- [x] integrations
- [x] channel_accounts
- [x] tenant_features
- [x] tags (opcional)
- [x] workflows (opcional)
- [x] tenant_apps (opcional)
- [x] industry_configs (si calendar)
- [x] tenant_scheduling_config (si calendar)
- [x] tenant_weekly_hours (si calendar)
- [x] tenant_services (si calendar)

**Mínimo requerido**: tenants, users, bot_profiles, pipelines, pipeline_stages, channel_accounts

---

## TABLA DE REFERENCIA: stage_keys COMUNES

| Position | Stage Key | Nombre | Color | Is Final |
|----------|-----------|--------|-------|----------|
| 0 | new | Nuevo | #0ea5e9 | false |
| 1 | contacted | Contactado | #34d399 | false |
| 2 | quoted | Propuesta | #f59e0b | false |
| 3 | negotiation | Negociación | #fb7185 | false |
| 4 | won | Ganado | #60a5fa | true |
| 5 | lost | Perdido | #8b5cf6 | true |

---

## TABLA DE REFERENCIA: Roles de Usuario

| Role | Descripción | Permisos |
|------|-------------|----------|
| superadmin | Administrador del sistema | Gestionar todos los tenants |
| admin | Administrador del tenant | Configuración del tenant |
| tenant | Usuario regular | Acceso a portal |

---

## TABLA DE REFERENCIA: Feature Keys

- `calendar` - Funcionalidad de calendario/scheduling
- `automation` - Automaciones básicas
- `workflows` - Workflows avanzados (n8n)
- `custom_fields` - Campos personalizados
- `solar_logic` - Módulo de paneles solares
- `tourism` - Módulo de turismo (Turisticos del Norte)

