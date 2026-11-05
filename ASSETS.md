# Inventario de activos de autenticación

Inventario del módulo de Autenticación de OWASP Juice Shop, mantenido para el control
**PoC-AUT-06** (fila 15 de la Matriz de Gobernanza, NIST CSF 2.0 **ID.RA-01**: las
vulnerabilidades de los activos se identifican y documentan).

Responsable: Camila Hidalgo Mora (módulo de Autenticación).

## 1. Endpoints

| Método | Ruta | Archivo | Protección actual | Referencia |
|---|---|---|---|---|
| POST | `/rest/user/login` | `routes/login.ts` | Búsqueda con el ORM, contraseña verificada con scrypt, auditoría en `logs/auth.log` | PoC-AUT-01, PoC-AUT-05, PoC-AUT-06 |
| POST | `/rest/user/logout` | `routes/logout.ts` | Borra la cookie HttpOnly y el token del servidor | PoC-AUT-03 |
| POST | `/rest/2fa/verify` | `routes/2fa.ts` | 5 intentos por 15 min por IP de la conexión, auditoría | PoC-AUT-04, PoC-AUT-05 |
| GET | `/rest/2fa/status` | `routes/2fa.ts` | Requiere sesión | — |
| POST | `/rest/2fa/setup` | `routes/2fa.ts` | Requiere sesión y la contraseña actual | PoC-AUT-06 |
| POST | `/rest/2fa/disable` | `routes/2fa.ts` | Requiere sesión y la contraseña actual | PoC-AUT-06 |
| POST | `/rest/user/reset-password` | `routes/resetPassword.ts` | 10 intentos por 15 min por IP y 5 por cuenta | PoC-AUT-04 |
| GET | `/rest/user/security-question` | `routes/securityQuestion.ts` | Ninguna (revela la pregunta de cualquier correo) | Pendiente, fila 17 |
| GET | `/rest/user/change-password` | `routes/changePassword.ts` | Exige la contraseña actual | CTRL-USR-05 |
| GET | `/rest/user/whoami` | `routes/currentUser.ts` | Lee la cookie de sesión | — |
| GET | `/rest/user/authentication-details` | `routes/authenticatedUsers.ts` | Solo administradores | PoC-USR-01 |
| POST | `/api/Users` (registro) | `server.ts` | Solo acepta los campos del formulario, rol fijo `customer` | PoC-USR-01 |

## 2. Dependencias de autenticación

| Paquete | Versión | Uso | Estado conocido |
|---|---|---|---|
| `jsonwebtoken` | 0.4.0 | Firma de los JWT (`lib/insecurity.ts`) | Versión antigua y vulnerable, fijada a propósito por Juice Shop. Mitigado en el código: solo se aceptan tokens RS256 y se valida la expiración (PoC-AUT-02). |
| `express-jwt` | 0.1.3 | Validación del JWT en las rutas protegidas | Versión antigua, fijada a propósito. Mitigado con la misma validación previa del algoritmo (PoC-AUT-02). |
| `jws` | transitiva | Verificación de la firma en `verify()` | Se revisa en el reporte de `npm audit`. |
| `otplib` | ^13.4.0 | Códigos TOTP del 2FA | Sin problemas conocidos al momento del inventario. |
| `express-rate-limit` | ^7.5.1 | Límites de intentos | Sin problemas conocidos al momento del inventario. |
| `cookie-parser` | ^1.4.7 | Lectura de la cookie de sesión | Sin problemas conocidos al momento del inventario. |
| `node:crypto` | integrado en Node.js | scrypt de contraseñas, HMAC de la bitácora | Se actualiza con la versión de Node.js. |

## 3. Cómo se revisan las vulnerabilidades

1. En cada Pull Request y en cada push a `master`, el job `dependency-audit` del workflow
   CI ejecuta `npm audit --omit=dev --audit-level=high`.
2. El job publica un resumen con los paquetes de severidad alta o crítica en la pestaña
   *Summary* del run y guarda el reporte completo como artefacto `npm-audit-report`.
3. El job no bloquea el merge, porque Juice Shop fija a propósito dependencias vulnerables
   como parte de sus retos. Un paquete de autenticación nuevo en el resumen, que no esté
   en la tabla de la sección 2, se debe registrar aquí y evaluar en la matriz.
4. Este inventario se revisa en cada sprint, y siempre que se agregue o cambie un endpoint
   o una dependencia del módulo.
