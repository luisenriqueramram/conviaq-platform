# TABLA DE REFERENCIA RÁPIDA - Conviaq Platform SQL

## 1. VALORES POR DEFECTO

| Tabla | Campo | Default | Tipo |
|-------|-------|---------|------|
| tenants | status | 'active' | text |
| tenants | is_active | true | boolean |
| tenants | custom_modules | '[]' | jsonb |
| users | is_active | true | boolean |
| pipelines | kind | 'sales' | text |
| pipelines | is_default | false | boolean |
| pipeline_stages | position | 0 | integer |
| pipeline_stages | is_final | false | boolean |
| conversations | status | 'open' | text |
| bot_profiles | language | 'es' | text |
| bot_profiles | ai_enabled | true | boolean |
| bot_profiles | is_active | true | boolean |
| tenant_runtime_state | ai_force_off | false | boolean |
| tenant_runtime_state | human_outbound_ai_behavior | 'none' | text |
| tenant_runtime_state | human_outbound_cooldown_minutes | 0 | integer |
| channel_accounts | is_active | true | boolean |
| channel_accounts | is_default | false | boolean |
| integrations | is_active | true | boolean |
| tags | is_system | false | boolean |
| tenant_features | enabled | false | boolean |
| workflows | is_active | true | boolean |
| workflow_assignments | is_active | true | boolean |
| tenant_apps | is_active | true | boolean |
| tenant_scheduling_config | timezone | 'UTC' | text |
| tenant_scheduling_config | slot_interval_min | 30 | integer |
| tenant_scheduling_config | lead_time_min | 60 | integer |
| tenant_scheduling_config | same_day_cutoff_local | '12:00:00' | time |
| tenant_weekly_hours | is_open | true | boolean |
| leads | currency | 'MXN' | text |
| tours_calendar | status | 'available' | text |

---

## 2. PIPELINE STAGES - COLORES Y ESTRUCTURA ESTÁNDAR

### Default Pipeline Structure
```
Stage 0: Nuevo (new)
  - Color: #0ea5e9 (azul)
  - is_final: false
  - Descripción: Lead ingresa al sistema

Stage 1: Contactado (contacted)
  - Color: #34d399 (verde)
  - is_final: false
  - Descripción: Se hizo contacto inicial

Stage 2: Propuesta (quoted)
  - Color: #f59e0b (naranja)
  - is_final: false
  - Descripción: Se envió propuesta

Stage 3: Negociación (negotiation)
  - Color: #fb7185 (rojo suave)
  - is_final: false
  - Descripción: En negociación de términos

Stage 4: Ganado (won)
  - Color: #60a5fa (azul claro)
  - is_final: true
  - Descripción: Deal completado

Stage 5: Perdido (lost)
  - Color: #8b5cf6 (púrpura)
  - is_final: true
  - Descripción: Deal rechazado
```

---

## 3. ROLES DE USUARIO

| Role | Scope | Permisos |
|------|-------|----------|
| superadmin | Sistema | Gestionar todos los tenants, usuarios, planes |
| admin | Tenant | Configuración del tenant, usuarios del tenant, bot |
| tenant | Tenant | Portal (leads, pipelines, conversaciones) |
| user | Tenant | Acceso solo lectura (si existe) |

---

## 4. FEATURE KEYS (Tabla: tenant_features)

| Feature Key | Descripción | Dependencias |
|-------------|-------------|--------------|
| calendar | Scheduling y booking | industry_configs requerido |
| automation | Automaciones básicas | workflows |
| workflows | Workflows avanzados (n8n) | integrations |
| custom_fields | Campos personalizados en leads | - |
| solar_logic | Módulo de paneles solares | industry_configs con industry='solar_logic' |
| tourism | Módulo de turismo | industry_configs con industry='tourism' |

---

## 5. CHANNEL TYPES

| Channel Type | Provider | Required Fields |
|--------------|----------|-----------------|
| whatsapp | evolution | phone_e164, wa_business_account_id, provider_account_id |
| webchat | internal | - |
| email | external | - |

---

## 6. WORKFLOW TRIGGER TYPES

| Trigger Type | Evento | Payload |
|--------------|--------|---------|
| conversation_started | Nueva conversación inicia | contact_id, channel_type |
| message_received | Nuevo mensaje | contact_id, message_text |
| message_contains | Mensaje contiene palabras clave | keywords (array) |
| lead_created | Nuevo lead creado | lead_id, pipeline_id, stage_id |
| lead_stage_changed | Lead cambio de stage | lead_id, old_stage, new_stage |
| scheduled | Trigger programado | cron expression |

---

## 7. COLORES HEXADECIMALES ESTÁNDAR

```
#0ea5e9  - Azul (New/Primary)
#34d399  - Verde (Success/Contacted)
#f59e0b  - Naranja (Warning/Proposal)
#fb7185  - Rojo Suave (Negotiation)
#60a5fa  - Azul Claro (Won/Success)
#8b5cf6  - Púrpura (Lost/Final)
#ef4444  - Rojo (Urgent)
#fbbf24  - Amarillo (VIP)
#3b82f6  - Azul Oscuro (Follow-up)
#6366f1  - Índigo (Custom)
```

---

## 8. CAMPOS JSONB - ESTRUCTURA ESPERADA

### bot_profiles.tools
```json
{
  "kb": false,
  "email": false,
  "media": false,
  "calendar": false
}
```

### bot_profiles.policies
```json
{
  "vibes": {
    "tone": "amigable y profesional",
    "style_rules": {
      "avoid_phrases": [],
      "preferred_phrases": []
    }
  },
  "config": {
    "mode": "guided"
  },
  "guided": {
    "can_do": "puede pedir datos",
    "cannot_do": "no puede dar información sensible",
    "escalation": "cuando no sepa",
    "procedures": "saluda, pide nombre",
    "limitations": "ninguna"
  },
  "behavior": {
    "never_do": [],
    "always_do": []
  },
  "knowledge": {
    "source": "external_or_manual",
    "raw_text": ""
  }
}
```

### industry_configs.booking_schema
```json
{
  "active": true,
  "timezone": "America/Mexico_City",
  "services": {
    "service-1": {
      "name": "Consulta General",
      "duration": 30,
      "price": 500,
      "buffer_after": 15
    }
  },
  "schedules": {},
  "metadata": {}
}
```

### tenant_weekly_hours.breaks_json
```json
{
  "lunch": ["12:00", "13:00"],
  "break": ["15:00", "15:15"]
}
```

### tours_calendar.metadata
```json
{
  "stops": [
    {
      "place": "Cerro de la Silla",
      "duration": 30
    }
  ],
  "included": ["water", "snacks"],
  "guide": "Juan García"
}
```

### contacts.metadata
```json
{
  "source": "whatsapp",
  "tags": ["vip"],
  "last_seen": "2026-02-15T10:30:00Z"
}
```

### workflow_assignments.target_filter
```json
{
  "pipeline_id": 50,
  "stage_id": [101, 102],
  "contact_tags": ["vip"]
}
```

---

## 9. QUERIES COMUNES

### Obtener todos los stages de un pipeline en orden
```sql
SELECT id, name, stage_key, position, color, is_final
FROM pipeline_stages
WHERE pipeline_id = $1
ORDER BY position ASC;
```

### Obtener leads por stage
```sql
SELECT l.id, l.name, l.deal_value, ps.name as stage_name
FROM leads l
JOIN pipeline_stages ps ON ps.id = l.stage_id
WHERE l.tenant_id = $1 AND l.pipeline_id = $2 AND l.stage_id = $3
ORDER BY l.updated_at DESC;
```

### Obtener todas las conversaciones abiertas
```sql
SELECT id, contact_id, channel_type, started_at, last_message_at
FROM conversations
WHERE tenant_id = $1 AND status = 'open'
ORDER BY last_message_at DESC NULLS LAST;
```

### Obtener configuración del bot
```sql
SELECT ai_enabled, tone, attitude, purpose, language, tools, policies
FROM bot_profiles
WHERE tenant_id = $1;
```

### Obtener features habilitados del tenant
```sql
SELECT feature_key, enabled
FROM tenant_features
WHERE tenant_id = $1 AND enabled = true;
```

### Obtener horarios del tenant
```sql
SELECT day_of_week, is_open, open_time_local, close_time_local
FROM tenant_weekly_hours
WHERE tenant_id = $1
ORDER BY day_of_week ASC;
```

### Obtener servicios disponibles
```sql
SELECT code, name, base_duration_min, price_mxn
FROM tenant_services
WHERE tenant_id = $1
ORDER BY code ASC;
```

### Obtener workflows activos
```sql
SELECT id, key, name, trigger_type, is_active
FROM workflows
WHERE tenant_id = $1 AND is_active = true
ORDER BY key ASC;
```

---

## 10. CONSTRAINTS Y VALIDACIONES

### UNIQUE Constraints
- `tenants(slug)` - slug único globalmente
- `users(email)` - email único globalmente
- `bot_profiles(tenant_id)` - 1 bot por tenant
- `tenant_runtime_state(tenant_id)` - 1 runtime state por tenant
- `tenant_scheduling_config(tenant_id)` - 1 config por tenant
- `tenant_weekly_hours(tenant_id, day_of_week)` - 1 horario por día por tenant
- `tenant_services(tenant_id, code)` - código único por tenant
- `workflows(tenant_id, key)` - workflow key único por tenant
- `tenant_features(tenant_id, feature_key)` - 1 feature setting por tenant
- `pipeline_stages(pipeline_id, stage_key)` - stage_key único por pipeline

### Foreign Key Constraints (ON DELETE CASCADE)
- users → tenants
- pipelines → tenants (nullable)
- contacts → tenants
- conversations → tenants
- conversations → contacts (SET NULL)
- leads → tenants
- leads → pipelines
- leads → pipeline_stages
- leads → contacts (SET NULL)
- channel_accounts → tenants
- integrations → tenants
- tags → tenants (nullable)
- workflows → tenants
- workflow_assignments → workflows
- tenant_features → tenants
- tenant_apps → tenants
- industry_configs → tenants
- tours_calendar → tenants
- events → tenants
- tenant_scheduling_config → tenants
- tenant_weekly_hours → tenants
- tenant_services → tenants

### CHECK Constraints
- `tenant_weekly_hours(day_of_week)` - entre 0 y 6
- `leads(deal_value)` - numerics positivos (implícito)

---

## 11. TIPOS DE DATOS CLAVE

| SQL Type | Uso | Ejemplo |
|----------|-----|---------|
| bigserial | ID primarias | tenant_id |
| text | Strings largo | nombres, descripciones |
| numeric(12,2) | Dinero | deal_value, precios |
| jsonb | Datos complejos | tools, policies, metadata |
| timestamptz | Timestamps con TZ | created_at, updated_at |
| time | Horas locales | open_time_local |
| date | Fechas | trip_date |
| boolean | Flags | is_active, is_default |
| INT[] | Arrays de enteros | stage_order (array de IDs) |

---

## 12. PATRONES DE INSERCIÓN COMUNES

### Patrón 1: CREATE o UPDATE (UPSERT)
```sql
INSERT INTO tabla (col1, col2, ...) VALUES ($1, $2, ...)
ON CONFLICT (unique_col) DO UPDATE SET col1 = EXCLUDED.col1
RETURNING id;
```

### Patrón 2: Inserción en Transacción
```sql
BEGIN;
  INSERT INTO tabla1 ...
  INSERT INTO tabla2 ...
COMMIT;
```

### Patrón 3: Cascada de Inserciones (obtener ID generado)
```sql
INSERT INTO pipelines (...) RETURNING id; -- Obtener pipeline_id
INSERT INTO pipeline_stages (...) VALUES (pipeline_id, ...); -- Usar en siguiente
UPDATE pipelines SET stage_order = ARRAY[...] WHERE id = pipeline_id;
```

---

## 13. ÍNDICES RECOMENDADOS (Para Performance)

```sql
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_wa_jid ON contacts(wa_jid);
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_pipeline_id ON leads(pipeline_id);
CREATE INDEX idx_leads_stage_id ON leads(stage_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_channel_accounts_tenant_id ON channel_accounts(tenant_id);
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX idx_tenant_features_tenant_id ON tenant_features(tenant_id);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_industry_configs_tenant_id ON industry_configs(tenant_id);
```

---

## 14. QUERIES DE VALIDACIÓN/DEBUGGING

### Verificar integridad de pipeline de un tenant
```sql
SELECT p.id, p.name, COUNT(ps.id) as stage_count
FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
WHERE p.tenant_id = $1
GROUP BY p.id, p.name;
```

### Verificar leads por stage
```sql
SELECT ps.name, COUNT(l.id) as lead_count
FROM pipeline_stages ps
LEFT JOIN leads l ON l.stage_id = ps.id
WHERE ps.pipeline_id = $1
GROUP BY ps.id, ps.name
ORDER BY ps.position ASC;
```

### Verificar features habilitados vs campos rellenados
```sql
SELECT f.feature_key, f.enabled,
  CASE 
    WHEN f.feature_key = 'calendar' THEN (SELECT COUNT(*) FROM industry_configs WHERE tenant_id = $1) > 0
    WHEN f.feature_key = 'workflows' THEN (SELECT COUNT(*) FROM workflows WHERE tenant_id = $1) > 0
  END as is_configured
FROM tenant_features f
WHERE f.tenant_id = $1;
```

### Verificar orfandad de datos
```sql
-- Leads sin pipeline válido
SELECT l.id, l.name FROM leads l
LEFT JOIN pipelines p ON p.id = l.pipeline_id
WHERE l.tenant_id = $1 AND p.id IS NULL;

-- Leads sin stage válido
SELECT l.id, l.name FROM leads l
LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
WHERE l.tenant_id = $1 AND ps.id IS NULL;

-- Conversaciones sin contact
SELECT id, channel_identifier FROM conversations
WHERE tenant_id = $1 AND contact_id IS NULL;
```

---

## 15. OPERACIONES DE LIMPIEZA

### Eliminar tenant y cascada
```sql
DELETE FROM tenants WHERE id = $1;
-- Automáticamente elimina: users, pipelines, pipeline_stages, leads, contacts, 
-- conversations, channel_accounts, integrations, workflows, etc.
```

### Resetear pipeline stages (mantener pipeline)
```sql
DELETE FROM pipeline_stages WHERE pipeline_id = $1;
UPDATE pipelines SET stage_order = NULL WHERE id = $1;
```

### Desactivar workflows
```sql
UPDATE workflows SET is_active = false WHERE tenant_id = $1;
```

### Desactivar IA globalmente
```sql
UPDATE tenant_runtime_state
SET ai_force_off = true, ai_disabled_reason = 'Mantenimiento'
WHERE tenant_id = $1;
```

