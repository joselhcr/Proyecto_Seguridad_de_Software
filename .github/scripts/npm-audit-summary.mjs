// Resume el reporte JSON de `npm audit` en el resumen del job de GitHub Actions.
// Uso: node .github/scripts/npm-audit-summary.mjs npm-audit.json
import fs from 'node:fs'

const file = process.argv[2]
let report
try {
  report = JSON.parse(fs.readFileSync(file, 'utf8'))
} catch (error) {
  console.error(`No se pudo leer el reporte de npm audit (${file}): ${error.message}`)
  process.exit(1)
}

if (report.error) {
  /* An audit that could not run must not look like a clean result */
  console.error(`npm audit no pudo ejecutarse: ${report.error.summary ?? report.error.code ?? 'error desconocido'}`)
  process.exit(1)
}

const severities = ['critical', 'high', 'moderate', 'low', 'info']
const counts = report.metadata?.vulnerabilities ?? {}
const vulnerable = Object.values(report.vulnerabilities ?? {})
  .filter((v) => v.severity === 'critical' || v.severity === 'high')
  .sort((a, b) => severities.indexOf(a.severity) - severities.indexOf(b.severity) || a.name.localeCompare(b.name))

const lines = [
  '## Auditoría de dependencias (npm audit, solo producción)',
  '',
  '| Severidad | Paquetes |',
  '|---|---|',
  ...severities.map((s) => `| ${s} | ${counts[s] ?? 0} |`),
  '',
  vulnerable.length > 0 ? '### Paquetes con severidad alta o crítica' : 'Sin paquetes con severidad alta o crítica.',
  ''
]
if (vulnerable.length > 0) {
  lines.push('| Paquete | Severidad | Rango afectado | Directa | Corrección |', '|---|---|---|---|---|')
  for (const v of vulnerable) {
    const fix = v.fixAvailable === true ? 'sí' : v.fixAvailable ? `actualizar a ${v.fixAvailable.name}@${v.fixAvailable.version}` : 'no'
    lines.push(`| ${v.name} | ${v.severity} | \`${v.range}\` | ${v.isDirect ? 'sí' : 'no'} | ${fix} |`)
  }
  lines.push('', 'Las dependencias vulnerables a propósito de OWASP Juice Shop están documentadas en ASSETS.md.')
}

const summary = lines.join('\n') + '\n'
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
}
console.log(summary)
