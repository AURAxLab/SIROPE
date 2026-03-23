/**
 * SIROPE — API: Exportar Audit Logs por Estudio
 * Genera un CSV con todos los registros de auditoría de un estudio.
 *
 * GET /api/admin/audit-export?studyId=xxx
 * GET /api/admin/audit-export (todos los logs)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (role !== 'ADMIN' && role !== 'INV_PRINCIPAL') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get('studyId');

  // Build query
  const where: Record<string, unknown> = {};
  if (studyId) {
    where.entityId = studyId;
    // Also include logs related to participations/timeslots of this study
    where.OR = [
      { entityId: studyId },
      { entityType: 'Participation', newState: { contains: studyId } },
      { entityType: 'Timeslot', newState: { contains: studyId } },
    ];
    delete where.entityId;
  }

  // IP can only export their own study logs
  if (role === 'INV_PRINCIPAL' && studyId) {
    const study = await prisma.study.findUnique({ where: { id: studyId } });
    if (!study || study.principalInvestigatorId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado para este estudio' }, { status: 403 });
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 10000,
  });

  // Generate CSV
  const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Tipo Entidad', 'ID Entidad', 'Estado Anterior', 'Estado Nuevo', 'IP'];
  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    escapeCsv(log.user.name),
    escapeCsv(log.user.email),
    log.action,
    log.entityType,
    log.entityId,
    escapeCsv(log.previousState || ''),
    escapeCsv(log.newState || ''),
    log.ipAddress || '',
  ].join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // BOM for Excel UTF-8

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = studyId
    ? `audit-estudio-${studyId.slice(0, 8)}-${timestamp}.csv`
    : `audit-completo-${timestamp}.csv`;

  // Log the export
  await logAuditEvent({
    userId: session.user.id!,
    action: 'EXPORT_AUDIT_LOGS',
    entityType: studyId ? 'Study' : 'System',
    entityId: studyId || 'all',
    newState: { filename, rowCount: logs.length },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
