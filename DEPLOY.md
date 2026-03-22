# SIROPE — Guía de Despliegue (Deploy)

> **SIROPE** — Sistema de Registro Optativo de Participantes de Estudios
> Autor: Alexander Barquero Elizondo, Ph.D.

## Requisitos

| Componente | Versión mínima | Notas |
|---|---|---|
| Node.js | 20+ | LTS recomendado |
| npm | 10+ | Incluido con Node.js |
| SQLite | 3.35+ | Incluido vía `better-sqlite3` |
| Git | 2.30+ | Para clonar el repositorio |

## 1. Clonar el repositorio

```bash
git clone https://github.com/your-org/sirope.git
cd sirope
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Variables de entorno

Copie el archivo de ejemplo y configure:

```bash
cp .env.example .env
```

### Variables requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Ruta a la base de datos SQLite | `file:./prisma/dev.db` |
| `NEXTAUTH_URL` | URL pública de la aplicación | `https://sirope.ucr.ac.cr` |
| `NEXTAUTH_SECRET` | Secret para tokens JWT (mín 32 chars) | Generar con `openssl rand -base64 32` |
| `CRON_SECRET` | Token para el cron de recordatorios | Generar con `openssl rand -base64 32` |

### Variables opcionales (producción)

| Variable | Descripción |
|---|---|
| `SMTP_HOST` | Servidor SMTP para emails |
| `SMTP_PORT` | Puerto SMTP (default: 587) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | Email del remitente |

## 4. Inicializar la base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Crear base de datos y aplicar migraciones
npx prisma db push

# (Opcional) Cargar datos iniciales de prueba
npm run seed
```

## 5. Crear usuario administrador

El seed crea un admin por defecto:
- **Email:** `admin@ucr.ac.cr`
- **Contraseña:** `Admin123!`

> ⚠️ **CAMBIAR inmediatamente la contraseña en producción.**

## 6. Build y arranque

### Desarrollo

```bash
npm run dev
# → http://localhost:3000
```

### Producción

```bash
# Build optimizado
npm run build

# Arrancar servidor de producción
npm start
# → http://localhost:3000
```

## 7. Configurar cron de recordatorios

Los recordatorios automáticos requieren un cron externo que invoque el endpoint cada hora:

### Linux/macOS (crontab)

```bash
# Ejecutar cada hora
0 * * * * curl -s -X POST https://sirope.ucr.ac.cr/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET" > /dev/null
```

### Vercel Cron

En `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 8. Configuración institucional (primer inicio)

1. Ingrese como administrador
2. Vaya a **Configuración → Institución**
3. Configure:
   - Nombre de la escuela/facultad
   - Nombre de la universidad
   - Colores del tema
   - Zona horaria
   - Etiqueta del carné estudiantil
   - Modo de autenticación (credenciales o LDAP)

## 9. Seguridad en producción

- [ ] Cambiar contraseña de admin por defecto
- [ ] Configurar HTTPS (obligatorio)
- [ ] Generar `NEXTAUTH_SECRET` único
- [ ] Generar `CRON_SECRET` único
- [ ] Configurar respaldos automáticos del archivo SQLite
- [ ] Configurar firewall: solo puerto 443 público
- [ ] Revisar logs de auditoría periódicamente

## 10. Actualización

```bash
git pull origin main
npm install
npx prisma db push
npm run build
npm start
```

---

## Arquitectura

```
sirope/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (dashboard)/      # Páginas autenticadas
│   │   ├── actions/          # Server Actions (lógica de negocio)
│   │   ├── api/              # API routes (auth, cron)
│   │   └── login/            # Página de login
│   ├── components/           # Componentes React
│   └── lib/                  # Módulos compartidos
│       ├── auth.ts           # NextAuth configuración
│       ├── audit.ts          # Logger de auditoría
│       ├── email.ts          # Templates de email
│       ├── permissions.ts    # RBAC (29 acciones, 5 roles)
│       ├── prisma.ts         # Cliente Prisma
│       └── validations.ts    # Schemas Zod
├── prisma/
│   ├── schema.prisma         # Modelo de datos
│   └── seed.ts               # Datos iniciales
├── __tests__/                # Suite de tests (398 tests)
└── docs/                     # Documentación adicional
```
