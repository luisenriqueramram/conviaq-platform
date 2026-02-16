# 📚 ANÁLISIS EXHAUSTIVO DE TABLAS SQL - Conviaq Platform

## 🎯 Resumen Ejecutivo

Se ha realizado un análisis completo de **todas las tablas SQL** utilizadas en el proyecto Conviaq Platform (excluyendo tablas de autolavado).

**Resultado**: 5 documentos complementarios con **documentación detallada de 17+ tablas** y toda la información necesaria para:
- ✅ Entender la estructura completa del proyecto
- ✅ Crear nuevos tenants correctamente
- ✅ Insertar datos en cualquier tabla
- ✅ Entender relaciones y flujos de datos
- ✅ Implementar nuevas funcionalidades

---

## 📄 Documentos Generados

### 1. **TABLA_STRUCTURE_ANALYSIS.md** (Documento Principal)
**Contenido**: Análisis completo de todas las 17 tablas principales
- Estructura exacta de cada tabla (todas las columnas)
- Tipos de datos
- INSERT templates exactos
- Foreign keys y constraints
- Default values
- Notas sobre comportamiento
- Migraciones aplicadas
- Diagramas de relaciones

**Usar cuando**: Necesites entender la estructura exacta de una tabla

---

### 2. **INSERCION_EJEMPLOS.md** (Ejemplos Prácticos)
**Contenido**: 10 ejemplos completos de inserciones
1. ✅ Crear tenant desde cero (transacción completa)
2. ✅ Crear lead desde conversación
3. ✅ Cambiar lead de stage
4. ✅ Crear tag y asignar
5. ✅ Crear workflow con trigger
6. ✅ Actualizar bot profile
7. ✅ Deshabilitar IA globalmente
8. ✅ Habilitar feature
9. ✅ Crear tour (turismo)
10. ✅ Actualizar industry config

**Usar cuando**: Necesites código SQL listo para copiar y adaptar

---

### 3. **TABLAS_RESUMEN_EJECUTIVO.md** (Formato Solicitado)
**Contenido**: Lista de todas las 17 tablas en formato exacto solicitado
```
TABLA: nombre_tabla
Columnas: [lista]
INSERT template: [template exacto]
tenant_id relacionado: [si/no]
Notas: [información especial]
```

**Usar cuando**: Necesites referencia rápida en formato estandarizado

---

### 4. **REFERENCIA_RAPIDA_SQL.md** (Tabla de Referencia)
**Contenido**: 15 secciones de referencia rápida
- Valores por defecto (30+ campos)
- Pipeline stages estándar
- Roles de usuario
- Feature keys
- Channel types y triggers
- Colores hexadecimales
- Estructura de JSONB fields
- Queries comunes (8+ ejemplos)
- Constraints y validaciones
- Patrones de inserción
- Índices recomendados

**Usar cuando**: Necesites buscar valores específicos, defaults, o queries comunes

---

### 5. **DIAGRAMA_RELACIONES.md** (Diagramas y Flujos)
**Contenido**: Visualización de arquitectura y flujos
- ER diagram completo (ASCII art)
- Flujo de creación de tenant (paso a paso)
- Flujo de creación de lead
- Flujo de workflow assignment
- Relaciones críticas
- Tabla de cardinalidades

**Usar cuando**: Necesites entender la arquitectura de datos visualmente

---

### 6. **INDICE_DOCUMENTACION.md** (Este índice)
**Contenido**: Guía de navegación y uso de la documentación

**Usar cuando**: Necesites navegar entre documentos o encontrar información específica

---

## 🗂️ LISTA COMPLETA DE TABLAS

### Tablas Core del Sistema
1. **tenants** - Tabla raíz multi-tenancia
2. **users** - Usuarios por tenant
3. **bot_profiles** - Configuración del bot IA
4. **tenant_runtime_state** - Estado de ejecución del tenant
5. **events** - Auditoría y logging

### Tablas de Pipelines y Leads
6. **pipelines** - Pipelines de ventas
7. **pipeline_stages** - Etapas del pipeline
8. **leads** - Oportunidades de venta

### Tablas de Contactos y Conversaciones
9. **contacts** - Contactos (creados automáticamente por webhooks)
10. **conversations** - Conversaciones en canales

### Tablas de Canales e Integraciones
11. **channel_accounts** - Cuentas de canales (WhatsApp, etc)
12. **integrations** - Integraciones externas

### Tablas de Automatización y Workflows
13. **workflows** - Automatizaciones/workflows
14. **workflow_assignments** - Asignaciones de workflows
15. **tenant_apps** - Apps personalizadas

### Tablas de Configuración
16. **tenant_features** - Feature flags
17. **tags** - Etiquetas de clasificación
18. **industry_configs** - Configuraciones específicas (calendar, solar, turismo)
19. **tenant_scheduling_config** - Configuración del scheduler
20. **tenant_weekly_hours** - Horarios de operación
21. **tenant_services** - Servicios ofrecidos

### Tablas Especializadas
22. **tours_calendar** - Tours/viajes (módulo turismo)

**Total: 17 tablas principales documentadas**

---

## 🎓 CÓMO USAR ESTA DOCUMENTACIÓN

### Scenario 1: "Necesito crear un tenant nuevo"
1. Lee: **TABLA_STRUCTURE_ANALYSIS.md** → sección "1. TABLAS CORE"
2. Copia ejemplo: **INSERCION_EJEMPLOS.md** → "EJEMPLO COMPLETO"
3. Verifica defaults: **REFERENCIA_RAPIDA_SQL.md** → "1. VALORES POR DEFECTO"
4. Entiende flujo: **DIAGRAMA_RELACIONES.md** → "FLUJO DE CREACIÓN DE TENANT"

### Scenario 2: "¿Cuál es la estructura de tabla X?"
Busca tabla en **TABLA_STRUCTURE_ANALYSIS.md**
- Encontrarás: columnas, tipos, constraints, defaults, INSERT template

### Scenario 3: "Necesito INSERT statement para tabla X"
1. Si existe ejemplo específico: **INSERCION_EJEMPLOS.md**
2. Si no, copia template de: **TABLAS_RESUMEN_EJECUTIVO.md**
3. Verifica defaults en: **REFERENCIA_RAPIDA_SQL.md**

### Scenario 4: "¿Cómo están relacionadas tablas X y Y?"
1. Consulta ER diagram en: **DIAGRAMA_RELACIONES.md**
2. Lee detalles en: **TABLA_STRUCTURE_ANALYSIS.md** → "13. CONSTRAINTS Y RELACIONES"
3. Verifica cardinalidad en: **REFERENCIA_RAPIDA_SQL.md** → "10. CONSTRAINTS"

### Scenario 5: "Necesito una query SQL común"
Ve a **REFERENCIA_RAPIDA_SQL.md** → "9. QUERIES COMUNES"
- Encontrarás queries de ejemplo para operaciones típicas

---

## 📊 INFORMACIÓN ESTADÍSTICA

| Métrica | Cantidad |
|---------|----------|
| Tablas documentadas | 17 principales (+6 especializadas) |
| Total de columnas | 200+ |
| Campos con JSONB | 12+ |
| Foreign keys | 40+ |
| UNIQUE constraints | 8 |
| Timestamps por tabla | 2 (created_at, updated_at) |
| Migraciones aplicadas | 7 |

---

## 🔑 CONCEPTOS CLAVE

### Multi-Tenancia
- **TODAS las tablas** están diseñadas con `tenant_id`
- **Cascade delete** en `tenant_id` asegura aislamiento
- Permite múltiples clientes completamente aislados

### Multicanal
- Soporta **WhatsApp**, webchat, email
- Tabla `channel_accounts` gestiona múltiples canales por tenant
- Cada channel tiene conversaciones y mensajes independientes

### Automatización
- **Workflows** definen automatizaciones (triggers, acciones)
- **Workflow assignments** especifican a qué aplica
- Integración con n8n para orquestación compleja

### Defaults Seguros
- `ai_force_off = false` (IA ON por defecto)
- `is_active = true` (TODO activo por defecto)
- `enabled = false` en features (features OFF, habilitar explícitamente)

### Datos JSON Flexibles
- Múltiples columnas JSONB para datos dinámicos
- `metadata` fields para datos custom
- `config` fields para configuraciones específicas

---

## ✅ VALIDACIONES INCLUIDAS

### Constraints de Base de Datos
- ✅ UNIQUE constraints en email, slug, tenant_id combinations
- ✅ CHECK constraints en day_of_week (0-6)
- ✅ Foreign keys con CASCADE DELETE
- ✅ Foreign keys con SET NULL para relaciones débiles

### Validaciones de Aplicación
- ✅ Email format
- ✅ Phone number normalization
- ✅ Slug format (alphanumeric + hyphens)
- ✅ Enums (roles, statuses, feature keys)

---

## 🔄 FLUJOS PRINCIPALES DOCUMENTADOS

### 1. Provisioning de Tenant
```
tenants → users → bot_profiles → pipelines → pipeline_stages
     → integrations → channel_accounts → workflows
     → features, tags, industry_configs
```

### 2. Contacto a Lead
```
Webhook WhatsApp
     → contacts (creado automático)
     → conversations (creado automático)
     → leads (creado manual)
     → lead moves through pipeline_stages
```

### 3. Automatización
```
workflows → assignments → triggers → integrations → acciones
```

---

## 🚀 GUÍA DE REFERENCIA RÁPIDA

| Necesidad | Documento | Sección |
|-----------|-----------|---------|
| Estructura de tabla | TABLA_STRUCTURE_ANALYSIS | Buscar tabla |
| INSERT statement | INSERCION_EJEMPLOS | Buscar caso |
| Defaults de columna | REFERENCIA_RAPIDA_SQL | "1. VALORES POR DEFECTO" |
| Query común | REFERENCIA_RAPIDA_SQL | "9. QUERIES COMUNES" |
| Relación entre tablas | DIAGRAMA_RELACIONES | ER diagram |
| Feature keys | REFERENCIA_RAPIDA_SQL | "4. FEATURE KEYS" |
| Trigger types | REFERENCIA_RAPIDA_SQL | "6. WORKFLOW TRIGGER TYPES" |
| Colores estándar | REFERENCIA_RAPIDA_SQL | "7. COLORES HEXADECIMALES" |
| Estructura JSONB | REFERENCIA_RAPIDA_SQL | "8. CAMPOS JSONB" |
| Cardinalidades | DIAGRAMA_RELACIONES | "RELACIONES CRÍTICAS" |

---

## 💡 TIPS Y MEJORES PRÁCTICAS

### Al Crear un Tenant
1. ✅ SIEMPRE crear en transacción (BEGIN...COMMIT)
2. ✅ Crear usuario admin inmediatamente
3. ✅ Crear pipeline y stages (mínimo 6)
4. ✅ Crear at least 1 channel account
5. ✅ Registrar event para auditoría
6. ✅ SIEMPRE actualizar `pipelines.stage_order` después de crear stages

### Al Insertar Datos
1. ✅ Verificar `tenant_id` correcto
2. ✅ Usar defaults sensatos (ver REFERENCIA_RAPIDA_SQL)
3. ✅ NUNCA insertar NULL en campos NOT NULL
4. ✅ Validar foreign keys existan
5. ✅ Para JSONB: usar `::jsonb` cast explícito

### Queries
1. ✅ SIEMPRE filtrar por `tenant_id` (multi-tenancia)
2. ✅ USAR índices para tablas grandes
3. ✅ CONSIDERAR LIMIT en queries de lectura
4. ✅ USAR JOINs para evitar N+1 queries

### Performance
1. ✅ Índices en `tenant_id` (documentados)
2. ✅ Índices en foreign keys frecuentes
3. ✅ Particionamiento por `tenant_id` si > 10M registros
4. ✅ Archive old events periódicamente

---

## 🔗 RELACIÓN ENTRE DOCUMENTOS

```
INDICE_DOCUMENTACION.md (este archivo)
     ├─→ TABLA_STRUCTURE_ANALYSIS.md (estructura detallada)
     ├─→ INSERCION_EJEMPLOS.md (código práctico)
     ├─→ TABLAS_RESUMEN_EJECUTIVO.md (formato estándar)
     ├─→ REFERENCIA_RAPIDA_SQL.md (lookups rápidos)
     └─→ DIAGRAMA_RELACIONES.md (visualización)
```

Todos los documentos son **mutuamente referenciales** - puedes navegar entre ellos.

---

## 📝 INFORMACIÓN DE MIGRACIÓN

### Migraciones Aplicadas (en orden)
1. **20251222_create_scheduling_tables.sql**
   - Crea: tenant_scheduling_config, tenant_weekly_hours, tenant_services

2. **20260102_add_vehicle_count_to_bookings.sql**
   - (Autolavado - excluido)

3. **20260122_add_position_to_pipeline_stages.sql**
   - Añade: position INT a pipeline_stages

4. **20260122_add_stage_order_to_pipelines.sql**
   - Añade: stage_order INT[] a pipelines

5. **20260123_fill_stage_order_for_all_pipelines.sql**
   - Inicializa stage_order para todos los pipelines

6. **20260124_seed_default_pipeline.sql**
   - Crea pipeline universal default (si no existe)

7. **add_custom_modules.sql**
   - Añade: custom_modules JSONB a tenants

---

## 🎯 PRÓXIMOS PASOS

Después de revisar esta documentación, puedes:

1. **Crear un tenant nuevo** → Usa INSERCION_EJEMPLOS.md
2. **Entender datos existentes** → Usa TABLA_STRUCTURE_ANALYSIS.md
3. **Escribir queries** → Usa REFERENCIA_RAPIDA_SQL.md
4. **Debuggear relaciones** → Usa DIAGRAMA_RELACIONES.md
5. **Implementar features** → Consulta feature_keys en REFERENCIA_RAPIDA_SQL.md

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Qué tablas son obligatorias para un tenant nuevo?**
R: tenants, users, bot_profiles, pipelines, pipeline_stages, channel_accounts

**P: ¿Puedo tener múltiples pipelines por tenant?**
R: Sí, N pipelines por tenant. Al menos 1 debe tener `is_default=true`

**P: ¿Cómo se crean contacts?**
R: Automáticamente vía webhook de WhatsApp cuando llega un mensaje nuevo

**P: ¿Qué es tenant_runtime_state?**
R: Configuración de ejecución (IA on/off, cooldown, welcome message, etc)

**P: ¿Puedo tener pipelines universales?**
R: Sí, si `pipelines.tenant_id = NULL`

**P: ¿Qué pasa si elimino un tenant?**
R: CASCADE DELETE elimina TODAS sus relaciones automáticamente

**P: ¿Los workflows son globales o por tenant?**
R: Por tenant, cada tenant tiene sus propios workflows

**P: ¿Cómo habilito calendar para un tenant?**
R: Insertar `tenant_features` con `feature_key='calendar'` e `enabled=true`, luego crear industry_configs

---

## 📞 CONTACTO Y SOPORTE

Para preguntas sobre la documentación:
1. Consulta primero el documento relevante
2. Busca el índice en **INDICE_DOCUMENTACION.md**
3. Revisa ejemplos en **INSERCION_EJEMPLOS.md**
4. Verifica constraints en **TABLA_STRUCTURE_ANALYSIS.md**

---

## ✨ RESUMEN FINAL

Has acceso a **5 documentos complementarios** con información exhaustiva sobre:
- ✅ Estructura de 17+ tablas SQL
- ✅ Inserciones de datos en cada tabla
- ✅ Valores por defecto y constraints
- ✅ Queries comunes y patrones
- ✅ Diagramas y flujos de datos
- ✅ Guías de referencia rápida

**Total**: Más de **300 KB** de documentación estructurada y lista para usar.

---

**Fecha de Análisis**: Febrero 15, 2026  
**Versión**: 1.0  
**Scope**: Análisis completo excluyendo tablas de autolavado

