# SIROPE — Plan de Despliegue en RockyLinux

> **Manual maestro** para desplegar SIROPE en la VM de producción.
> Diseñado para ser ejecutado paso a paso por un agente AI vía SSH.

---

## Información de la VM

| Dato                   | Valor                                          |
| ---------------------- | ---------------------------------------------- |
| **OS**                 | RockyLinux 10.1                                |
| **IP**                 | `10.1.70.17`                                   |
| **Usuario SSH**        | `reclutamiento`                                |
| **Contraseña SSH**     | `<PEDIR_AL_USUARIO>`                           |
| **PostgreSQL usuario** | `postgres`                                     |
| **PostgreSQL password**| `<PEDIR_AL_USUARIO>`                           |
| **Servicios pre-instalados** | Node.js v20, PostgreSQL v18, Nginx, Docker |

> ⚠️ Las contraseñas están marcadas como placeholders. **Detente y pide las contraseñas al usuario antes de usarlas.**

---

## Fase 0 — Conexión SSH

```bash
ssh reclutamiento@10.1.70.17
# Ingresar contraseña cuando se solicite: <PEDIR_AL_USUARIO>
```

Verificar servicios pre-instalados:

```bash
node --version        # Esperado: v20.x
psql --version        # Esperado: 18.x
nginx -v              # Verificar instalado
docker --version      # Verificar instalado
docker compose version # Verificar instalado
```

---

## Fase 1 — Configurar PostgreSQL

### 1.1 Crear la base de datos `sirope`

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
-- Crear base de datos
CREATE DATABASE sirope
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

-- Crear usuario dedicado (opcional, se puede usar postgres directamente)
-- CREATE USER sirope_user WITH PASSWORD 'una-contraseña-segura';
-- GRANT ALL PRIVILEGES ON DATABASE sirope TO sirope_user;

-- Verificar
\l
\q
```

### 1.2 Verificar conexión

```bash
psql -U postgres -d sirope -c "SELECT 1 AS test;"
# Debería devolver: test = 1
```

> **Nota:** Si `psql` pide contraseña, usar la contraseña de PostgreSQL: `<PEDIR_AL_USUARIO>`
> Puede ser necesario editar `pg_hba.conf` para permitir conexiones locales con password.

### 1.3 Verificar pg_hba.conf (si hay problemas de conexión)

```bash
# Encontrar la ubicación del archivo
sudo -u postgres psql -c "SHOW hba_file;"

# Asegurar que las conexiones locales usen md5 o scram-sha-256:
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

# Después de editar, reiniciar PostgreSQL:
sudo systemctl restart postgresql
```

---

## Fase 2 — Clonar y Preparar el Código

### 2.1 Clonar repositorio

```bash
cd /home/reclutamiento
git clone https://github.com/AURAxLab/SIROPE.git sirope
cd sirope
```

### 2.2 Instalar dependencias + adaptador PostgreSQL

```bash
# Instalar dependencias del proyecto
npm install

# Instalar adaptador PostgreSQL para Prisma
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

### 2.3 Modificar Prisma Schema (SQLite → PostgreSQL)

Editar `prisma/schema.prisma`, línea ~14-16:

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
}
```

### 2.4 Modificar el cliente Prisma (adaptador)

Editar `src/lib/prisma.ts` — reemplazar TODO el contenido con:

```typescript
/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Cliente Prisma — Singleton (PostgreSQL)
 * Garantiza una única instancia del cliente Prisma en desarrollo
 * para evitar agotar las conexiones de base de datos con hot reload.
 * Usa el adaptador pg para PostgreSQL en producción.
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Crea una nueva instancia del cliente Prisma con el adaptador PostgreSQL.
 * La conexión se toma de DATABASE_URL.
 *
 * @returns Nueva instancia de PrismaClient configurada
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL connection');
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Instancia singleton del cliente Prisma para uso en toda la aplicación. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

---

## Fase 3 — Configurar Variables de Entorno

### 3.1 Crear archivo `.env`

```bash
cp .env.example .env
```

### 3.2 Editar `.env` con valores de producción

```bash
nano .env
```

Contenido del `.env`:

```env
# ============================================================
# SIROPE — Variables de Entorno (Producción RockyLinux)
# ============================================================

# Base de datos PostgreSQL
DATABASE_URL="postgresql://postgres:<PEDIR_AL_USUARIO>@localhost:5432/sirope?schema=public"

# NextAuth
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET="<GENERAR_CON_OPENSSL>"
NEXTAUTH_URL="http://10.1.70.17"

# Email (configurar después si se necesita)
# SMTP_HOST="smtp.ejemplo.com"
# SMTP_PORT="587"
# SMTP_USER="noreply@ejemplo.com"
# SMTP_PASSWORD="password"
# SMTP_FROM="SIROPE <noreply@ejemplo.com>"
```

### 3.3 Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# Copiar el resultado y pegarlo en .env como NEXTAUTH_SECRET
```

---

## Fase 4 — Inicializar Base de Datos

### 4.1 Generar cliente Prisma

```bash
npx prisma generate
```

### 4.2 Aplicar schema a PostgreSQL

```bash
npx prisma db push
```

> ⚠️ **NO ejecutar `npm run seed` ni `npm run seed:demo`.** La variable `SEED_ON_INIT` debe ser `false` o no estar definida. La base de datos debe iniciar vacía (sin datos de prueba).

### 4.3 Verificar que las tablas se crearon

```bash
psql -U postgres -d sirope -c "\dt"
```

Deberías ver todas las tablas:
- `InstitutionConfig`
- `SystemConfig`
- `User`
- `PasswordResetToken`
- `Semester`
- `Course`
- `Enrollment`
- `Study`
- `StudyCollaborator`
- `PrescreenQuestion`
- `PrescreenAnswer`
- `Timeslot`
- `WaitlistEntry`
- `Participation`
- `CreditAssignment`
- `AuditLog`
- `AlternativeAssignment`

---

## Fase 5 — Build de Producción

### 5.1 Compilar Next.js

```bash
npm run build
```

> Si hay errores de compilación, verificar que `prisma generate` se ejecutó correctamente.

### 5.2 Probar arranque

```bash
npm start
# Debe iniciar en http://localhost:3000
# Ctrl+C para detener
```

---

## Fase 6 — Crear Servicio systemd

Para que SIROPE arranque automáticamente y sobreviva reinicios:

### 6.1 Crear archivo de servicio

```bash
sudo tee /etc/systemd/system/sirope.service << 'EOF'
[Unit]
Description=SIROPE - Sistema de Registro Optativo de Participantes de Estudios
After=network.target postgresql.service

[Service]
Type=simple
User=reclutamiento
WorkingDirectory=/home/reclutamiento/sirope
ExecStart=/usr/bin/node /home/reclutamiento/sirope/.next/standalone/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
EnvironmentFile=/home/reclutamiento/sirope/.env

[Install]
WantedBy=multi-user.target
EOF
```

### 6.2 Habilitar y arrancar

```bash
sudo systemctl daemon-reload
sudo systemctl enable sirope
sudo systemctl start sirope
sudo systemctl status sirope
```

### 6.3 Verificar logs

```bash
sudo journalctl -u sirope -f --no-pager -n 50
```

---

## Fase 7 — Configurar Nginx (Reverse Proxy)

### 7.1 Crear configuración

```bash
sudo tee /etc/nginx/conf.d/sirope.conf << 'EOF'
server {
    listen 80;
    server_name 10.1.70.17;

    # Cuando se asigne dominio UCR, descomentar y ajustar:
    # server_name sirope.universidad.cr;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache de assets estáticos de Next.js
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 7.2 Verificar y aplicar configuración

```bash
# Verificar sintaxis
sudo nginx -t

# Si hay un default.conf que conflictúe, renombrarlo:
# sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak

# Aplicar
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### 7.3 Configurar firewall (si aplica)

```bash
# Permitir HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

---

## Fase 8 — Verificación Final

### 8.1 Verificar servicios activos

```bash
sudo systemctl status postgresql
sudo systemctl status sirope
sudo systemctl status nginx
```

### 8.2 Probar acceso

```bash
# Desde la VM
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
# Esperado: 200

curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/login
# Esperado: 200 (a través de Nginx)
```

### 8.3 Probar desde otra máquina (en la VPN UCR)

Abrir navegador y visitar:

```
http://10.1.70.17/login
```

Debería mostrar la página de login de SIROPE.

---

## Fase 9 — Crear Usuario Administrador

> Como **no se ejecutó seed**, la base de datos está vacía. Se necesita crear el primer administrador manualmente.

```bash
cd /home/reclutamiento/sirope

# Usar un script inline con Node.js/tsx
npx tsx -e "
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@universidad.cr',
      passwordHash: hash,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Crear configuración institucional
  await prisma.institutionConfig.create({
    data: { id: 'singleton' },
  });
  console.log('✅ Configuración institucional inicializada');

  await prisma.\$disconnect();
  await pool.end();
}

main().catch(console.error);
"
```

> ⚠️ **CAMBIAR la contraseña de admin inmediatamente** después de iniciar sesión en producción.

---

## Troubleshooting

### PostgreSQL no acepta conexión

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar pg_hba.conf permite auth local
sudo -u postgres psql -c "SHOW hba_file;"
# Editar para que tenga: local all all md5
sudo systemctl restart postgresql
```

### SIROPE no arranca

```bash
# Ver logs detallados
sudo journalctl -u sirope -e --no-pager -n 100

# Verificar .env está correcto
cat /home/reclutamiento/sirope/.env

# Probar manualmente
cd /home/reclutamiento/sirope
node .next/standalone/server.js
```

### Nginx devuelve 502 Bad Gateway

```bash
# SIROPE no está corriendo o no escucha en :3000
sudo systemctl status sirope
curl http://localhost:3000/login

# SELinux puede bloquear proxy
sudo setsebool -P httpd_can_network_connect 1
```

### SELinux (común en RockyLinux)

```bash
# Si Nginx no puede hacer proxy, habilitar:
sudo setsebool -P httpd_can_network_connect 1

# Si SIROPE no puede acceder a archivos:
sudo chcon -R -t httpd_sys_content_t /home/reclutamiento/sirope
```

---

## Resumen de Puertos

| Servicio   | Puerto | Acceso           |
| ---------- | ------ | ---------------- |
| PostgreSQL | 5432   | Solo localhost   |
| SIROPE     | 3000   | Solo localhost   |
| Nginx      | 80     | Red interna UCR  |

---

## Siguiente Paso: Dominio y HTTPS

Cuando soporte TI asigne un dominio UCR (ej: `sirope.ucr.ac.cr`):

1. Actualizar `NEXTAUTH_URL` en `.env` al nuevo dominio
2. Actualizar `server_name` en Nginx
3. Instalar certificado SSL con `certbot`:
   ```bash
   sudo dnf install certbot python3-certbot-nginx
   sudo certbot --nginx -d sirope.ucr.ac.cr
   ```
4. Reiniciar servicios:
   ```bash
   sudo systemctl restart sirope
   sudo systemctl reload nginx
   ```
