# SIROPE

> **Sistema de Registro Optativo de Participantes de Estudios**

[![Tests](https://img.shields.io/badge/tests-398%20passed-brightgreen)](#tests)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#licencia)

SIROPE es una plataforma institucional para gestionar la participación de estudiantes en estudios de investigación y la asignación de créditos extra de forma automatizada, segura y auditable.

---

## ✨ Características

- **Gestión de estudios** — Creación, aprobación y ciclo de vida completo (DRAFT → ACTIVE → CLOSED)
- **Inscripción inteligente** — Preselección con cuestionarios, validación de capacidad, lista de espera
- **Créditos automáticos** — Asignación con 7 capas de validación (sistema, curso, estudio)
- **Dashboard Analytics** — Métricas de usuarios, participaciones, estudios, créditos con progress bars
- **Búsqueda y filtros** — Tablas con busqueda debounced, filtros por rol/estado, paginación server-side
- **Notificaciones** — Confirmaciones, recordatorios 24h, bell icon con alertas contextuales por rol
- **RBAC completo** — 5 roles, 29 acciones, verificación en cada operación
- **Auditoría** — Registro de todas las mutaciones con estado previo/nuevo e IP
- **Exportación CSV** — Reportes de participaciones y créditos con toast de confirmación
- **Multi-institución** — Configuración institucional flexible (nombre, colores, auth mode)
- **UI Premium** — Dark mode, glassmorphism, micro-animaciones, skeleton loading, responsive

---

## 📋 Requisitos del Sistema

### Hardware mínimo

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 1 core | 2+ cores |
| RAM | 512 MB | 1 GB+ |
| Disco | 200 MB (app + deps) | 500 MB+ (incluye DB) |

> **Nota:** SIROPE usa SQLite como base de datos por defecto. No requiere servidor de base de datos externo, lo cual simplifica el hardware. Para cargas altas (>500 usuarios concurrentes), considere migrar a PostgreSQL.

### Software requerido

| Componente | Versión mínima | Cómo verificar |
|---|---|---|
| **Node.js** | `20.0.0` (LTS) | `node --version` |
| **npm** | `10.0.0` | `npm --version` |
| **Git** | `2.30+` | `git --version` |

> SQLite se instala automáticamente vía `better-sqlite3` al ejecutar `npm install`.

### Sistemas operativos soportados

- ✅ Ubuntu 22.04+ / Debian 12+
- ✅ macOS 13+ (Ventura)
- ✅ Windows 10/11 (con PowerShell o WSL2)
- ✅ Docker (Node 20 Alpine)

---

## 🏗️ Stack Tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.2 |
| Lenguaje | TypeScript | 5.x |
| Base de datos | SQLite + Prisma ORM | Prisma 7.5 |
| Autenticación | NextAuth.js | v5 beta |
| Validación | Zod | v4 |
| Tests | Vitest | v4 |
| Hashing | bcryptjs | v3 |
| Estilos | CSS Modules + Custom Properties | — |

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/your-org/sirope.git
cd sirope
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edite `.env` y configure al menos:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Ruta a la base de datos | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Secret JWT (mín 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de la aplicación | `http://localhost:3000` |

> ⚠️ **Nunca comitee el archivo `.env`.** Use `.env.example` como referencia.

### 4. Inicializar la base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Crear tablas
npx prisma db push

# Cargar datos iniciales (admin, semestre, cursos, usuarios de prueba)
npm run seed
```

### 5. Arrancar en desarrollo

```bash
npm run dev
# → http://localhost:3000
```

### 6. Login inicial

| Campo | Valor |
|---|---|
| Email | `admin@universidad.cr` |
| Contraseña | `Admin123!` |

> ⚠️ **Cambie esta contraseña inmediatamente en producción.**

---

## 🖥️ Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo (hot reload)
npm run build        # Build de producción
npm start            # Servidor de producción
npm run lint         # Linting con ESLint
npm run test         # Tests con Vitest (watch mode)
npm run test:run     # Tests una sola vez
npm run seed         # Seed de datos iniciales
npm run db:push      # Aplicar schema a la DB
npm run db:studio    # Prisma Studio (GUI de la DB)
npm run db:generate  # Regenerar cliente Prisma
```

---

## 📋 Roles del Sistema

| Rol | Descripción |
|---|---|
| **Administrador** | Configura el sistema, aprueba estudios, gestiona usuarios y semestres |
| **Profesor** | Crea cursos, habilita opt-in de créditos, ve estudiantes inscritos |
| **Inv. Principal** | Crea y gestiona estudios, configura prescreen y timeslots |
| **Inv. Ejecutor** | Colabora en estudios, marca completitud de participaciones |
| **Estudiante** | Explora estudios, se inscribe, asigna créditos extra a cursos |

> Ver [docs/ROLES.md](./docs/ROLES.md) para guías detalladas por rol.

---

## 🧪 Tests

```bash
# Ejecutar todos los tests
npx vitest run

# Con cobertura
npx vitest run --coverage
```

| Archivo | Tests | Cobertura |
|---|---|---|
| `permissions.test.ts` | 206 | Todos los roles × acciones |
| `validations.test.ts` | 59 | Todos los schemas Zod |
| `studies-approval.test.ts` | 59 | State machine, CRUD, RBAC |
| `timeslots-participation.test.ts` | 54 | Timeslots, inscripción, completitud |
| `credits.test.ts` | 20 | Límites de créditos |
| **Total** | **398** | — |

---

## 📁 Estructura del Proyecto

```
sirope/
├── src/
│   ├── app/
│   │   ├── (dashboard)/              # Páginas autenticadas por rol
│   │   │   ├── admin/                # Dashboard, usuarios, semestres, analytics, auditoría
│   │   │   ├── estudiante/           # Dashboard, estudios, inscripciones, créditos
│   │   │   ├── investigador/         # Dashboard, estudios, timeslots, colaboradores
│   │   │   └── profesor/             # Dashboard, cursos, créditos
│   │   ├── actions/                  # 12 módulos, 47+ server actions
│   │   ├── api/                      # Auth, cron, course-students, notifications
│   │   └── login/                    # Login con glassmorphism
│   ├── components/                   # Sidebar, Toast, Skeleton, NotificationBell, ExportCSV
│   ├── lib/                          # Permisos, validaciones, email, audit
│   └── types/                        # Tipos TypeScript compartidos
├── prisma/
│   ├── schema.prisma                 # 16 modelos, relaciones y constraints
│   └── seed.ts                       # Datos iniciales de prueba
├── __tests__/                        # 398 tests unitarios
├── docs/                             # Guías por rol
├── DEPLOY.md                         # Guía de despliegue completa
└── README.md                         # Este archivo
```

---

## 🔒 Seguridad

- **RBAC** — 29 acciones con verificación server-side en cada operación
- **Validación** — Schemas Zod en cliente y servidor
- **Ownership** — Verificación de propiedad en todas las mutaciones
- **Auditoría** — Log inmutable de todas las acciones con IP y estados
- **Passwords** — bcrypt con 12 rondas de salt
- **CSRF** — Protección nativa de Next.js Server Actions
- **No SQL injection** — Prisma ORM con queries parametrizadas

---

## 🚢 Despliegue en Producción

Ver la guía completa en [DEPLOY.md](./DEPLOY.md), que incluye:

- Configuración de variables de entorno
- Checklist de seguridad
- Configuración de cron para recordatorios
- Opciones: Vercel, VPS, Docker
- Respaldos y actualización

---

## 📄 Licencia

MIT License — ver [LICENSE](./LICENSE) para detalles.

## 👤 Autor

**Alexander Barquero Elizondo, Ph.D.**

---

*SIROPE es software libre. Contribuciones bienvenidas.*
