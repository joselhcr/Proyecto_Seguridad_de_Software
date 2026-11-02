# Evidencia de regresión — PoC-LOG-04

**Hallazgo:** falsificación de la IP de origen registrada mediante `X-Forwarded-For`.

**Alcance de este cambio:** prueba de regresión para la política integrada en PR #13; no modifica la configuración de producción.

**Base verificada:** `master` después de PR #13, commit `89a65abfb`.
**Commit de prueba:** `ae95e0b28`.

## Política verificada

PR #13 configura Express con `app.set('trust proxy', process.env.TRUSTED_PROXY ?? false)`. Cuando `TRUSTED_PROXY` no está configurado, Express no usa cabeceras reenviadas para decidir la IP del cliente. Los despliegues con proxy deben establecer el valor según sus proxies confiables.

## Prueba automatizada

La prueba `test/api/log-ip-audit.test.ts` elimina `TRUSTED_PROXY` durante la configuración de la aplicación de prueba, envía una solicitud de solo lectura a `/rest/admin/application-version` con `X-Forwarded-For: 203.0.113.41` y busca el marcador en el access log.

Comando:

```powershell
node --import ./test/api/helpers/test-env.mjs --import tsx --test --test-force-exit test/api/log-ip-audit.test.ts
```

Resultado observado:

```text
tests 1
pass 1
fail 0
```

La línea observada en `logs/access.log.2026-11-01` registró `::ffff:127.0.0.1` como origen y no incluyó `203.0.113.41`:

```text
::ffff:127.0.0.1 - - [02/Nov/2026:00:32:01 +0000] "GET /rest/admin/application-version HTTP/1.1" 200 20 "-" "PoC-LOG-04-XFF-<id de prueba>"
```

## Verificaciones adicionales

- `npm run build:server`: aprobado.
- ESLint sobre `test/api/log-ip-audit.test.ts`: aprobado.
- `npm run lint`: aprobado.

La prueba cubre una conexión directa con la configuración predeterminada sin proxy confiable. No valida una topología de producción detrás de proxy; ese despliegue debe configurar y comprobar `TRUSTED_PROXY` para aceptar cabeceras solo desde intermediarios legítimos.
