# 🔧 Fix definitivo para Autolavado DB

## Problema identificado

Las conexiones de autolavado se cierran después de inactividad:
```
[Autolavado DB] Client removed, idle: 0
```

Y cuando intentas usarlo, intenta reconectar pero timeout:
```
[Autolavado DB] Attempt 1 failed after 3002ms: timeout exceeded when trying to connect
```

## Solución 1: Cambiar a Transaction Pooler (RECOMENDADO)

Transaction Pooler es más agresivo reciclando conexiones y mejor para apps con períodos de inactividad.

### En Easypanel, cambia la URL de autolavado:

**Antes (Session Pooler - puerto 5432):**
```
postgresql://postgres.txzittnptlbcrareojnr:eliasycamila2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**Después (Transaction Pooler - puerto 6543):**
```
postgresql://postgres.txzittnptlbcrareojnr:eliasycamila2025@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**Pasos:**
1. Ve a Easypanel → Tu app → Settings → Environment Variables
2. Busca `AUTOLAVADO_DB_URL`
3. Cambia el puerto de `:5432` a `:6543`
4. Redeploy

## Solución 2: Warmup automático (YA IMPLEMENTADO)

Agregué un sistema que hace `SELECT 1` cada 30 segundos para mantener las conexiones vivas.

Se activa automáticamente en producción.

## Solución 3: Unificar bases de datos (Plan B)

Si aún falla, temporalmente usa la misma DB para ambas:

```bash
# En Easypanel, cambia:
AUTOLAVADO_DB_URL=postgresql://postgres.udjytmhaqsdbqfgkckcs:Elias990928!@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

Esto hace que autolavado y CRM usen la misma base de datos (100% estable).

## Health Check - Por qué no funciona

El endpoint `/api/health` debería funcionar. Si sale 404, revisa:

1. **¿Deployó correctamente?**
   - Ve a los logs de Easypanel
   - Busca "Creating an optimized production build"
   - Debe terminar con "✓ Compiled successfully"

2. **¿Está en la ruta correcta?**
   - Debe existir: `src/app/api/health/route.ts`

3. **Prueba directamente:**
   ```bash
   # PowerShell
   Invoke-WebRequest -Uri "https://conviaq-platform.1iiksf.easypanel.host/api/health"
   
   # O en navegador:
   https://conviaq-platform.1iiksf.easypanel.host/api/health
   ```

## Verificación después del cambio

Después de cambiar a Transaction Pooler (6543), deberías ver en logs:

✅ **Bueno:**
```
[DB Warmup] Ping successful
[Autolavado DB] Query succeeded in 30ms on attempt 1
[Autolavado DB] Client acquired, waiting: 0
```

🚨 **Si sigue fallando:**
```
[Autolavado DB] Attempt 3 failed: timeout exceeded
```

→ Entonces usa **Solución 3** (unificar bases de datos)

## Resumen de cambios en este commit

1. ✅ Warmup automático cada 30s (mantiene conexiones vivas)
2. ✅ Health check con `runtime: 'nodejs'` explícito
3. ✅ Documentación de cómo cambiar a Transaction Pooler

**Próximo paso:** Cambia el puerto de autolavado a 6543 en Easypanel y redeploy.
