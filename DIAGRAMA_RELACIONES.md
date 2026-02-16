# DIAGRAMA DE RELACIONES - Conviaq Platform

## DIAGRAMA ENTIDAD-RELACIÓN (ER)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CONVIAQ PLATFORM - ER DIAGRAM                          │
│                                                                                   │
│  CORE TABLES                          SALES/LEAD TABLES     WORKFLOW TABLES     │
│  ─────────────                        ──────────────────    ──────────────────  │
│                                                                                   │
│  ┌──────────────┐                    ┌──────────────┐      ┌──────────────┐   │
│  │  TENANTS     │                    │  PIPELINES   │      │ INTEGRATIONS │   │
│  ├──────────────┤                    ├──────────────┤      ├──────────────┤   │
│  │ id (PK)      │◄───────────────────│ tenant_id(FK)│      │ id (PK)      │   │
│  │ name         │      CASCADE       │ name         │      │ tenant_id(FK)├───┼─→ TENANTS
│  │ slug (UNIQ)  │        1:N         │ kind         │      │ type         │   │
│  │ plan_id      │                    │ is_default   │      │ name         │   │
│  │ status       │                    │ stage_order[]│      │ config(jsonb)│   │
│  │ custom_mods  │                    └──────────────┘      └──────────────┘   │
│  │ is_active    │                            │                     │           │
│  └──────────────┘                            │ 1:N                  │ 1:N       │
│        ▲                                      │                      │           │
│        │                                      ▼                      ▼           │
│        │                            ┌──────────────────┐  ┌──────────────────┐ │
│        │                            │ PIPELINE_STAGES  │  │ CHANNEL_ACCOUNTS │ │
│        │                            ├──────────────────┤  ├──────────────────┤ │
│        │                            │ id (PK)          │  │ id (PK)          │ │
│        │                            │ pipeline_id(FK)  │  │ tenant_id(FK)    │ │
│        │                            │ name             │  │ channel_type     │ │
│        │                            │ stage_key        │  │ phone_e164       │ │
│        │                            │ position         │  │ wa_business_id   │ │
│        │                            │ color            │  │ integration_id   │ │
│        │                            │ is_final         │  │ is_default       │ │
│        │                            │ description      │  │ is_active        │ │
│        │                            └──────────────────┘  └──────────────────┘ │
│        │                                    ▲                                   │
│        │                                    │ 1:N                              │
│        │                                    │                                  │
│        ├────────────────────────────────────┼──────────────────────────────────┤
│        │                                    │                                   │
│        │  ┌──────────────────┐             │        ┌──────────────────┐      │
│        │  │  USERS           │◄────────────┴────────│  LEADS           │      │
│        └─►├──────────────────┤  1:N                 ├──────────────────┤      │
│           │ id (PK)          │                      │ id (PK)          │      │
│           │ tenant_id(FK)    │                      │ tenant_id(FK)    │      │
│           │ email (UNIQ)     │                      │ name             │      │
│           │ password_hash    │                      │ company          │      │
│           │ role             │                      │ pipeline_id(FK)  │      │
│           │ is_active        │                      │ stage_id(FK)     │      │
│           └──────────────────┘                      │ contact_id(FK)   │      │
│                                                     │ deal_value       │      │
│           ┌──────────────────┐                      └──────────────────┘      │
│           │  BOT_PROFILES    │                              ▲                  │
│           ├──────────────────┤                              │                  │
│           │ id (PK)          │                              │                  │
│           │ tenant_id(UNIQ)  ├──────────────┐               │                  │
│           │ ai_enabled       │              │ 1:1           │                  │
│           │ tone             │              │              │ N:1               │
│           │ attitude         │              │              │                  │
│           │ purpose          │              │    ┌──────────────────┐          │
│           │ tools(jsonb)     │              │    │  CONTACTS        │          │
│           │ policies(jsonb)  │              │    ├──────────────────┤          │
│           └──────────────────┘              │    │ id (PK)          │          │
│                                             │    │ tenant_id(FK)    │          │
│           ┌──────────────────┐             │    │ name             │          │
│           │ TENANT_RUNTIME   │◄────────────┘    │ wa_jid           │          │
│           │ _STATE           │    1:1           │ phone_e164       │          │
│           ├──────────────────┤                  │ email            │          │
│           │ tenant_id(PK/FK) │                  │ metadata(jsonb)  │          │
│           │ ai_force_off     │                  └──────────────────┘          │
│           │ cooldown_minutes │                           ▲                    │
│           │ welcome_enabled  │                           │ 1:N               │
│           │ reengagement     │                           │                   │
│           └──────────────────┘         ┌──────────────────────────────┐      │
│                                        │     CONVERSATIONS           │       │
│           ┌──────────────────────────┐ ├──────────────────────────────┤      │
│           │ TENANT_FEATURES          │ │ id (PK)                      │      │
│           ├──────────────────────────┤ │ tenant_id(FK)                │      │
│           │ id (PK)                  │ │ contact_id(FK, nullable)     │      │
│           │ tenant_id(FK)            │ │ channel_type                 │      │
│           │ feature_key (UNIQ pair)  │ │ channel_identifier           │      │
│           │ enabled                  │ │ status                       │      │
│           └──────────────────────────┘ │ started_at                   │      │
│                                        │ last_message_at              │      │
│           ┌──────────────────────────┐ └──────────────────────────────┘      │
│           │ TAGS                     │                                       │
│           ├──────────────────────────┤                                       │
│           │ id (PK)                  │                                       │
│           │ tenant_id(FK, nullable)  │                                       │
│           │ name                     │                                       │
│           │ color                    │                                       │
│           │ is_system                │                                       │
│           └──────────────────────────┘                                       │
│                                                                                │
│  AUTOMATION/WORKFLOW TABLES                CONFIGURATION TABLES               │
│  ──────────────────────────────           ─────────────────────────           │
│                                                                                │
│  ┌──────────────────────────┐         ┌──────────────────────────────┐       │
│  │ WORKFLOWS                │         │ INDUSTRY_CONFIGS            │       │
│  ├──────────────────────────┤         ├──────────────────────────────┤       │
│  │ id (PK)                  │         │ id (PK)                      │       │
│  │ tenant_id(FK)            │         │ tenant_id(FK)                │       │
│  │ key (UNIQ pair)          │◄────────│ industry (nullable)          │       │
│  │ name                     │  1:N    │ schema_json(jsonb)           │       │
│  │ engine                   │         │ booking_schema(jsonb)        │       │
│  │ trigger_type             │         └──────────────────────────────┘       │
│  │ trigger_filter(jsonb)    │                                                │
│  │ integration_id(FK)       │         ┌──────────────────────────────┐       │
│  │ is_active                │         │ TENANT_SCHEDULING_CONFIG    │       │
│  └──────────────────────────┘         ├──────────────────────────────┤       │
│            │                          │ tenant_id(PK/FK)             │       │
│            │ 1:N                      │ timezone                     │       │
│            │                          │ slot_interval_min            │       │
│  ┌─────────▼──────────────────┐       │ lead_time_min                │       │
│  │ WORKFLOW_ASSIGNMENTS       │       │ same_day_cutoff_local        │       │
│  ├────────────────────────────┤       └──────────────────────────────┘       │
│  │ id (PK)                    │                                              │
│  │ workflow_id(FK)            │       ┌──────────────────────────────┐       │
│  │ tenant_id(FK)              │       │ TENANT_WEEKLY_HOURS         │       │
│  │ target_type                │       ├──────────────────────────────┤       │
│  │ target_filter(jsonb)       │       │ id (PK)                      │       │
│  │ is_active                  │       │ tenant_id(FK)                │       │
│  └────────────────────────────┘       │ day_of_week (0-6)            │       │
│                                       │ is_open                      │       │
│  ┌──────────────────────────┐         │ open_time_local              │       │
│  │ TENANT_APPS              │         │ close_time_local             │       │
│  ├──────────────────────────┤         │ breaks_json(jsonb)           │       │
│  │ id (PK)                  │         └──────────────────────────────┘       │
│  │ tenant_id(FK)            │                                                │
│  │ key                      │         ┌──────────────────────────────┐       │
│  │ name                     │         │ TENANT_SERVICES             │       │
│  │ ui_url                   │         ├──────────────────────────────┤       │
│  │ api_webhook_url          │         │ id (PK)                      │       │
│  │ config(jsonb)            │         │ tenant_id(FK)                │       │
│  │ is_active                │         │ code (UNIQ pair)             │       │
│  └──────────────────────────┘         │ name                         │       │
│                                       │ base_duration_min            │       │
│                                       │ price_mxn                    │       │
│                                       └──────────────────────────────┘       │
│                                                                                │
│  AUDIT TABLES                                SPECIALIZED TABLES               │
│  ────────────                                ────────────────                 │
│                                                                                │
│  ┌──────────────────────────┐         ┌──────────────────────────────┐       │
│  │ EVENTS                   │         │ TOURS_CALENDAR              │       │
│  ├──────────────────────────┤         ├──────────────────────────────┤       │
│  │ id (PK)                  │         │ id (PK)                      │       │
│  │ tenant_id(FK)            │         │ tenant_id(FK)                │       │
│  │ event_type               │         │ route_key                    │       │
│  │ payload(jsonb)           │         │ trip_date                    │       │
│  │ created_at               │         │ departure_time               │       │
│  └──────────────────────────┘         │ price                        │       │
│                                       │ status                       │       │
│                                       │ metadata(jsonb)              │       │
│                                       └──────────────────────────────┘       │
│                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## FLUJO DE CREACIÓN DE TENANT

```
                          ┌─────────────────────────┐
                          │ 1. Crear TENANTS        │
                          │ - name, slug, plan_id   │
                          │ - status = 'active'     │
                          │ → tenant_id = 100       │
                          └────────────┬────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
    ┌─────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ 2. Crear USERS      │ │ 3. Crear BOT_    │ │ 4. Crear TENANT_ │
    │ (admin)             │ │ PROFILES         │ │ RUNTIME_STATE    │
    │ - email             │ │ - ai_enabled     │ │ - ai_force_off   │
    │ - role='admin'      │ │ - tone, attitude │ │ - cooldown=0     │
    │ - password_hash     │ │ - language='es'  │ │ - welcome=false  │
    └──────────┬──────────┘ └────────┬─────────┘ └──────────┬───────┘
               │                     │                       │
               └─────────┬───────────┴───────────────────────┘
                         │
                         ▼
            ┌─────────────────────────────────┐
            │ 5. Crear PIPELINES (Default)    │
            │ - name = 'Default'              │
            │ - kind = 'sales'                │
            │ - is_default = true             │
            │ → pipeline_id = 50              │
            └────────────┬────────────────────┘
                         │
                         ▼
            ┌─────────────────────────────────┐
            │ 6. Crear PIPELINE_STAGES (6)    │
            │ 0: new         (#0ea5e9)        │
            │ 1: contacted   (#34d399)        │
            │ 2: quoted      (#f59e0b)        │
            │ 3: negotiation (#fb7185)        │
            │ 4: won         (#60a5fa) *final*
            │ 5: lost        (#8b5cf6) *final*
            │ → stage_ids = [101..106]        │
            └────────────┬────────────────────┘
                         │
                         ▼
            ┌─────────────────────────────────┐
            │ 7. UPDATE stage_order en         │
            │ PIPELINES                       │
            │ stage_order=[101,102,103,104,   │
            │             105,106]            │
            └────────────┬────────────────────┘
                         │
            ┌────────────┴──────────────┐
            │                           │
            ▼                           ▼
┌──────────────────────────┐ ┌────────────────────────┐
│ 8. Crear INTEGRATIONS    │ │ 9. Crear CHANNEL_      │
│ (WhatsApp)               │ │ ACCOUNTS (WhatsApp)    │
│ - type='whatsapp'        │ │ - channel_type='wa'    │
│ → integration_id=20      │ │ - phone_e164           │
│                          │ │ - wa_business_id       │
│                          │ │ - is_default=true      │
└──────────────────────────┘ └────────────────────────┘
            │                           │
            └────────────┬──────────────┘
                         │
            ┌────────────┴──────────────┐
            │                           │
            ▼                           ▼
┌──────────────────────────┐ ┌────────────────────────┐
│ 10. Crear TENANT_        │ │ 11. Crear TENANT_      │
│ FEATURES                 │ │ SCHEDULING_CONFIG      │
│ - calendar               │ │ (si calendar enabled)  │
│ - automation             │ │ - timezone             │
│ - workflows              │ │ - slot_interval_min    │
│ - custom_fields          │ │ - lead_time_min        │
│                          │ │ - same_day_cutoff      │
└──────────────────────────┘ └────────────────────────┘
            │                           │
            └────────────┬──────────────┘
                         │
            ┌────────────┴──────────────┐
            │                           │
            ▼                           ▼
┌──────────────────────────┐ ┌────────────────────────┐
│ 12. Crear TENANT_        │ │ 13. Crear INDUSTRY_    │
│ WEEKLY_HOURS (7 days)    │ │ CONFIGS (calendar)     │
│ - day_of_week (0-6)      │ │ - booking_schema       │
│ - open_time, close_time  │ │ - services definition  │
│ - breaks_json            │ │                        │
└──────────────────────────┘ └────────────────────────┘
            │                           │
            └────────────┬──────────────┘
                         │
                    ✓ TENANT LISTO
```

---

## FLUJO DE CREACIÓN DE LEAD

```
CONVERSACIÓN WEBHOOK                   MANUAL CONVERSION
(Automático)                           (Usuario)
     │                                      │
     ▼                                      │
┌──────────────────────┐                   │
│ 1. CONTACT creado    │                   │
│ via webhook          │                   │
│ - wa_jid             │                   │
│ - phone_e164         │                   │
│ - nombre (opcional)  │                   │
│ → contact_id = 201   │                   │
└──────────┬───────────┘                   │
           │                               │
           ▼                               │
┌──────────────────────┐                   │
│ 2. CONVERSATION      │                   │
│ creada               │                   │
│ - contact_id = 201   │                   │
│ - status = 'open'    │                   │
│ - channel_type='wa'  │                   │
└──────────┬───────────┘                   │
           │                               │
           └────────────────┬──────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │ 3. LEAD creado         │
                │ (manual)               │
                ├────────────────────────┤
                │ - name                 │
                │ - company              │
                │ - email                │
                │ - phone                │
                │ - deal_value           │
                │ - pipeline_id = 50     │
                │ - stage_id = 101 (new) │
                │ - contact_id = 201     │
                │ → lead_id = 1000       │
                └────────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              (Usuario mueve)   (Bot detección)
                    │                 │
                    ▼                 ▼
        ┌─────────────────────────────────────┐
        │ 4. LEAD stage_id ACTUALIZADO        │
        │ - stage_id = 102 (contacted)        │
        │ - updated_at = NOW()                │
        │ - EVENT registrado (si auditoría)   │
        └─────────────────────────────────────┘
```

---

## FLUJO DE WORKFLOW ASSIGNMENT

```
┌──────────────────────────────┐
│ WORKFLOW creado              │
│ - key='welcome'              │
│ - trigger_type=              │
│   'conversation_started'     │
│ - is_active = true           │
│ → workflow_id = 300          │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ WORKFLOW_ASSIGNMENT          │
│ - workflow_id = 300          │
│ - tenant_id = 100            │
│ - target_type = 'lead'       │
│ - target_filter = {          │
│     "pipeline_id": 50,       │
│     "stage_id": [101, 102]   │
│   }                          │
│ - is_active = true           │
└────────────┬─────────────────┘
             │
             ▼
  ┌──────────────────────┐
  │ Lead entra en        │
  │ stage 101 (new)      │
  │ en pipeline 50       │
  │ dentro target_filter │
  └──────────┬───────────┘
             │
             ▼
   ┌────────────────────────┐
   │ WORKFLOW triggerea     │
   │ - Execute trigger_type │
   │ - Call integration     │
   │ - Escalate to human    │
   └────────────────────────┘
```

---

## RELACIONES CRÍTICAS

### 1. Tenant → Todo
```
tenants (id=100)
  └─> users (múltiples)
  └─> pipelines (múltiples)
  └─> contacts (múltiples)
  └─> conversations (múltiples)
  └─> leads (múltiples)
  └─> bot_profiles (1 único)
  └─> tenant_runtime_state (1 único)
  └─> channel_accounts (múltiples)
  └─> integrations (múltiples)
  └─> tags (múltiples)
  └─> workflows (múltiples)
  └─> tenant_features (múltiples)
  └─> tenant_apps (múltiples)
  └─> industry_configs (múltiples)
  └─> events (múltiples, auditoría)
```

### 2. Pipeline → Leads
```
pipelines (id=50)
  └─> pipeline_stages (6 stages)
      └─> leads (múltiples leads por stage)
```

### 3. Contact → Conversations → Leads
```
contacts (id=201)
  └─> conversations (0 o múltiples)
  └─> leads (0 o múltiples)
```

### 4. Workflow → Assignments
```
workflows (id=300)
  └─> workflow_assignments (1 o múltiples)
      └─> aplica a leads que cumplan target_filter
```

---

## CARDINALIDAD RESUMIDA

| Relación | Cardinalidad | Notas |
|----------|--------------|-------|
| tenants ↔ users | 1:N | Cascade delete |
| tenants ↔ pipelines | 1:N | Pipeline puede ser NULL (universal) |
| pipelines ↔ pipeline_stages | 1:N | Cascade delete |
| pipeline_stages ↔ leads | 1:N | Cascade delete |
| tenants ↔ bot_profiles | 1:1 | Unique(tenant_id) |
| tenants ↔ tenant_runtime_state | 1:1 | Unique(tenant_id) |
| tenants ↔ contacts | 1:N | Cascade delete |
| contacts ↔ conversations | 1:N | Cascade delete |
| contacts ↔ leads | 1:N | Set null en leads |
| tenants ↔ leads | 1:N | Cascade delete |
| tenants ↔ channel_accounts | 1:N | Cascade delete |
| tenants ↔ integrations | 1:N | Cascade delete |
| integrations ↔ channel_accounts | 1:N | FK opcional |
| tenants ↔ workflows | 1:N | Cascade delete |
| workflows ↔ workflow_assignments | 1:N | Cascade delete |
| tenants ↔ tags | 1:N | Tag puede ser NULL (universal) |
| tenants ↔ tenant_features | 1:N | Cascade delete |
| tenants ↔ tenant_apps | 1:N | Cascade delete |
| tenants ↔ industry_configs | 1:N | Cascade delete |
| tenants ↔ tours_calendar | 1:N | Cascade delete |
| tenants ↔ events | 1:N | Cascade delete |

