# ÍNDICE COMPLETO - Análisis de Tablas SQL Conviaq Platform

## 📋 Documentación Generada

Este análisis exhaustivo consta de **5 documentos** complementarios:

### 1. **TABLA_STRUCTURE_ANALYSIS.md** 📊
Análisis completo y detallado de TODAS las tablas SQL del proyecto.
- Estructura de cada tabla (todas las columnas)
- INSERT templates exactos
- Relaciones y constraints
- Notas sobre defaults y comportamiento
- Migraciones aplicadas

**Usar para**: Entender la estructura exacta de cada tabla, constraints, y cómo crear registros.

---

### 2. **INSERCION_EJEMPLOS.md** 🔧
Ejemplos prácticos de cómo insertar datos en cada tabla.
- Ejemplo completo: crear un tenant desde cero (transacción completa)
- Ejemplo 2: crear lead desde conversación
- Ejemplo 3: cambiar lead de stage
- Ejemplo 4: crear tag y asignar
- Ejemplo 5: crear workflow con trigger
- Ejemplo 6: actualizar bot profile
- Ejemplo 7: deshabilitar IA globalmente
- Ejemplo 8: habilitar feature
- Ejemplo 9: crear tour (turismo)
- Ejemplo 10: actualizar industry config

**Usar para**: Copiar ejemplos exactos de INSERT statements y adaptarlos a necesidades específicas.

---

### 3. **TABLAS_RESUMEN_EJECUTIVO.md** 📋
Resumen ejecutivo en el formato exacto solicitado.
- Lista de TODAS las 17 tablas en formato estándar
- Para cada tabla: columnas, INSERT template, tenant_id, notas
- Resumen estadístico
- Orden de creación recomendado
- Migraciones aplicadas

**Usar para**: Referencia rápida del formato de INSERT, entender orden de creación.

---

### 4. **REFERENCIA_RAPIDA_SQL.md** ⚡
Tabla de referencia rápida con información práctica.
- Valores por defecto de todas las columnas
- Pipeline stages estándar (colores, posiciones)
- Roles de usuario
- Feature keys
- Channel types y workflow triggers
- Colores hexadecimales estándar
- Estructura de campos JSONB
- Queries comunes
- Constraints y validaciones
- Patrones de inserción comunes
- Índices recomendados

**Usar para**: Referencia rápida durante codificación, valores por defecto, queries comunes.

---

### 5. **DIAGRAMA_RELACIONES.md** 📈
Diagramas visuales de relaciones y flujos.
- ER diagram completo (ASCII art)
- Flujo de creación de tenant (paso a paso)
- Flujo de creación de lead (automático + manual)
- Flujo de workflow assignment
- Relaciones críticas
- Cardinalidad de todas las relaciones

**Usar para**: Entender la arquitectura, flujos de datos, relaciones entre tablas.

---

## 🗂️ TABLA DE CONTENIDOS RÁPIDA

### Tablas Core (5)
1. **tenants** - Tabla raíz multi-tenancia
2. **users** - Usuarios por tenant
3. **bot_profiles** - Configuración de bot (1:1 con tenant)
4. **tenant_runtime_state** - Estado runtime (1:1 con tenant)
5. **events** - Auditoría y logging

### Tablas de Pipelines & Leads (3)
6. **pipelines** - Pipelines de ventas
7. **pipeline_stages** - Etapas del pipeline
8. **leads** - Oportunidades/leads

### Tablas de Contactos & Conversaciones (3)
9. **contacts** - Contactos (creados por webhooks)
10. **conversations** - Conversaciones en canales
11. (relación implícita: conversations → contacts → leads)

### Tablas de Canales (2)
12. **channel_accounts** - Cuentas de canales (WhatsApp, etc)
13. **integrations** - Integraciones externas

### Tablas de Automatización (3)
14. **workflows** - Workflows/automatizaciones
15. **workflow_assignments** - Asignaciones de workflows
16. **tenant_apps** - Apps personalizadas

### Tablas de Configuración (4)
17. **tenant_features** - Feature flags
18. **tags** - Etiquetas para clasificación
19. **industry_configs** - Configuraciones específicas (calendar, solar, turismo)
20. **tenant_scheduling_config** - Config del scheduler
21. **tenant_weekly_hours** - Horarios semanales
22. **tenant_services** - Servicios ofrecidos

### Tablas Especializadas (1)
23. **tours_calendar** - Tours/viajes (turismo)

**Total: 17 tablas principales + 6 tablas de scheduling/servicios**

---

## 🎯 GUÍA DE USO POR CASO

### Caso 1: "Necesito crear un tenant nuevo"
1. Leer: **TABLA_STRUCTURE_ANALYSIS.md** - sección "1. TABLAS CORE"
2. Ver ejemplo: **INSERCION_EJEMPLOS.md** - "EJEMPLO COMPLETO"
3. Consultar defaults: **REFERENCIA_RAPIDA_SQL.md** - "1. VALORES POR DEFECTO"
4. Entender flujo: **DIAGRAMA_RELACIONES.md** - "FLUJO DE CREACIÓN DE TENANT"

### Caso 2: "¿Cuál es la estructura exacta de la tabla X?"
1. Buscar tabla en: **TABLA_STRUCTURE_ANALYSIS.md**
2. Ver INSERT template exacto
3. Consultar constraints en **TABLAS_RESUMEN_EJECUTIVO.md**

### Caso 3: "Necesito un INSERT statement para la tabla X"
1. Ir a: **INSERCION_EJEMPLOS.md**
2. Si no hay ejemplo específico, ir a: **TABLAS_RESUMEN_EJECUTIVO.md** y copiar INSERT template

### Caso 4: "¿Cuáles son los defaults de la tabla X?"
1. Ir a: **REFERENCIA_RAPIDA_SQL.md** - "1. VALORES POR DEFECTO"
2. O buscar en: **TABLA_STRUCTURE_ANALYSIS.md** - sección de la tabla

### Caso 5: "¿Cómo están relacionadas las tablas X y Y?"
1. Ver: **DIAGRAMA_RELACIONES.md** - ER diagram
2. Buscar en: **TABLA_STRUCTURE_ANALYSIS.md** - "13. CONSTRAINTS Y RELACIONES IMPORTANTES"
3. Consultar: **REFERENCIA_RAPIDA_SQL.md** - "10. CONSTRAINTS Y VALIDACIONES"

### Caso 6: "¿Cómo habilitar una feature específica?"
1. Ver feature keys: **REFERENCIA_RAPIDA_SQL.md** - "4. FEATURE KEYS"
2. Ver ejemplo: **INSERCION_EJEMPLOS.md** - "EJEMPLO 8"
3. Si necesita config adicional, consultar **TABLA_STRUCTURE_ANALYSIS.md** - tabla `industry_configs`

### Caso 7: "Necesito hacer una query común"
1. Ir a: **REFERENCIA_RAPIDA_SQL.md** - "9. QUERIES COMUNES"
2. Adaptarla a necesidades específicas

### Caso 8: "¿Cuál es el orden correcto para crear un tenant?"
1. Ver: **DIAGRAMA_RELACIONES.md** - "FLUJO DE CREACIÓN DE TENANT"
2. Confirmar con: **TABLAS_RESUMEN_EJECUTIVO.md** - "ORDEN DE CREACIÓN RECOMENDADO"

---

## 📊 ESTADÍSTICAS

### Tablas por Categoría
- **Core**: 5 tablas
- **Sales/Leads**: 3 tablas
- **Contacts/Conversations**: 3 tablas
- **Channels**: 2 tablas
- **Automation**: 3 tablas
- **Configuration**: 4 tablas
- **Specialized**: 1 tabla (tours)

**Total: 21 tablas documentadas**

### Columnas Totales
Aproximadamente **200+ columnas** en total a través de todas las tablas.

### Foreign Keys
**16 tablas** tienen `tenant_id` como FK a `tenants(id)`
**1 tabla** no tiene `tenant_id` directo (`pipeline_stages` - heredado)

### UNIQUE Constraints
- `tenants(slug)` - global
- `users(email)` - global
- `bot_profiles(tenant_id)` - 1 por tenant
- `tenant_runtime_state(tenant_id)` - 1 por tenant
- `workflows(tenant_id, key)` - 1 por tenant
- `tenant_features(tenant_id, feature_key)` - 1 por tenant
- `tenant_services(tenant_id, code)` - 1 por tenant
- `tenant_weekly_hours(tenant_id, day_of_week)` - 1 por tenant

### Columnas JSONB
- `bot_profiles.tools` - configuración de herramientas
- `bot_profiles.policies` - políticas de comportamiento
- `industry_configs.schema_json` - datos especializados
- `industry_configs.booking_schema` - configuración de bookings
- `workflow_assignments.target_filter` - filtro de aplicación
- `tenant_weekly_hours.breaks_json` - descansos/breaks
- `tenant_services.metadata` - metadata de servicios
- `contacts.metadata` - datos adicionales de contacto
- `conversations.metadata` - datos adicionales de conversación
- `tours_calendar.metadata` - datos adicionales de tours
- `integrations.config` - configuración de integración
- `tenant_apps.config` - configuración de app

### Campos de Timestamps
**Todas las tablas** tienen `created_at` (timestamptz)
**Casi todas** tienen `updated_at` (timestamptz)

### Campos Nullable vs NOT NULL
- **Muy pocas columns NOT NULL requeridas** al insertar (name, email son las más comunes)
- **Mayoría de campos opcionales** (nullable)
- Esto permite inserciones parciales y updates posteriores

---

## ✅ VALIDACIONES INCLUIDAS

### Check Constraints
- `day_of_week` en `tenant_weekly_hours` (0-6)
- `currency` en `leads` (validado por aplicación)

### Unique Constraints
- 8 unique constraints documentadas

### Foreign Key Constraints
- **16 tablas** con FK a `tenants(id)` con CASCADE DELETE
- 1 FK a `pipelines(id)` con CASCADE DELETE
- 1 FK a `pipeline_stages(id)`
- Varias FKs con SET NULL para relaciones débiles

### Application-Level Validations
- Email format
- Phone format normalization (+52...)
- Slug format (solo alfanuméricos y guiones)
- Role values ('admin', 'tenant', 'superadmin')
- Status values ('active', 'open', 'closed', etc)

---

## 🔄 FLUJOS PRINCIPALES

### 1. Provisioning Tenant
```
tenants → users → bot_profiles → pipelines → pipeline_stages
  ↓          ↓          ↓            ↓
integrations → channel_accounts → workflows
  ↓
tenant_features → industry_configs → scheduling (opcional)
```

### 2. Contacto a Lead
```
Webhook WhatsApp
  ↓
contacts (creado automático)
  ↓
conversations (creado automático)
  ↓
leads (creado manual por usuario)
  ↓
lead moves through pipeline_stages
```

### 3. Automatización
```
workflows (definición)
  ↓
workflow_assignments (a qué aplica)
  ↓
Trigger evento (lead_created, message_received, etc)
  ↓
integration (n8n, webhook, etc)
  ↓
Acción (enviar mensaje, notificar, etc)
```

---

## 🚀 MIGRACIONES IMPORTANTES

| Migración | Tablas Afectadas | Propósito |
|-----------|------------------|----------|
| 20251222_create_scheduling_tables.sql | tenant_scheduling_config, tenant_weekly_hours, tenant_services | Agregar funcionalidad de scheduling |
| 20260122_add_position_to_pipeline_stages.sql | pipeline_stages | Agregar ordenamiento visual |
| 20260122_add_stage_order_to_pipelines.sql | pipelines | Guardar orden de stages |
| 20260123_fill_stage_order_for_all_pipelines.sql | pipelines | Inicializar orden |
| 20260124_seed_default_pipeline.sql | pipelines, pipeline_stages | Crear pipeline universal default |
| add_custom_modules.sql | tenants | Agregar módulos dinámicos |

---

## 📝 NOTAS IMPORTANTES

### Multitenancia
- **TODAS las tablas** están diseñadas con `tenant_id`
- **Cascade delete** en `tenant_id` asegura aislamiento total
- **Algunos campos** pueden ser NULL para `tenant_id` (pipelines, tags - universales)

### Defaults Seguros
- `ai_force_off = false` (IA habilitada por defecto)
- `is_active = true` (todo activo por defecto)
- `is_default = false` (nada es default excepto pipelines especificadas)
- `enabled = false` en features (features OFF por defecto, habilitar explícitamente)

### Datos Automáticos vs Manuales
- **Automático**: contacts, conversations (webhooks)
- **Manual**: tenants, users, pipelines, leads, workflows, tags
- **Ambos**: industry_configs (puede ser creado automático o manual)

### Campos Opcionales
- Mayoría de campos son **opcionales** (nullable)
- Permite insertar datos incompletos
- Datos se completan/actualizan después (UPDATE)

### JSON Flexibility
- **Múltiples columnas JSONB** permiten store datos dinámicos
- `metadata` fields en varias tablas para datos custom
- `config` fields para configuraciones específicas de integración

---

## 🔍 CÓMO BUSCAR INFORMACIÓN

### Por Tabla
- **Busca en nombre de tabla** en cualquier documento
- **Ejemplo**: buscar "industry_configs" en TABLA_STRUCTURE_ANALYSIS.md

### Por Campo
- **Busca en "Columnas:"** en TABLAS_RESUMEN_EJECUTIVO.md
- **Busca en "VALORES POR DEFECTO"** en REFERENCIA_RAPIDA_SQL.md

### Por Relación
- **Consulta ER diagram** en DIAGRAMA_RELACIONES.md
- **Busca en "CONSTRAINTS Y RELACIONES"** en TABLA_STRUCTURE_ANALYSIS.md

### Por Funcionalidad
- **Features**: busca en REFERENCIA_RAPIDA_SQL.md - "FEATURE KEYS"
- **Workflows**: busca en TABLA_STRUCTURE_ANALYSIS.md - "8. TABLAS DE WORKFLOWS"
- **Scheduling**: busca en TABLA_STRUCTURE_ANALYSIS.md - "9. TABLAS ESPECIALIZADAS"

---

## 📌 CONCLUSIÓN

Este análisis proporciona **documentación completa y exhaustiva** de todas las tablas SQL del proyecto Conviaq Platform.

**Documentos incluidos**:
1. ✅ TABLA_STRUCTURE_ANALYSIS.md (17 tablas, detalles completos)
2. ✅ INSERCION_EJEMPLOS.md (10 ejemplos prácticos)
3. ✅ TABLAS_RESUMEN_EJECUTIVO.md (formato solicitado)
4. ✅ REFERENCIA_RAPIDA_SQL.md (tabla de referencia rápida)
5. ✅ DIAGRAMA_RELACIONES.md (diagramas y flujos)

**Total**: 5 documentos, >300 KB de documentación estructurada.

