# Análisis Exhaustivo de Tablas SQL - Conviaq Platform

**Fecha de Análisis**: Febrero 15, 2026  
**Scope**: Análisis completo de todas las tablas SQL usadas en el proyecto (excluyendo tablas de autolavado)

---

## 1. TABLAS CORE DEL SISTEMA

### TABLA: tenants
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `name` (text NOT NULL)
- `slug` (text UNIQUE NOT NULL)
- `plan_id` (bigint REFERENCES plans - nullable)
- `status` (text, DEFAULT 'active') - valores: 'active', 'inactive', etc
- `domain` (text - nullable)
- `custom_modules` (jsonb DEFAULT '[]')
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
RETURNING id, name, slug, plan_id, status;
```

**tenant_id relacionado**: Sí (es la tabla padre)  
**Notas**:
- Tabla principal de multi-tenancia
- `slug` debe ser único y válido para rutas
- El campo `custom_modules` almacena módulos dinámicos (autolavado, solar, etc)
- Cuando se crea un tenant nuevo, se deben crear múltiples registros en otras tablas

---

### TABLA: users
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `email` (text UNIQUE NOT NULL)
- `name` (text - nullable)
- `password_hash` (text)
- `role` (text - 'admin', 'tenant', 'superadmin', etc)
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO users (tenant_id, name, email, role, password_hash, is_active, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
RETURNING id, email, role;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Cada usuario pertenece a un único tenant
- `email` es UNIQUE a nivel global
- Los roles afectan permisos (admin tiene acceso a configuración del tenant)
- Cuando se crea tenant, crear al menos 1 usuario admin

---

## 2. TABLAS DE PIPELINES Y STAGES

### TABLA: pipelines
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint REFERENCES tenants(id) ON DELETE CASCADE - nullable para pipelines universales)
- `name` (text NOT NULL)
- `kind` (text DEFAULT 'sales') - 'sales', 'support', etc
- `is_default` (boolean DEFAULT false)
- `stage_order` (INT[] - array de IDs de stages en orden)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO pipelines (tenant_id, name, kind, is_default, created_at)
VALUES ($1, $2, $3, $4, NOW())
RETURNING id, name, kind, is_default;
```

**tenant_id relacionado**: Sí (nullable - permite pipelines universales)  
**Notas**:
- Pipelines con `tenant_id = NULL` son universales (compartidas por todos)
- Campo `stage_order` es array de IDs que define el orden visual
- Cada tenant debe tener al menos 1 pipeline
- Por defecto se crea una con `name = 'Default'` e `is_default = true`

---

### TABLA: pipeline_stages
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `pipeline_id` (bigint NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE)
- `name` (text NOT NULL)
- `stage_key` (text - slugified version for references)
- `position` (INT DEFAULT 0) - 0-indexed position in pipeline
- `color` (text - hex color like '#0ea5e9' - nullable)
- `is_final` (boolean DEFAULT false) - marks completed/lost stages
- `description` (text - nullable)
- `ai_criteria` (jsonb - nullable, AI decision rules)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO pipeline_stages (
  pipeline_id, name, stage_key, position, color, is_final, description, ai_criteria, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
RETURNING id, pipeline_id, name, stage_key, position;
```

**tenant_id relacionado**: No (heredado via pipeline_id → pipelines.tenant_id)  
**Notas**:
- Mínimo 5-6 stages por pipeline (Nuevo, Contacto, Propuesta, Negociación, Ganado, Perdido)
- `stage_key` típicamente: 'new', 'contacted', 'quoted', 'scheduled', 'won', 'lost'
- `position` controla orden visual (0, 1, 2, ...)
- Colores por defecto en seed: '#0ea5e9' (azul), '#34d399' (verde), '#f59e0b' (naranja), '#fb7185' (rojo), '#60a5fa' (azul claro)
- Al crear stages, SIEMPRE actualizar `pipelines.stage_order` array

---

## 3. TABLAS DE CONTACTOS Y CONVERSACIONES

### TABLA: contacts
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `name` (text - nullable)
- `wa_jid` (text - WhatsApp JID, formato: "5212345678901@s.whatsapp.net")
- `phone_e164` (text - normalized phone "+1234567890")
- `email` (text - nullable)
- `metadata` (jsonb - nullable)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO contacts (tenant_id, name, wa_jid, phone_e164, email, metadata, created_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING id, name, wa_jid;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Creados automáticamente por canal WhatsApp (conversation webhook)
- `wa_jid` es unique per tenant
- Pueden no tener nombre (creados solo con phone)
- Se pueden convertir a Leads más tarde
- La mayoría se crean sin intervención manual

---

### TABLA: conversations
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `contact_id` (bigint REFERENCES contacts(id) ON DELETE SET NULL - nullable)
- `channel_type` (text - 'whatsapp', 'webchat', 'email')
- `channel_identifier` (text - wa_jid or other channel identifier)
- `status` (text DEFAULT 'open') - 'open', 'closed', 'resolved'
- `started_at` (timestamptz)
- `last_message_at` (timestamptz - nullable)
- `metadata` (jsonb - nullable)
- `created_at` (timestamptz DEFAULT now())

**INSERT template**:
```sql
INSERT INTO conversations (
  tenant_id, contact_id, channel_type, channel_identifier, status, started_at, created_at
) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING id, channel_identifier, status;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Creadas automáticamente por webhook del canal
- `contact_id` puede ser NULL (conversaciones sin contacto asignado)
- `channel_identifier` es unique por tenant para cada canal
- Status típicamente: 'open' → 'closed' o 'resolved'
- Relación a contacts para vincular conversaciones con leads

---

## 4. TABLAS DE LEADS Y CONFIGURACIÓN

### TABLA: leads
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `name` (text)
- `company` (text - nullable)
- `email` (text - nullable)
- `phone` (text - nullable)
- `deal_value` (numeric(12,2) - nullable)
- `currency` (text DEFAULT 'MXN')
- `pipeline_id` (bigint NOT NULL REFERENCES pipelines(id))
- `stage_id` (bigint NOT NULL REFERENCES pipeline_stages(id))
- `contact_id` (bigint REFERENCES contacts(id) ON DELETE SET NULL - nullable)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO leads (
  tenant_id, name, company, email, phone, deal_value, pipeline_id, stage_id, contact_id, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
RETURNING id, name, company, stage_id;
```

**tenant_id relacionado**: Sí  
**Notas**:
- `pipeline_id` y `stage_id` son obligatorios
- Típicamente `contact_id` está seteado (vinculación a conversations)
- `deal_value` es monto de oportunidad (nullable)
- Cuando se cambia stage → actualizar `stage_id`
- Relación: contact_id (1 lead → 1 contact, pero 1 contact → N leads)

---

### TABLA: industry_configs
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `industry` (text - nullable) - 'solar_logic', 'tourism', 'booking', NULL (calendar)
- `schema_json` (jsonb - nullable, para Turisticos del Norte)
- `booking_schema` (jsonb - nullable, para calendar/booking)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**INSERT template (Calendar/Booking)**:
```sql
INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at)
VALUES ($1, NULL, $2::jsonb, NOW(), NOW())
RETURNING id, industry, booking_schema;
```

**INSERT template (Solar Logic)**:
```sql
INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at)
VALUES ($1, 'solar_logic', '{}'::jsonb, NOW(), NOW())
RETURNING id, industry;
```

**INSERT template (Turisticos del Norte)**:
```sql
INSERT INTO industry_configs (tenant_id, industry, schema_json, created_at, updated_at)
VALUES ($1, 'tourism', $2::jsonb, NOW(), NOW())
RETURNING id, industry, schema_json;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Tabla multi-propósito para configuraciones específicas de industria
- Para CALENDAR: `industry = NULL` y `booking_schema` contiene configuración de horarios/servicios
- Para SOLAR: `industry = 'solar_logic'` y `booking_schema = '{}'`
- Para TURISMO: `industry = 'tourism'` y `schema_json` contiene datos dinámicos de tours
- Cada tenant puede tener 1 config de calendar (se crea automáticamente)

---

## 5. TABLAS DE BOT Y CONFIGURACIÓN DE IA

### TABLA: bot_profiles
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `name` (text DEFAULT 'Default')
- `ai_enabled` (boolean DEFAULT true)
- `tone` (text - nullable) - descripción del tono del bot
- `attitude` (text - nullable) - descripción de actitud
- `purpose` (text - nullable) - propósito del bot
- `language` (text DEFAULT 'es') - 'es', 'es-MX', 'en', etc
- `use_custom_prompt` (boolean DEFAULT false)
- `custom_prompt` (text - nullable)
- `tools` (jsonb - nullable) - { kb: bool, email: bool, media: bool, calendar: bool }
- `policies` (jsonb - nullable) - políticas de comportamiento
- `is_active` (boolean DEFAULT true)
- `config_version` (integer)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO bot_profiles (
  tenant_id, ai_enabled, name, tone, attitude, purpose, language, 
  use_custom_prompt, custom_prompt, tools, policies, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
ON CONFLICT (tenant_id) DO UPDATE SET
  ai_enabled = EXCLUDED.ai_enabled,
  name = EXCLUDED.name,
  tone = EXCLUDED.tone,
  attitude = EXCLUDED.attitude,
  purpose = EXCLUDED.purpose,
  language = EXCLUDED.language,
  use_custom_prompt = EXCLUDED.use_custom_prompt,
  custom_prompt = EXCLUDED.custom_prompt,
  tools = EXCLUDED.tools,
  policies = EXCLUDED.policies
RETURNING id, tenant_id;
```

**tenant_id relacionado**: Sí (UNIQUE - 1 bot profile por tenant)  
**Notas**:
- UNIQUE(tenant_id) - solo 1 bot profile activo por tenant
- Se crea automáticamente al crear tenant
- Default tools: `{"kb": false, "email": false, "media": false, "calendar": false}`
- Default language: 'es'
- Policies contiene estructura: `{ vibes, config, guided, behavior, knowledge }`

---

### TABLA: tenant_runtime_state
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `human_outbound_ai_behavior` (text DEFAULT 'none') - 'none', 'cooldown'
- `human_outbound_cooldown_minutes` (integer DEFAULT 0)
- `ai_force_off` (boolean DEFAULT false) - kill switch global
- `ai_disabled_until` (timestamptz - nullable) - tiempo hasta re-habilitar
- `ai_disabled_reason` (text - nullable)
- `welcome_enabled` (boolean DEFAULT false)
- `welcome_message` (text - nullable)
- `reengagement_enabled` (boolean DEFAULT false)
- `reengagement_after_days` (integer - nullable)
- `updated_at` (timestamptz DEFAULT now())
- `created_at` (timestamptz DEFAULT now())

**INSERT template**:
```sql
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
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (tenant_id) DO UPDATE SET
  human_outbound_ai_behavior = EXCLUDED.human_outbound_ai_behavior,
  human_outbound_cooldown_minutes = EXCLUDED.human_outbound_cooldown_minutes,
  ai_force_off = EXCLUDED.ai_force_off,
  welcome_enabled = EXCLUDED.welcome_enabled,
  welcome_message = EXCLUDED.welcome_message,
  reengagement_enabled = EXCLUDED.reengagement_enabled,
  reengagement_after_days = EXCLUDED.reengagement_after_days
RETURNING tenant_id;
```

**tenant_id relacionado**: Sí (UNIQUE - 1 runtime state por tenant)  
**Notas**:
- Controla comportamiento de IA en runtime
- `ai_force_off = true` deshabilita IA completamente
- `human_outbound_ai_behavior = 'cooldown'` requiere esperar minutos antes de siguiente mensaje
- Se crea automáticamente con defaults seguros al crear tenant

---

## 6. TABLAS DE CANALES Y INTEGRACIÓN

### TABLA: channel_accounts
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `channel_type` (text - 'whatsapp', 'webchat', 'email')
- `provider` (text - 'evolution', 'twilio', etc)
- `account_type` (text - 'business', 'personal' para WhatsApp)
- `account_label` (text - nullable, nombre descriptivo)
- `phone_e164` (text - nullable, para WhatsApp)
- `wa_business_account_id` (text - nullable, instance name en Evolution)
- `wa_phone_number_id` (text - nullable)
- `provider_account_id` (text - nullable, account ID en provider)
- `integration_id` (bigint REFERENCES integrations(id) - nullable)
- `is_default` (boolean DEFAULT false) - canal principal del tenant
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO channel_accounts (
  tenant_id, channel_type, provider, account_type, account_label,
  phone_e164, wa_business_account_id, wa_phone_number_id,
  provider_account_id, integration_id, is_default, is_active, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
RETURNING id, channel_type, provider;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Canal WhatsApp por defecto usa provider 'evolution'
- Cada tenant puede tener N canales (múltiples WhatsApp, webchat, etc)
- `is_default = true` indica canal principal (usado por defecto en UI)
- Para WhatsApp: `provider_account_id = wa_business_account_id`

---

### TABLA: integrations
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `type` (text - 'whatsapp', 'email', 'n8n', etc)
- `name` (text)
- `config` (jsonb - nullable) - configuración específica de la integración
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO integrations (tenant_id, type, name, config, is_active, created_at)
VALUES ($1, $2, $3, $4, $5, NOW())
RETURNING id, name, type;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Integraciones usadas por workflows
- Cada integración puede estar linked a N channel_accounts y workflows

---

## 7. TABLAS DE TAGS Y FEATURES

### TABLA: tags
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint REFERENCES tenants(id) ON DELETE CASCADE - nullable para universal)
- `name` (text NOT NULL)
- `color` (text - nullable, hex color)
- `description` (text - nullable)
- `rules_json` (jsonb - nullable)
- `is_system` (boolean DEFAULT false) - tags de sistema vs custom
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO tags (tenant_id, name, color, description, rules_json, is_system, created_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING id, name;
```

**tenant_id relacionado**: Sí (nullable - tags universales soportadas)  
**Notas**:
- Tags usados para clasificar leads/conversaciones
- `is_system = true` para tags predefinidos del sistema
- Pueden ser universales (`tenant_id = NULL`) o específicos del tenant

---

### TABLA: tenant_features
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `feature_key` (text NOT NULL) - 'calendar', 'automation', 'custom_fields', etc
- `enabled` (boolean DEFAULT false)
- `created_at` (timestamptz DEFAULT now())
- UNIQUE(tenant_id, feature_key)

**INSERT template**:
```sql
INSERT INTO tenant_features (tenant_id, feature_key, enabled, created_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled
RETURNING tenant_id, feature_key, enabled;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Feature flags para cada tenant
- Examples: 'calendar', 'automation', 'solar_logic', 'workflows'
- UNIQUE(tenant_id, feature_key) previene duplicados

---

## 8. TABLAS DE WORKFLOWS Y AUTOMATIZACIÓN

### TABLA: workflows
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `key` (text NOT NULL) - identificador único (e.g., 'welcome_message')
- `name` (text)
- `description` (text - nullable)
- `engine` (text DEFAULT 'n8n') - 'n8n', 'internal', etc
- `trigger_type` (text - nullable) - 'conversation_started', 'message_received', etc
- `trigger_filter` (jsonb - nullable)
- `integration_id` (bigint REFERENCES integrations(id) - nullable)
- `url` (text - nullable, webhook URL)
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)
- UNIQUE(tenant_id, key)

**INSERT template**:
```sql
INSERT INTO workflows (
  tenant_id, key, name, engine, trigger_type, trigger_filter, 
  integration_id, is_active, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (tenant_id, key) DO UPDATE SET
  name = EXCLUDED.name,
  trigger_type = EXCLUDED.trigger_type,
  integration_id = EXCLUDED.integration_id,
  is_active = EXCLUDED.is_active
RETURNING id, key, name;
```

**tenant_id relacionado**: Sí  
**Notas**:
- UNIQUE(tenant_id, key) - cada workflow es unique per tenant
- Típicamente 5-10 workflows por tenant
- Creados automáticamente al crear tenant bundle

---

### TABLA: workflow_assignments
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `workflow_id` (bigint NOT NULL REFERENCES workflows(id) ON DELETE CASCADE)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `target_type` (text - nullable) - 'lead', 'conversation', 'stage', etc
- `target_filter` (jsonb - nullable) - filtro de aplicación
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())

**INSERT template**:
```sql
INSERT INTO workflow_assignments (
  workflow_id, tenant_id, target_type, target_filter, is_active, created_at
) VALUES ($1, $2, $3, $4, $5, NOW())
RETURNING id, workflow_id, target_type;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Define a qué entidades se aplica un workflow
- `target_filter` puede especificar: pipeline_id, stage_id, contact_id, etc

---

### TABLA: tenant_apps
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `key` (text) - identificador único
- `name` (text)
- `ui_url` (text - nullable)
- `api_webhook_url` (text - nullable) - endpoint para webhooks
- `config` (jsonb - nullable)
- `is_active` (boolean DEFAULT true)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO tenant_apps (
  tenant_id, key, name, ui_url, api_webhook_url, config, is_active, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
RETURNING id, key, name;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Apps personalizadas instaladas en el tenant
- `api_webhook_url` es endpoint para recibir eventos
- Usado por workflows para invocación

---

## 9. TABLAS ESPECIALIZADAS

### TABLA: tenant_runtime_state (scheduler config)
**NOTA**: Ver migración `20251222_create_scheduling_tables.sql`

#### tenant_scheduling_config
**Columnas**:
- `tenant_id` (bigint PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE)
- `timezone` (text DEFAULT 'UTC')
- `slot_interval_min` (integer DEFAULT 30)
- `lead_time_min` (integer DEFAULT 60)
- `default_travel_time_min` (integer DEFAULT 0)
- `before_buffer_min` (integer DEFAULT 0)
- `after_buffer_min` (integer DEFAULT 0)
- `same_day_cutoff_local` (time DEFAULT '12:00:00')
- `updated_at` (timestamptz DEFAULT now())

**INSERT template**:
```sql
INSERT INTO tenant_scheduling_config (
  tenant_id, timezone, slot_interval_min, lead_time_min, 
  default_travel_time_min, before_buffer_min, after_buffer_min, same_day_cutoff_local
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING tenant_id;
```

**tenant_id relacionado**: Sí (PRIMARY KEY)  
**Notas**: Config para el scheduler de citas

---

#### tenant_weekly_hours
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `day_of_week` (smallint 0-6, 0=Sunday)
- `is_open` (boolean DEFAULT true)
- `open_time_local` (time)
- `close_time_local` (time)
- `breaks_json` (jsonb - nullable)
- UNIQUE(tenant_id, day_of_week)

**INSERT template**:
```sql
INSERT INTO tenant_weekly_hours (
  tenant_id, day_of_week, is_open, open_time_local, close_time_local, breaks_json
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, tenant_id, day_of_week;
```

**tenant_id relacionado**: Sí  
**Notas**: Horarios de operación por día de la semana

---

#### tenant_services
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `code` (text NOT NULL) - identificador (e.g., 'service-1')
- `name` (text NOT NULL)
- `base_duration_min` (integer DEFAULT 30)
- `duration_delta_min` (integer DEFAULT 0)
- `price_mxn` (numeric(12,2) DEFAULT 0)
- `metadata` (jsonb - nullable)
- UNIQUE(tenant_id, code)

**INSERT template**:
```sql
INSERT INTO tenant_services (
  tenant_id, code, name, base_duration_min, duration_delta_min, price_mxn, metadata
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, tenant_id, code;
```

**tenant_id relacionado**: Sí  
**Notas**: Servicios ofrecidos por el tenant para booking/calendario

---

### TABLA: tours_calendar
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `route_key` (text)
- `trip_date` (date)
- `departure_time` (time)
- `price` (numeric(10,2))
- `status` (text DEFAULT 'available') - 'available', 'full', 'cancelled'
- `origin_area` (text - nullable)
- `destination_area` (text - nullable)
- `metadata` (jsonb - nullable)
- `created_at` (timestamptz DEFAULT now())
- `updated_at` (timestamptz)

**INSERT template**:
```sql
INSERT INTO tours_calendar (
  tenant_id, route_key, trip_date, departure_time, price, 
  status, origin_area, destination_area, metadata
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, route_key, trip_date;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Específico para tenant de Turismo (Turisticos del Norte)
- Almacena viajes/tours disponibles
- Creados manualmente o via API

---

### TABLA: events
**Columnas**:
- `id` (bigserial PRIMARY KEY)
- `tenant_id` (bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE)
- `event_type` (text) - 'superadmin_create_tenant', 'superadmin_reset_password', etc
- `payload` (jsonb - nullable)
- `created_at` (timestamptz DEFAULT now())

**INSERT template**:
```sql
INSERT INTO events (tenant_id, event_type, payload, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING id, tenant_id, event_type;
```

**tenant_id relacionado**: Sí  
**Notas**:
- Tabla de auditoría/logging
- Registra eventos del sistema
- Best-effort (no falla si no se inserta)
- No tiene UPDATE/DELETE

---

## 10. RESUMEN DE INSERCIÓN AL CREAR UN NUEVO TENANT

### Orden recomendado:
1. **tenants** → obtener `tenant_id`
2. **users** (al menos 1 admin)
3. **tenant_runtime_state** (defaults: ai=off, cooldown=0)
4. **bot_profiles** (default config)
5. **pipelines** (default 'Default' pipeline)
6. **pipeline_stages** (5-6 stages default)
7. **tenant_features** (feature flags)
8. **integrations** (si hay)
9. **channel_accounts** (al menos 1 WhatsApp)
10. **workflows** (si hay workflows predefinidos)
11. **workflow_assignments** (links workflows)
12. **tags** (si hay tags iniciales)
13. **tenant_scheduling_config** (si calendar activo)
14. **tenant_weekly_hours** (horarios para scheduling)
15. **tenant_services** (servicios si calendar activo)
16. **industry_configs** (calendar config si activo)
17. **tenant_apps** (apps personalizadas si hay)

---

## 11. TABLAS EXCLUIDAS (AUTOLAVADO)

Las siguientes tablas pertenecen al módulo de autolavado (tenant_id = 24) y **NO** se incluyen en este análisis:

- `bookings` - reservas de autolavado
- `location_candidates` - ubicaciones
- `meal_policy` - políticas de comidas
- `service_vehicle_modifiers` - modificadores de servicios
- `services` - servicios de autolavado
- `tenant_settings` - configuración específica de autolavado
- `weekly_hours` - horarios semanales de autolavado
- `workers` - trabajadores/mecánicos
- `zones` - zonas de cobertura

---

## 12. VALORES POR DEFECTO PRINCIPALES

| Tabla | Campo | Default |
|-------|-------|---------|
| tenants | status | 'active' |
| tenants | is_active | true |
| users | is_active | true |
| pipelines | kind | 'sales' |
| pipelines | is_default | false |
| pipeline_stages | position | 0 |
| pipeline_stages | is_final | false |
| conversations | status | 'open' |
| bot_profiles | language | 'es' |
| bot_profiles | ai_enabled | true |
| tenant_runtime_state | ai_force_off | false |
| tenant_runtime_state | human_outbound_ai_behavior | 'none' |
| channel_accounts | is_active | true |
| workflows | is_active | true |
| tenant_features | enabled | false |

---

## 13. CONSTRAINTS Y RELACIONES IMPORTANTES

```
tenants
  ├── 1:N users (tenant_id FK)
  ├── 1:N pipelines (tenant_id FK, nullable)
  ├── 1:1 bot_profiles (tenant_id FK, UNIQUE)
  ├── 1:1 tenant_runtime_state (tenant_id FK, UNIQUE)
  ├── 1:N contacts (tenant_id FK)
  │   └── 1:N leads (contact_id FK)
  ├── 1:N conversations (tenant_id FK, contact_id FK)
  ├── 1:N channel_accounts (tenant_id FK)
  ├── 1:N integrations (tenant_id FK)
  ├── 1:N workflows (tenant_id FK)
  │   └── 1:N workflow_assignments (workflow_id FK)
  ├── 1:N tags (tenant_id FK, nullable)
  ├── 1:N tenant_features (tenant_id FK)
  ├── 1:N industry_configs (tenant_id FK)
  ├── 1:1 tenant_scheduling_config (tenant_id FK, PK)
  ├── 1:N tenant_weekly_hours (tenant_id FK)
  ├── 1:N tenant_services (tenant_id FK)
  ├── 1:N tenant_apps (tenant_id FK)
  ├── 1:N tours_calendar (tenant_id FK) [Turismo only]
  └── 1:N events (tenant_id FK)

pipelines (tenant_id FK)
  └── 1:N pipeline_stages (pipeline_id FK)
      └── N leads (stage_id FK)
```

---

## 14. MIGRACIONES APLICADAS

- `20251222_create_scheduling_tables.sql` - crea tenant_scheduling_config, tenant_weekly_hours, tenant_services
- `20260102_add_vehicle_count_to_bookings.sql` - (autolavado, excluido)
- `20260122_add_position_to_pipeline_stages.sql` - añade `position` a pipeline_stages
- `20260122_add_stage_order_to_pipelines.sql` - añade `stage_order INT[]` a pipelines
- `20260123_fill_stage_order_for_all_pipelines.sql` - inicializa stage_order
- `20260124_seed_default_pipeline.sql` - crea pipeline universal default si no existe
- `add_custom_modules.sql` - añade `custom_modules` a tenants

---

## CONCLUSIÓN

El proyecto Conviaq utiliza un diseño multi-tenant robusto con:
- **17 tablas principales** (excluyendo autolavado)
- **Estructura modular** con features flags
- **Multi-canal** (WhatsApp, webchat, email)
- **Workflows y automatización** (n8n integration)
- **Configuración dinámica** (industry_configs)
- **Auditoría** (events table)

Todos los datos de un tenant están aislados vía `tenant_id` con CASCADE delete para garantizar integridad.
