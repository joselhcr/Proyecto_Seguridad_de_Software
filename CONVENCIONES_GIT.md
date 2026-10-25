# Convenciones de Git del equipo

Guía para ramas, commits y Pull Requests de la **Fase 3 – Remediación**.
El objetivo es que cada cambio en el repositorio quede ligado a un PoC y a su responsable,
tal como lo pide el *Reporte Técnico de Parches*.

---

## 1. Identificadores de PoC

Formato: `PoC-<MÓDULO>-<NN>`

| Módulo | Código | PoCs |
|---|---|---|
| Autenticación | `AUT` | `PoC-AUT-01` … `PoC-AUT-05` |
| Gestión de Usuarios | `USR` | `PoC-USR-01` … `PoC-USR-06` |
| Operaciones / Transacciones | `OPE` | `PoC-OPE-01` … `PoC-OPE-04` |
| Logs / Auditoría | `LOG` | `PoC-LOG-01` … `PoC-LOG-06` |

---

## 2. Ramas

Una rama por PoC, creada siempre desde `master` actualizado:

```
fix/PoC-<MÓDULO>-<NN>-<descripcion-corta>
```

Ejemplos:

```
fix/PoC-USR-03-login-parametrizado
fix/PoC-LOG-02-sanitizar-log
docs/fase-3-reporte
```

```bash
git checkout master
git pull
git checkout -b fix/PoC-USR-03-login-parametrizado
```

La rama **no se borra** después del merge: se conserva como evidencia de trazabilidad para la revisión del proyecto.

---

## 3. Tipos de cambio

| Tipo | Cuándo usarlo | ¿PoC obligatorio? |
|---|---|---|
| `fix` | Se corrigió una vulnerabilidad en el código. **El más común.** | Sí |
| `refactor` | Se reorganizó código sin cambiar su comportamiento | Sí |
| `test` | Solo se agregaron o cambiaron pruebas | Sí |
| `docs` | Solo documentación (informes, evidencias, README) | No |
| `ci` | Cambios en los workflows de GitHub Actions | No |
| `chore` | Mantenimiento (configuración, dependencias, `.gitignore`) | No |

Si un mismo cambio arregla código y agrega documentación, se usa el tipo del cambio más importante (`fix`).

---

## 4. Título del Pull Request

```
<tipo>(PoC-<MÓDULO>-<NN>): <descripción>
```

- Descripción en **imperativo** y en minúscula: *parametrizar*, *validar*, *sanitizar* (no *parametricé* ni *se parametrizó*).
- Mínimo 10 caracteres, sin punto final.
- Un check automático (`pr-title`) rechaza el PR si el título no cumple el formato.

| Título | ¿Válido? |
|---|---|
| `fix(PoC-USR-03): parametrizar consulta del login` | ✅ |
| `fix(PoC-LOG-02): sanitizar saltos de línea antes de escribir en el log` | ✅ |
| `refactor(PoC-OPE-01): mover validación del carrito a un middleware` | ✅ |
| `docs: agregar matriz de riesgos actualizada` | ✅ |
| `fix: arreglar login` | ❌ falta el PoC |
| `fix(PoC-03): arreglar login` | ❌ falta el módulo |
| `Arreglé el login` | ❌ sin tipo ni PoC |

---

## 5. Commits

Mismo formato que el título del PR, en una sola línea:

```
<tipo>(PoC-<MÓDULO>-<NN>): <descripción>
```

Ejemplo:

```
fix(PoC-USR-03): parametrizar consulta del login
```

```bash
git add routes/login.ts
git commit -m "fix(PoC-USR-03): parametrizar consulta del login"
git push -u proyecto fix/PoC-USR-03-login-parametrizado
```

> Cada integrante hace commit **con su propia cuenta**. Verificar que `git config user.email`
> coincida con el correo de GitHub; si no, el commit no aparece a su nombre.

---

## 6. Cuerpo del Pull Request

GitHub carga esta plantilla automáticamente al abrir un PR (`.github/PULL_REQUEST_TEMPLATE.md`).
Sus secciones siguen el mismo orden que el *Reporte Técnico de Parches*.

```markdown
### 1. Ficha y trazabilidad
- **Responsable:** @usuario
- **Módulo:** Autenticación / Gestión de Usuarios / Operaciones / Logs
- **PoC:** PoC-XXX-NN

### 2. Mapeo de la vulnerabilidad
- **OWASP Top 10:** A03:2021 - Injection
- **NIST CSF 2.0:** PR.AA-01
- **Archivos / líneas afectadas:** routes/login.ts:34
- **Causa raíz:** por qué el código permitía el ataque

### 3. Cambio aplicado
Qué se corrigió y por qué ataca la causa raíz y no solo el síntoma.
```

> La verificación de no-reincidencia, las evidencias y el riesgo residual se documentan
> en el *Reporte Técnico de Parches*, no en el PR.

### Ejemplo lleno

```markdown
### 1. Ficha y trazabilidad
- **Responsable:** @joselhcr
- **Módulo:** Gestión de Usuarios
- **PoC:** PoC-USR-03

### 2. Mapeo de la vulnerabilidad
- **OWASP Top 10:** A03:2021 - Injection
- **NIST CSF 2.0:** PR.AA-01
- **Archivos / líneas afectadas:** routes/login.ts:34
- **Causa raíz:** el correo del formulario se concatenaba directamente en la consulta SQL.

### 3. Cambio aplicado
Se reemplazó la consulta concatenada por una consulta con parámetros (`replacements`
de Sequelize), de modo que la entrada del usuario nunca se interpreta como SQL.
```

---

## 7. Revisión y merge

1. Al abrir el PR corren los checks automáticos: `pr-title` y `lint`. Si alguno sale ❌, se corrige y se vuelve a hacer push a la misma rama.
2. **Se requiere 1 aprobación**, idealmente de alguien de otro módulo. El revisor repite la PoC y una variante para confirmar que el arreglo ataca la causa raíz.
3. El merge se hace con **Squash and merge**: el título del PR queda como un único commit en `master`, cuyo ID se cita en el reporte.
4. **No borrar la rama** después del merge (GitHub ofrece un botón *Delete branch*; no usarlo).

---

## 8. Archivos compartidos

Algunos arreglos tocan archivos que usan todos los módulos (`server.ts`, `lib/insecurity.ts`).
Antes de modificarlos, avisar al equipo para no generar conflictos. Los cambios globales
(CSP, cookies `HttpOnly`/`SameSite`, headers de seguridad) los hace **una sola persona**
en su propio PR.
