# SIROPE — Propuesta Ejecutiva

## Sistema de Registro Optativo de Participantes de Estudios

---

### El Problema

Las universidades que realizan investigación con participantes humanos enfrentan una barrera crónica: **el reclutamiento de participantes**. Los investigadores invierten semanas publicando convocatorias en redes sociales, afiches y correos masivos, con tasas de respuesta inferiores al 15%. Esto retrasa cronogramas, encarece presupuestos y compromete la validez estadística de los estudios.

Paralelamente, muchos estudiantes desconocen que pueden contribuir a la investigación de su propia universidad y beneficiarse de ello.

### La Solución: SIROPE

SIROPE es una **plataforma web que conecta investigadores con participantes estudiantiles** mediante un sistema estandarizado de créditos extra. El modelo está inspirado en el [SONA Systems](https://www.sona-systems.com/) utilizado por más de **1,500 universidades** en el mundo (Harvard, Stanford, MIT, Oxford), adaptado a la realidad costarricense.

**Flujo simplificado:**

```
Investigador crea estudio → Comité Ético aprueba → Admin publica →
Estudiante se inscribe → Participa → Recibe créditos extra
```

### ¿Por qué no usar SONA Systems?

| Aspecto | SONA Systems | SIROPE |
|---|---|---|
| **Costo** | $2,000–5,000 USD/año | $0 (código abierto) |
| **Datos** | Servidores en EE.UU. | Servidores propios de la universidad |
| **Idioma** | Inglés | Español nativo |
| **Ley 8968 (CR)** | No cumple sin DPA | Cumplimiento total |
| **Integración LDAP** | No | Sí — se conecta al directorio universitario |
| **Créditos** | Pool genérico | Asignación a cursos específicos |
| **Personalización** | Limitada | Total (código abierto, MIT License) |

### Salvaguardas Éticas Integradas

- **Participación 100% voluntaria** — disclaimer explícito antes de cada inscripción
- **Aprobación de Comité Ético** — campo obligatorio al registrar un estudio; si no tiene aprobación CEC, el investigador debe justificarlo y esto es visible al participante
- **Preselección** — preguntas de elegibilidad antes de inscribirse
- **Auditoría inmutable** — cada acción del sistema queda registrada (quién, qué, cuándo)
- **Cancelación libre** — el estudiante puede cancelar su participación sin penalización (hasta 24h antes)
- **Control del profesor** — cada profesor decide si participa y el máximo de créditos extra para su curso

### Métricas del Sistema

SIROPE genera automáticamente indicadores de gestión:

- Estudios completados por semestre
- Tasa de no-show y su reducción con recordatorios automáticos
- Tiempo promedio de reclutamiento (publicación → cupo lleno)
- Distribución de participantes por estudio y por escuela
- Créditos asignados vs. máximo permitido

### Cumplimiento Regulatorio

| Marco | Cumplimiento |
|---|---|
| **Ley 8968** (Protección de Datos) | ✅ Datos en servidores nacionales, consentimiento explícito |
| **Declaración de Helsinki** | ✅ Participación voluntaria con consentimiento informado |
| **CONIS / CEC** | ✅ Campo de aprobación integrado en el flujo |
| **RGPD** (si aplica) | ✅ Derecho a eliminación, exportación de datos |

### Arquitectura Técnica (resumen)

- **Stack**: Next.js 15, TypeScript, SQLite/PostgreSQL, Prisma ORM
- **Seguridad**: bcrypt, RBAC (5 roles, 29 permisos), rate limiting, CSRF nativo
- **Despliegue**: Docker (multi-stage, Alpine Linux) o bare metal
- **Autenticación**: Credenciales locales o LDAP/Active Directory
- **Tests**: 452+ pruebas automatizadas

### Costo de Implementación

| Rubro | Costo |
|---|---|
| Licencia de software | $0 |
| Servidor (VM básica) | ~$10/mes o servidor existente |
| Configuración inicial | 1–2 horas (un técnico) |
| Capacitación | Documentación incluida + guía de demo |

### Próximos Pasos

1. **Piloto**: Implementación en una escuela/facultad durante un semestre
2. **Evaluación**: Medir impacto en tasa de reclutamiento y satisfacción
3. **Escalamiento**: Despliegue institucional con PostgreSQL y LDAP

---

**Desarrollado por:** Alexander Barquero Elizondo, Ph.D.
**Repositorio:** [github.com/AURAxLab/SIROPE](https://github.com/AURAxLab/SIROPE) (privado)
**Licencia:** MIT
