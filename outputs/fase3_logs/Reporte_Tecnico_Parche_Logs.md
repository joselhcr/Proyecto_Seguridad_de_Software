# Fase 3 — Remediación de Logs y Auditoría

**Responsable:** Andrés Gustavo Arias Ruiz

**Alcance de este parche:** PoC-LOG-01, PoC-LOG-05 y PoC-LOG-06

**Base revisada:** `origin/master` (`dac885385`)

**Rama local:** `fix/logs-access-audit-hardening`
**Estado:** cambios locales en revisión; no se afirma que exista un commit o PR para esta rama.

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
| `npm run test:api` completo | Rama de trabajo: 499 pruebas, 465 pasaron, 27 fallaron y 7 se omitieron. La copia limpia de `origin/master`: 537 pruebas, 497 pasaron, 33 fallaron y 7 se omitieron. Hay fallos coincidentes en Autenticación, perfil, 2FA, `saveLoginIp` y otros módulos; los totales diferentes impiden atribuir cada diferencia directamente a este parche. Las pruebas dirigidas de logs pasan. |
| `npm run test:server` completo | Rama de trabajo: 418 pruebas, 408 pasaron, 5 fallaron y 5 se omitieron. Copia limpia de `origin/master`: 416 pruebas, 406 pasaron, 5 fallaron y 5 se omitieron. Son los mismos cinco fallos: una prueba Angular, una de `saveLoginIp` y tres de formato de fecha. Las dos pruebas unitarias añadidas pasan. |
| `npm run rsn` | Rama de trabajo y copia limpia de `origin/master` reportan los mismos 28 codefix desincronizados, incluidos los cuatro de `accessLogDisclosureChallenge`. Las líneas de autorización añadidas llevan `hide-line` y no cambian el código expuesto por el reto. No se ejecutó `rsn:update` global. |

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

- LOG-04 (confianza en `X-Forwarded-For`) se mantiene pendiente de la decisión/merge del PR #13 de Camila. Este parche no reemplaza esa política compartida.
- LOG-02 y LOG-03 dependen de coordinación con Autenticación y Gestión de Usuarios, respectivamente.
- Este parche no afirma remediar la falsificación CRLF de Morgan ni el enmascaramiento global de secretos en todos los loggers. Esos requisitos deben verificarse por separado antes de declarar todo el módulo de Logs/Auditoría al 100 %.
- No se incluye evidencia de navegador ni capturas; deben añadirse después de ejecutar las comprobaciones en la instancia integrada.

## Estado de PRs relacionados (consulta: 2026-11-01)

- [PR #13](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/13), de Camila, está abierto contra `master` en `b6e243469fe9c07720ed47eb083efb298198f574`. GitHub lo marca `BLOCKED` y `REVIEW_REQUIRED`; lint y formato de título pasan. Cambia `server.ts` en la configuración de proxy y añade eventos de auditoría para autenticación.
- [PR #14](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/14), de Logs, está abierto contra `modulo-logs` (base `1618a611b173b4bf114028e6e02549950606e29d`) en `5e368811fa3e01153dde1db510cdc4832a1481f2`. El CI reporta fallos de RSN y de varias pruebas/matrices. Su diff contra esa base cambia la política de `trust proxy` a `false`, la misma línea que PR #13 cambia por una política configurable.
- Esta rama parte de `master` (`dac885385b0632d5ca3387770a2fa84ee8a09198`) y no modifica la sección de confianza proxy. Aunque comparte `server.ts`, su funcionalidad LOG-01/05/06 no depende del cambio de PR #13. Para evitar duplicar LOG-04, dejar la resolución de ese hallazgo en PR #13 mientras el equipo decide el destino de PR #14.

## Trazabilidad Git

**Commit de implementación:** `4d3268949122e91d21e9b1ead87bbcee5f5ca947` (firmado con DCO).

**Pull Request de LOG-01/05/06:** [PR #15](https://github.com/joselhcr/Proyecto_Seguridad_de_Software/pull/15), abierto como borrador contra `master`. Consultar allí el estado vigente de CI y las revisiones antes de solicitar merge.
**Diff final:** disponible con `git show --stat --oneline HEAD` y `git show --format=fuller HEAD`.
