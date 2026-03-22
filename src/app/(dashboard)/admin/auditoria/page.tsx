/**
 * SIROPE — Visor de Auditoría (Admin)
 * Log de todas las acciones del sistema con filtros.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

interface SearchParams {
  searchParams: Promise<{ page?: string; action?: string; userId?: string }>;
}

const PAGE_SIZE = 50;

export default async function AuditoriaPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const page = Math.max(1, parseInt(sp.page || '1', 10));
  const whereClause: Record<string, unknown> = {};
  if (sp.action) whereClause.action = sp.action;
  if (sp.userId) whereClause.userId = sp.userId;

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Distinct actions for filter
  const distinctActions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Auditoría 🔍</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          {totalCount} registros totales · Página {page}/{totalPages || 1}
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filtrar por acción:</span>
          <a href="/admin/auditoria" className={`btn ${!sp.action ? 'btn-primary' : 'btn-ghost'} btn-sm`}>Todas</a>
          {distinctActions.map((a) => (
            <a
              key={a.action}
              href={`/admin/auditoria?action=${a.action}`}
              className={`btn ${sp.action === a.action ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            >
              {a.action}
            </a>
          ))}
        </div>
      </div>

      {/* Logs table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>ID Entidad</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                    {log.timestamp.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{log.user.name}</span>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user.email}</span>
                  </td>
                  <td><span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.action}</span></td>
                  <td>{log.entityType}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.entityId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {page > 1 && (
              <a href={`/admin/auditoria?page=${page - 1}${sp.action ? `&action=${sp.action}` : ''}`} className="btn btn-ghost btn-sm">
                ← Anterior
              </a>
            )}
            <span style={{ padding: '6px 12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a href={`/admin/auditoria?page=${page + 1}${sp.action ? `&action=${sp.action}` : ''}`} className="btn btn-ghost btn-sm">
                Siguiente →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
