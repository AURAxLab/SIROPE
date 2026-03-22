# SIROPE — Instructivo de Demostración

> Guía paso a paso para preparar y ejecutar una demostración de SIROPE a stakeholders.

---

## 🚀 Preparación Rápida (5 minutos)

### Opción A: Local (recomendado para demos presenciales)

```bash
# 1. Clonar y preparar
git clone https://github.com/AURAxLab/SIROPE.git
cd SIROPE
npm install
cp .env.example .env

# 2. Generar cliente Prisma
npx prisma generate

# 3. Crear base de datos limpia
npx prisma db push

# 4. Cargar datos de demo
npx tsx prisma/seed-demo.ts

# 5. Arrancar
npm run dev
# → http://localhost:3000
```

### Opción B: Docker (recomendado para demos remotas)

```bash
git clone https://github.com/AURAxLab/SIROPE.git
cd SIROPE
docker compose up -d
# → http://localhost:3000 (seed básico automático)
```

> Para usar el seed de demo completo con Docker, primero haga `docker compose exec sirope npx tsx prisma/seed-demo.ts`.

---

## 🔑 Cuentas de Demo

| Email | Nombre | Rol | Contraseña |
|---|---|---|---|
| `admin@universidad.cr` | Ana Alfaro | Administradora | `Demo2026!` |
| `mario.brenes@universidad.cr` | Mario Brenes | Profesor | `Demo2026!` |
| `laura.mora@universidad.cr` | Laura Mora | Profesora | `Demo2026!` |
| `diana.rios@universidad.cr` | Dra. Diana Ríos | Inv. Principal | `Demo2026!` |
| `jorge.vargas@universidad.cr` | Dr. Jorge Vargas | Inv. Principal | `Demo2026!` |
| `carlos.zun@universidad.cr` | Carlos Zúñiga | Inv. Ejecutor | `Demo2026!` |
| `sofia.cast@universidad.cr` | Sofía Castillo | Estudiante (B90001) | `Demo2026!` |
| `andres.herr@universidad.cr` | Andrés Herrera | Estudiante (B90002) | `Demo2026!` |

> Hay 8 estudiantes en total (B90001–B90008).

---

## 🎬 Guión de Demostración (20 min)

### Acto 1: Dashboard Administrativo (5 min)
> Login: `admin@universidad.cr`

1. **Dashboard** — Mostrar métricas: usuarios, estudios, participaciones, créditos
2. **Aprobaciones** — Hay 1 estudio "Trabajo Remoto" pendiente → **Aprobar en vivo**
3. **Usuarios** — Mostrar tabla con filtros, búsqueda, edición inline
4. **Semestres** — I-2026 activo, II-2025 pasado
5. **Auditoría** — Filtrar por acción "APPROVE_STUDY"
6. **Analytics** — Mostrar gráficos y progress bars
7. **Configuración** — Mostrar selector CREDENTIALS/LDAP

### Acto 2: Flujo del Investigador (5 min)
> Login: `diana.rios@universidad.cr` (IP)

1. **Estudios** — Ver "Usabilidad Móvil" (activo) con participaciones
2. **Timeslots** — Mostrar horarios pasados (con completados) y futuros
3. **Estudio en borrador** — "IA Code Review" está como borrador
4. **Colaboradores** — Carlos Zúñiga está asignado
5. **Inscripciones** — Ver participantes inscritos y completados

### Acto 3: Flujo del Estudiante (5 min)
> Login: `sofia.cast@universidad.cr`

1. **Estudios disponibles** — Explorar "Gamificación" (tiene timeslots futuros)
2. **Inscribirse** — Seleccionar un timeslot → Inscribirse
3. **Mis inscripciones** — Ver inscripciones activas
4. **Créditos** — Sofía tiene participaciones completadas → Asignar créditos a un curso
5. **Historial** — Ver participaciones pasadas

### Acto 4: Flujo del Profesor (3 min)
> Login: `mario.brenes@universidad.cr`

1. **Mis Cursos** — CI-1101, CI-1200, CI-2414 con créditos habilitados
2. **Créditos** — Ver créditos asignados por estudiantes
3. **Exportar CSV** — Descargar reporte de créditos

### Cierre (2 min)
- Mostrar **notificaciones** (🔔) en cualquier rol
- Mostrar **responsive design** (redimensionar ventana)
- Mostrar **modo oscuro** si aplica

---

## 📊 Datos Pre-cargados

| Categoría | Cantidad | Detalle |
|---|---|---|
| Usuarios | 15 | 1 admin, 2 profs, 2 PIs, 2 IEs, 8 estudiantes |
| Cursos | 6 | CI-1101, CI-1200, CI-1310, CI-1330, CI-2414, CI-2600 |
| Estudios | 5 | 2 activos, 1 pendiente, 1 borrador, 1 cerrado |
| Timeslots | ~10 | 4 pasados + 6 futuros |
| Participaciones | ~15 | Completadas, no-show, inscritas |
| Créditos asignados | ~6 | De estudios completados a cursos |
| Auditoría | 7 | Aprobaciones, creaciones, marcado |

---

## ⚠️ Para resetear la demo

```bash
# Borrar BD y recrear desde cero
rm -f prisma/dev.db
npx prisma db push
npx tsx prisma/seed-demo.ts
```

---

## 💡 Tips para la presentación

- **Use dos pestañas** del navegador: una para admin/investigador y otra para estudiante
- **Haga acciones en vivo**: aprobar un estudio, inscribir un estudiante, asignar créditos
- **Muestre las notificaciones** después de realizar acciones
- **Redimensione la ventana** para mostrar responsive design
- Si preguntan sobre seguridad, mencione: RBAC (29 acciones), bcrypt, auditoría, Zod, Prisma
- Si preguntan sobre escalabilidad: "SQLite para instituciones medianas (<500 usuarios), PostgreSQL para más"
