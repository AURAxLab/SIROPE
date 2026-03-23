/**
 * SIROPE — API: Backup de Base de Datos
 * Permite a administradores descargar un respaldo de la base de datos SQLite.
 * Solo funciona cuando DATABASE_URL usa SQLite (file:).
 *
 * GET /api/admin/backup
 * Headers: Cookie de sesión (autenticación vía NextAuth)
 * Response: Archivo .db descargable
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Role } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  // Verificar autenticación y rol
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  // Solo SQLite soporta backup por descarga directa
  if (!dbUrl.startsWith('file:')) {
    return NextResponse.json(
      { error: 'Backup por descarga solo disponible con SQLite. Para PostgreSQL, use pg_dump.' },
      { status: 400 }
    );
  }

  // Resolver path del archivo
  const relativePath = dbUrl.replace('file:', '');
  const dbPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), relativePath);

  if (!existsSync(dbPath)) {
    return NextResponse.json(
      { error: 'Archivo de base de datos no encontrado' },
      { status: 404 }
    );
  }

  try {
    const dbBuffer = readFileSync(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sirope-backup-${timestamp}.db`;

    // Registrar en auditoría
    await logAuditEvent({
      userId: session.user.id!,
      action: 'DOWNLOAD_BACKUP',
      entityType: 'System',
      entityId: 'database',
      newState: { filename, sizeBytes: dbBuffer.length },
    });

    return new NextResponse(dbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': dbBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Backup] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar backup' },
      { status: 500 }
    );
  }
}
