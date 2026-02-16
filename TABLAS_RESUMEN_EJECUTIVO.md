# RESUMEN EJECUTIVO - Tablas SQL del Proyecto Conviaq

## FORMATO SOLICITADO: Lista Completa con Templates de INSERT

---

TABLA: tenants
Columnas: [id (PK), name, slug (UNIQUE), plan_id (FK), status, domain, custom_modules (jsonb), is_active, created_at, updated_at]
INSERT template: INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, slug, plan_id, status;
tenant_id relacionado: Sí (tabla padre)
Notas: Tabla raíz de multi-tenancia. Slug debe ser único. custom_modules almacena módulos dinámicos. Cuando se elimina, CASCADE delete todas las relaciones.

---

TABLA: users
Columnas: [id (PK), tenant_id (FK), email (UNIQUE), name, password_hash, role, is_active, created_at, updated_at]
INSERT template: INSERT INTO users (tenant_id, name, email, role, password_hash, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, email, role;
tenant_id relacionado: Sí
Notas: Email único globalmente. Roles: 'admin', 'tenant', 'superadmin'. Cada tenant requiere al menos 1 admin. CASCADE delete con tenant.

---

TABLA: pipelines
Columnas: [id (PK), tenant_id (FK nullable), name, kind, is_default, stage_order (INT[]), created_at, updated_at]
INSERT template: INSERT INTO pipelines (tenant_id, name, kind, is_default, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, kind, is_default;
tenant_id relacionado: Sí (nullable - permite pipelines universales)
Notas: tenant_id=NULL = pipeline universal. kind típico: 'sales'. stage_order es array de IDs de stages. Mínimo 1 por tenant.

---

TABLA: pipeline_stages
Columnas: [id (PK), pipeline_id (FK), name, stage_key, position, color, is_final, description, ai_criteria (jsonb), created_at, updated_at]
INSERT template: INSERT INTO pipeline_stages (pipeline_id, name, stage_key, position, color, is_final, description, ai_criteria, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id, pipeline_id, name, stage_key, position;
tenant_id relacionado: No (heredado via pipeline_id)
Notas: stage_key: 'new', 'contacted', 'quoted', 'negotiation', 'won', 'lost'. Colores: '#0ea5e9' (azul), '#34d399' (verde), '#f59e0b' (naranja), '#fb7185' (rojo), '#60a5fa' (celeste). SIEMPRE actualizar pipelines.stage_order después.

---

TABLA: contacts
Columnas: [id (PK), tenant_id (FK), name, wa_jid, phone_e164, email, metadata (jsonb), created_at, updated_at]
INSERT template: INSERT INTO contacts (tenant_id, name, wa_jid, phone_e164, email, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, name, wa_jid;
tenant_id relacionado: Sí
Notas: Creados automáticamente por webhook WhatsApp. wa_jid unique per tenant. Muchos sin nombre inicial. CASCADE delete con tenant. Conversión a leads manual.

---

TABLA: conversations
Columnas: [id (PK), tenant_id (FK), contact_id (FK nullable), channel_type, channel_identifier, status, started_at, last_message_at, metadata (jsonb), created_at]
INSERT template: INSERT INTO conversations (tenant_id, contact_id, channel_type, channel_identifier, status, started_at, created_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, channel_identifier, status;
tenant_id relacionado: Sí
Notas: Creadas automáticamente por webhooks. contact_id nullable. channel_identifier unique per tenant+channel. Status: 'open', 'closed', 'resolved'. CASCADE delete con tenant.

---

TABLA: leads
Columnas: [id (PK), tenant_id (FK), name, company, email, phone, deal_value (numeric), currency, pipeline_id (FK), stage_id (FK), contact_id (FK), created_at, updated_at]
INSERT template: INSERT INTO leads (tenant_id, name, company, email, phone, deal_value, currency, pipeline_id, stage_id, contact_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING id, name, company, stage_id;
tenant_id relacionado: Sí
Notas: pipeline_id y stage_id obligatorios. contact_id típicamente seteado. deal_value nullable. Relación 1:N con contacts (1 lead → 1 contact, pero 1 contact → N leads).

---

TABLA: bot_profiles
Columnas: [id (PK), tenant_id (FK UNIQUE), name, ai_enabled, tone, attitude, purpose, language, use_custom_prompt, custom_prompt, tools (jsonb), policies (jsonb), is_active, config_version, created_at, updated_at]
INSERT template: INSERT INTO bot_profiles (tenant_id, ai_enabled, name, tone, attitude, purpose, language, use_custom_prompt, custom_prompt, tools, policies, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) ON CONFLICT (tenant_id) DO UPDATE SET ai_enabled=EXCLUDED.ai_enabled, name=EXCLUDED.name, tone=EXCLUDED.tone, attitude=EXCLUDED.attitude, purpose=EXCLUDED.purpose, language=EXCLUDED.language, use_custom_prompt=EXCLUDED.use_custom_prompt, custom_prompt=EXCLUDED.custom_prompt, tools=EXCLUDED.tools, policies=EXCLUDED.policies RETURNING id, tenant_id;
tenant_id relacionado: Sí (UNIQUE - 1 por tenant)
Notas: Creado automáticamente al crear tenant. Default language 'es'. Default tools: {"kb":false,"email":false,"media":false,"calendar":false}. Policies: estructura complex con vibes, config, guided, behavior, knowledge.

---

TABLA: tenant_runtime_state
Columnas: [id (PK), tenant_id (FK UNIQUE), human_outbound_ai_behavior, human_outbound_cooldown_minutes, ai_force_off, ai_disabled_until, ai_disabled_reason, welcome_enabled, welcome_message, reengagement_enabled, reengagement_after_days, updated_at, created_at]
INSERT template: INSERT INTO tenant_runtime_state (tenant_id, human_outbound_ai_behavior, human_outbound_cooldown_minutes, ai_force_off, welcome_enabled, welcome_message, reengagement_enabled, reengagement_after_days, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) ON CONFLICT (tenant_id) DO UPDATE SET human_outbound_ai_behavior=EXCLUDED.human_outbound_ai_behavior, human_outbound_cooldown_minutes=EXCLUDED.human_outbound_cooldown_minutes, ai_force_off=EXCLUDED.ai_force_off, welcome_enabled=EXCLUDED.welcome_enabled, welcome_message=EXCLUDED.welcome_message, reengagement_enabled=EXCLUDED.reengagement_enabled, reengagement_after_days=EXCLUDED.reengagement_after_days RETURNING tenant_id;
tenant_id relacionado: Sí (UNIQUE - 1 por tenant)
Notas: Creado automáticamente con defaults: behavior='none', cooldown_min=0, ai_force_off=false, welcome=false, reengagement=false. ai_force_off=true es kill switch global. ai_disabled_until para deshabilitar temporalmente.

---

TABLA: channel_accounts
Columnas: [id (PK), tenant_id (FK), channel_type, provider, account_type, account_label, phone_e164, wa_business_account_id, wa_phone_number_id, provider_account_id, integration_id (FK), is_default, is_active, created_at, updated_at]
INSERT template: INSERT INTO channel_accounts (tenant_id, channel_type, provider, account_type, account_label, phone_e164, wa_business_account_id, wa_phone_number_id, provider_account_id, integration_id, is_default, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id, channel_type, provider;
tenant_id relacionado: Sí
Notas: channel_type='whatsapp', provider='evolution'. account_type='business' o 'personal'. Para WhatsApp: provider_account_id=wa_business_account_id. is_default=true para canal principal. N canales por tenant.

---

TABLA: integrations
Columnas: [id (PK), tenant_id (FK), type, name, config (jsonb), is_active, created_at, updated_at]
INSERT template: INSERT INTO integrations (tenant_id, type, name, config, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, type;
tenant_id relacionado: Sí
Notas: Integraciones (n8n, webhooks, etc). Usadas por workflows. config puede ser cualquier JSON. Relación 1:N con channel_accounts y workflows.

---

TABLA: tags
Columnas: [id (PK), tenant_id (FK nullable), name, color, description, rules_json (jsonb), is_system, created_at, updated_at]
INSERT template: INSERT INTO tags (tenant_id, name, color, description, rules_json, is_system, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, name;
tenant_id relacionado: Sí (nullable - tags universales)
Notas: Para clasificar leads/conversaciones. is_system=true para tags del sistema. Pueden ser universales (tenant_id=NULL) o específicos. Colores en hex. Típicamente 3-5 tags por tenant.

---

TABLA: tenant_features
Columnas: [id (PK), tenant_id (FK), feature_key, enabled, created_at, UNIQUE(tenant_id, feature_key)]
INSERT template: INSERT INTO tenant_features (tenant_id, feature_key, enabled, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled=EXCLUDED.enabled RETURNING tenant_id, feature_key, enabled;
tenant_id relacionado: Sí
Notas: Feature flags por tenant. Keys: 'calendar', 'automation', 'workflows', 'custom_fields', 'solar_logic', 'tourism', etc. enabled=false por defecto. UNIQUE constraint previene duplicados.

---

TABLA: workflows
Columnas: [id (PK), tenant_id (FK), key (UNIQUE per tenant), name, description, engine, trigger_type, trigger_filter (jsonb), integration_id (FK), url, is_active, created_at, updated_at]
INSERT template: INSERT INTO workflows (tenant_id, key, name, engine, trigger_type, trigger_filter, integration_id, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) ON CONFLICT (tenant_id, key) DO UPDATE SET name=EXCLUDED.name, trigger_type=EXCLUDED.trigger_type, integration_id=EXCLUDED.integration_id, is_active=EXCLUDED.is_active RETURNING id, key, name;
tenant_id relacionado: Sí
Notas: UNIQUE(tenant_id, key). engine='n8n' típico. Trigger types: 'conversation_started', 'message_received', 'message_contains', etc. 5-10 workflows típicamente por tenant. Creados automáticamente al provisionar.

---

TABLA: workflow_assignments
Columnas: [id (PK), workflow_id (FK), tenant_id (FK), target_type, target_filter (jsonb), is_active, created_at]
INSERT template: INSERT INTO workflow_assignments (workflow_id, tenant_id, target_type, target_filter, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, workflow_id, target_type;
tenant_id relacionado: Sí
Notas: Define a qué entidades se aplica un workflow. target_type: 'lead', 'conversation', 'stage', etc. target_filter: JSON con pipeline_id, stage_id, contact_id, etc.

---

TABLA: tenant_apps
Columnas: [id (PK), tenant_id (FK), key, name, ui_url, api_webhook_url, config (jsonb), is_active, created_at, updated_at]
INSERT template: INSERT INTO tenant_apps (tenant_id, key, name, ui_url, api_webhook_url, config, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id, key, name;
tenant_id relacionado: Sí
Notas: Apps personalizadas instaladas. api_webhook_url es endpoint para webhooks. config es JSON dinámico. Usado por workflows para invocación.

---

TABLA: industry_configs
Columnas: [id (PK), tenant_id (FK), industry (nullable), schema_json (jsonb), booking_schema (jsonb), created_at, updated_at]
INSERT template (calendar): INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at) VALUES ($1, NULL, $2::jsonb, NOW(), NOW()) RETURNING id, industry, booking_schema;
INSERT template (solar_logic): INSERT INTO industry_configs (tenant_id, industry, booking_schema, created_at, updated_at) VALUES ($1, 'solar_logic', '{}'::jsonb, NOW(), NOW()) RETURNING id, industry;
INSERT template (tourism): INSERT INTO industry_configs (tenant_id, industry, schema_json, created_at, updated_at) VALUES ($1, 'tourism', $2::jsonb, NOW(), NOW()) RETURNING id, industry, schema_json;
tenant_id relacionado: Sí
Notas: Multi-propósito. industry=NULL para calendar (booking_schema contiene horarios/servicios). industry='solar_logic' para paneles solares. industry='tourism' para Turisticos del Norte (schema_json contiene datos tours). Cada tenant 1 config de calendar.

---

TABLA: tours_calendar
Columnas: [id (PK), tenant_id (FK), route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata (jsonb), created_at, updated_at]
INSERT template: INSERT INTO tours_calendar (tenant_id, route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id, route_key, trip_date, status;
tenant_id relacionado: Sí
Notas: Específico para turismo (tenant_id=24 típicamente). Status: 'available', 'full', 'cancelled'. metadata contiene stops, guide, included items. Creados manualmente o via API.

---

TABLA: tenant_scheduling_config
Columnas: [tenant_id (PK/FK), timezone, slot_interval_min, lead_time_min, default_travel_time_min, before_buffer_min, after_buffer_min, same_day_cutoff_local, updated_at]
INSERT template: INSERT INTO tenant_scheduling_config (tenant_id, timezone, slot_interval_min, lead_time_min, default_travel_time_min, before_buffer_min, after_buffer_min, same_day_cutoff_local, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING tenant_id;
tenant_id relacionado: Sí (PRIMARY KEY - 1:1)
Notas: Config para scheduler. Defaults: timezone='UTC', slot_interval=30min, lead_time=60min, cutoff='12:00:00'. Si calendar activo, crear automáticamente.

---

TABLA: tenant_weekly_hours
Columnas: [id (PK), tenant_id (FK), day_of_week (0-6), is_open, open_time_local, close_time_local, breaks_json (jsonb), UNIQUE(tenant_id, day_of_week)]
INSERT template: INSERT INTO tenant_weekly_hours (tenant_id, day_of_week, is_open, open_time_local, close_time_local, breaks_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, tenant_id, day_of_week;
tenant_id relacionado: Sí
Notas: Horarios por día (0=Sunday, 1=Monday...6=Saturday). is_open=false para días cerrados. breaks_json: {"lunch": ["12:00", "13:00"]}. 7 registros por tenant típicamente.

---

TABLA: tenant_services
Columnas: [id (PK), tenant_id (FK), code (UNIQUE per tenant), name, base_duration_min, duration_delta_min, price_mxn (numeric), metadata (jsonb), UNIQUE(tenant_id, code)]
INSERT template: INSERT INTO tenant_services (tenant_id, code, name, base_duration_min, duration_delta_min, price_mxn, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, tenant_id, code;
tenant_id relacionado: Sí
Notas: Servicios para booking/calendario. Ejemplos: 'consul-general', 'consul-premium', 'followup'. Duración en minutos. price_mxn para precios. 3-10 servicios típicamente por tenant.

---

TABLA: events
Columnas: [id (PK), tenant_id (FK), event_type, payload (jsonb), created_at]
INSERT template: INSERT INTO events (tenant_id, event_type, payload, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, tenant_id, event_type;
tenant_id relacionado: Sí
Notas: Auditoría/logging. event_type: 'superadmin_create_tenant', 'lead_stage_changed', 'bot_updated', etc. Best-effort (falla no impacta). No tiene UPDATE/DELETE. Creado automáticamente para eventos importantes.

---

## RESUMEN ESTADÍSTICO

**Total de Tablas**: 17 tablas (core)
**Con tenant_id**: 16 tablas
**Tablas Padre**: tenants (tabla raíz)
**Relaciones 1:1 con tenant_id**: bot_profiles, tenant_runtime_state, tenant_scheduling_config
**Relaciones 1:N con tenant_id**: users, pipelines, contacts, conversations, leads, channel_accounts, integrations, tags, workflows, tenant_features, tenant_apps, industry_configs, tours_calendar, events, tenant_weekly_hours, tenant_services
**Sin tenant_id directo**: pipeline_stages (heredado via pipeline_id)

## ORDEN DE CREACIÓN RECOMENDADO

1. tenants
2. users
3. tenant_runtime_state
4. bot_profiles
5. pipelines
6. pipeline_stages → actualizar pipelines.stage_order
7. integrations
8. channel_accounts
9. tenant_features
10. tags
11. workflows
12. workflow_assignments
13. tenant_apps
14. industry_configs
15. tenant_scheduling_config
16. tenant_weekly_hours
17. tenant_services
18. contacts (automático vía webhook)
19. conversations (automático vía webhook)
20. leads (manual después de contacts)
21. events (automático para auditoría)

## MIGRACIONES APLICADAS

1. 20251222_create_scheduling_tables.sql - tenant_scheduling_config, tenant_weekly_hours, tenant_services
2. 20260102_add_vehicle_count_to_bookings.sql - (autolavado, excluido)
3. 20260122_add_position_to_pipeline_stages.sql - añade position a pipeline_stages
4. 20260122_add_stage_order_to_pipelines.sql - añade stage_order INT[] a pipelines
5. 20260123_fill_stage_order_for_all_pipelines.sql - inicializa stage_order
6. 20260124_seed_default_pipeline.sql - crea pipeline universal default
7. add_custom_modules.sql - añade custom_modules jsonb a tenants

