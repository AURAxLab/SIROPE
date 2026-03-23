# SIROPE — Migración a PostgreSQL

> Guía para migrar de SQLite a PostgreSQL en producción.

## ¿Cuándo migrar?

SQLite funciona bien hasta ~500 usuarios concurrentes. Para instituciones más grandes, migre a PostgreSQL.

## Pasos

### 1. Instalar dependencia PostgreSQL

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

### 2. Cambiar provider en schema

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
}
```

### 3. Actualizar prisma.ts

En `src/lib/prisma.ts`, reemplace el adaptador:

```diff
-import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
+import { PrismaPg } from '@prisma/adapter-pg';
+import pg from 'pg';

function createPrismaClient(): PrismaClient {
-  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
-  const dbPath = dbUrl.replace('file:', '');
-  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
+  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
+  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
```

### 4. Configurar DATABASE_URL

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/sirope?schema=public"
```

### 5. Re-generar Prisma Client y aplicar schema

```bash
npx prisma generate
npx prisma db push
```

### 6. Migrar datos (opcional)

Si tiene datos en SQLite que desea preservar:

```bash
# Exportar datos con sqlite3
sqlite3 prisma/dev.db .dump > dump.sql

# Convertir SQL a PostgreSQL (ajustar tipos)
# O usar una herramienta como pgloader:
pgloader prisma/dev.db postgresql://user:pass@localhost/sirope
```

### 7. Actualizar seed

El seed y seed-demo funcionan sin cambios — Prisma abstrae las diferencias.

### 8. Actualizar Dockerfile (si aplica)

```diff
-RUN npx prisma generate && npm run build
+RUN npm install pg && npx prisma generate && npm run build
```

## Verificación

```bash
npx vitest run          # Todos los tests deben pasar
npm run build           # Build exitoso
npm run dev             # Verificar manualmente
```

## Rollback

Para volver a SQLite, revierta los pasos 2 y 3 y reinstale `@prisma/adapter-better-sqlite3`.
