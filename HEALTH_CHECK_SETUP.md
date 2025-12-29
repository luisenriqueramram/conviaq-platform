# 🏥 Configuración de Auto-Recovery en Easypanel

## 1. Health Check Endpoint

Ya está implementado en: `https://tu-app.easypanel.host/api/health`

Responde:
- **200**: Sistema saludable ✅
- **503**: Sistema caído, debe reiniciarse 🔴

## 2. Configurar en Easypanel

### Opción A: Health Check en Easypanel (Recomendado)

1. Ve a tu app en Easypanel
2. Ve a **Settings** → **Health Check**
3. Configura:
   ```
   Path: /api/health
   Interval: 60s (cada minuto)
   Timeout: 10s
   Unhealthy threshold: 3 (3 fallos consecutivos = reinicio)
   ```

### Opción B: Script de monitoreo externo

Si Easypanel no tiene health checks integrados, usa este script en un cronjob:

```bash
#!/bin/bash
# healthcheck.sh

URL="https://tu-app.easypanel.host/api/health"
MAX_FAILURES=3
FAILURES=0

while true; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
  
  if [ "$HTTP_CODE" -eq 503 ]; then
    FAILURES=$((FAILURES + 1))
    echo "[$(date)] Health check failed ($FAILURES/$MAX_FAILURES): HTTP $HTTP_CODE"
    
    if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
      echo "[$(date)] Restarting application..."
      # Reemplaza con el comando de restart de Easypanel
      easypanel restart your-app
      FAILURES=0
    fi
  else
    FAILURES=0
    echo "[$(date)] Health check passed: HTTP $HTTP_CODE"
  fi
  
  sleep 60
done
```

## 3. Mejoras implementadas

### ✅ Keep-Alive
- Las conexiones se mantienen vivas con ping cada 10 segundos
- `idleTimeoutMillis: 120000` (2 minutos antes de cerrar)
- `min: 1` (siempre hay 1 conexión lista)

### ✅ Retry Agresivo
- **Antes:** 3 intentos (500ms, 1s, 2s) = 3.5s máximo
- **Ahora:** 5 intentos (1s, 2s, 4s, 8s, 10s) = 25s máximo
- Más tiempo para reconectar si la DB estaba dormida

### ✅ No cerrar pool automáticamente
- `allowExitOnIdle: false` → Pool siempre activo
- `keepAlive: true` → Conexiones TCP no se cierran

## 4. Monitoreo

Puedes hacer requests a `/api/health` manualmente:

```bash
curl https://tu-app.easypanel.host/api/health
```

Respuesta esperada:
```json
{
  "timestamp": "2025-12-29T02:45:00.000Z",
  "status": "healthy",
  "database": {
    "crm": "healthy",
    "autolavado": "healthy"
  },
  "uptime": 3600
}
```

## 5. Logs a revisar

Después del deploy, revisa estos logs:

✅ **Bueno:**
```
[Autolavado DB] Query succeeded in 31ms on attempt 1
[Autolavado DB] Client acquired, waiting: 0
```

🚨 **Problema:**
```
[Autolavado DB] Attempt 3 failed: timeout exceeded
[Autolavado DB] Connection issue detected, pool will retry
```

## 6. Troubleshooting

Si sigue fallando después de inactividad:

1. **Verifica el health check funciona:**
   ```bash
   curl -v https://tu-app/api/health
   ```

2. **Aumenta el timeout en Supabase:**
   - Ve a Supabase Dashboard
   - Settings → Database → Connection Pooling
   - Aumenta "Pool timeout" a 60 segundos

3. **Considera Transaction Pooler (6543) en vez de Session Pooler (5432):**
   - Transaction Pooler es más agresivo reciclando conexiones
   - Mejor para aplicaciones con períodos de inactividad

## 7. Plan B: Unificar bases de datos

Si Autolavado sigue fallando, considera temporalmente:

```bash
# En Easypanel, cambia:
AUTOLAVADO_DB_URL=<mismo valor que DATABASE_URL>
```

Esto hace que ambas tablas estén en la misma DB (más estable).
