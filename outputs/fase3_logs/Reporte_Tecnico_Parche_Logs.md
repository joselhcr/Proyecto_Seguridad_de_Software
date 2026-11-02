# Fase 3 — Remediación de Logs y Auditoría

**Responsable:** Andrés Gustavo Arias Ruiz

**Alcance de este parche:** PoC-LOG-01, PoC-LOG-05 y PoC-LOG-06

**Base revisada:** `origin/master` después de integrar PR #13 (`89a65abfb8ecb253728efc5212ea72272ed9e194`)

**Rama local:** `fix/logs-access-audit-hardening`

**Estado:** PR #15 en preparación sobre la base actualizada; se conserva como borrador hasta terminar las verificaciones y revisión.

## Resumen de los cambios

| PoC | Cambio | Archivos principales | Resultado esperado |
| --- | --- | --- | --- |
| LOG-01 — Acceso a bitácoras | Se exige sesión válida y rol administrador antes de servir el listado o los archivos. El controlador limita los nombres a `access.log.YYYY-MM-DD` y sirve el archivo desde la raíz `logs/`. | `server.ts`, `routes/logfileServer.ts` | Anónimo: 401; cliente autenticado sin rol admin: 403; administrador: acceso permitido. Nombres no permitidos no revelan rutas del servidor. |
| LOG-05 — Solicitudes no registradas | Morgan se instala después del middleware de normalización de barras y antes de rutas que pueden finalizar la respuesta. Se asigna un `X-Request-Id` UUID a cada solicitud y Morgan lo incluye en la línea de acceso. | `server.ts` | También quedan registradas solicitudes a `/support/logs/`, incluidas solicitudes rechazadas y solicitudes enviadas con barras duplicadas. Morgan conserva la URL originalmente recibida para facilitar trazabilidad. |
| LOG-06 — Divulgación de errores | Los errores del endpoint de logs pasan por un manejador que devuelve un mensaje genérico, conserva estados HTTP válidos y adjunta el identificador de correlación. El evento interno registra tipo de error, estado e ID; no guarda el mensaje interno. | `server.ts`, `lib/productionErrorHandler.ts` | Una descarga inexistente conserva 404 sin stack trace, rutas internas ni mensaje técnico en la respuesta. |

El middleware de errores genérico de desarrollo se conserva para las demás rutas de Juice Shop. El manejador seguro se monta específicamente para `/support/logs`; en producción también se usa como manejador global.

## Pruebas y verificaciones ejecutadas

| Verificación | Resultado |
| --- | --- |
| Pruebas dirigidas de logs, descarga y autorización (`logs.test.ts`, `logfile-server.test.ts`, `file-serving.test.ts`) | 30 pasaron; 0 fallaron. |
| Pruebas unitarias de `productionErrorHandler` | 2 pasaron; 0 fallaron. |
| `npm run build:server` | Aprobado. |
| ESLint para archivos modificados | Aprobado. |
| `npm run lint` | Aprobado. |
| `npm run test:api` completo (base actualizada) | 540 pruebas: 503 pasaron, 30 fallaron y 7 se omitieron. Los fallos aparecen en 2FA, expectativas de exploits de login, `saveLoginIp`, reset de contraseña, perfil, usuarios y otros casos de retos. Las pruebas dirigidas de Logs pasan; los fallos de la suite completa requieren triage por los módulos correspondientes. |
| `npm run test:server` completo (base actualizada) | 418 pruebas: 408 pasaron, 5 fallaron y 5 se omitieron. Los cinco fallos son: una prueba Angular, una de `saveLoginIp` y tres de formato de fecha. Las dos pruebas unitarias añadidas pasan. |
| `npm run rsn` | Reporta 28 codefix desincronizados, incluidos `accessLogDisclosureChallenge` y `resetPasswordMortyChallenge`. Las líneas de autorización de logs usan `hide-line`. No se ejecutó `rsn:update` global. |

### Cobertura de regresión

Las pruebas de API verifican denegación de listado/descarga a anónimos y clientes, permiso al administrador, rechazo de traversal, respuesta genérica ante archivo inexistente y escritura de dos solicitudes equivalentes en el access log con sus respectivos `X-Request-Id`. En la ejecución local, ambas solicitudes quedaron en `logs/access.log.2026-11-01` con sus marcadores y correlación; la solicitud con barras duplicadas conserva `//support//logs//` como URL de entrada.

## Archivos del parche

- `server.ts`
- `routes/logfileServer.ts`
- `lib/productionErrorHandler.ts` (nuevo)
- `test/api/logs.test.ts` (nuevo)
- `test/api/logfile-server.test.ts`
- `test/api/file-serving.test.ts`
- `test/server/productionErrorHandler.unit.test.ts` (nuevo)

## Dependencias y límites pendientes

- LOG-04 fue remediado por PR #13, integrado en `master` el 2 de noviembre de 2026. La aplicación confía en cabeceras reenviadas solo cuando se configura `TRUSTED_PROXY`; la verificación de conexión directa se documenta en el PR #14 de seguimiento.
- LOG-02 y LOG-03 dependen de coordinación con Autenticación y Gestión de Usuarios, respectivamente.
- Este parche no afirma remediar la falsificación CRLF de Morgan ni el enmascaramiento global de secretos en todos los loggers. Esos requisitos deben verificarse por separado antes de declarar todo el módulo de Logs/Auditoría al 100 %.
- No se incluye evidencia de navegador ni capturas; deben añadirse después de ejecutar las comprobaciones en la instancia integrada.

## Estado de PRs relacionados (consulta: 2026-11-02)

- [PR #13](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/13) está integrado en `master` mediante `89a65abfb8ecb253728efc5212ea72272ed9e194`.
- [PR #14](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/14) quedó como prueba de regresión de LOG-04 sobre `master`; ya no modifica `trust proxy`. Su head actual es `3e39d9c2cc94c87f6cd72f86894651e7aa77a038`; lint y título pasan, y requiere revisión.
- [PR #15](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/15) cubre LOG-01/05/06. Esta rama se rebasó localmente sobre el `master` nuevo; después de publicar los commits actualizados se ejecutarán sus checks.

## Trazabilidad Git

**Commit de implementación:** `60e404dabc46e284014c6482c9e2e21e1cd59aa0` (firmado con DCO).

**Pull Request de LOG-01/05/06:** [PR #15](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/15), borrador contra `master`; la rama se rebasó localmente sobre `89a65abfb` y espera publicación/verificación de checks.
**Diff final:** disponible con `git show --stat --oneline HEAD` y `git show --format=fuller HEAD`.
