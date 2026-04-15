/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Mis Estudios — Lista de estudios del investigador
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Role } from '@/lib/validations';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Borrador', badge: 'badge-neutral' },
  PENDING_APPROVAL: { label: 'Pendiente', badge: 'badge-warning' },
  ACTIVE: { label: 'Activo', badge: 'badge-success' },
  CLOSED: { label: 'Cerrado', badge: 'badge-info' },
  REJECTED: { label: 'Rechazado', badge: 'badge-error' },
};

export default async function MisEstudios() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = session.user.role as Role;
  if (role !== 'INV_PRINCIPAL' && role !== 'INV_EJECUTOR') redirect('/login');

  const isPI = role === 'INV_PRINCIPAL';

  // Estudios propios (PI) o como colaborador (IE)
  const studies = isPI
    ? await prisma.study.findMany({
        where: { principalInvestigatorId: session.user.id },
        include: {
          semester: { select: { name: true } },
          _count: { select: { timeslots: true, participations: true, collaborators: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : await prisma.study.findMany({
        where: { collaborators: { some: { userId: session.user.id } } },
        include: {
          principalInvestigator: { select: { name: true } },
          semester: { select: { name: true } },
          _count: { select: { timeslots: true, participations: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Mis Estudios 🔬</h1>
        {isPI && (
          <Link href="/investigador/estudios/nuevo" className="btn btn-primary">
            + Nuevo Estudio
          </Link>
        )}
      </div>

      {studies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <p className="empty-state-text">
            {isPI ? 'No has creado estudios aún.' : 'No colaboras en ningún estudio.'}
          </p>
          {isPI && (
            <Link href="/investigador/estudios/nuevo" className="btn btn-primary">
              Crear tu primer estudio
            </Link>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Estudio</th>
                <th>Semestre</th>
                <th>Estado</th>
                <th>Créditos</th>
                <th>Timeslots</th>
                <th>Participantes</th>
                {!isPI && <th>IP</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {studies.map((s) => {
                const statusInfo = STATUS_LABELS[s.status] || { label: s.status, badge: 'badge-neutral' };
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td>{s.semester.name}</td>
                    <td><span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span></td>
                    <td>{s.creditsWorth}</td>
                    <td>{s._count.timeslots}</td>
                    <td>{s._count.participations}</td>
                    {!isPI && <td>{'principalInvestigator' in s ? (s as { principalInvestigator: { name: string } }).principalInvestigator.name : '—'}</td>}
                    <td>
                      <Link href={`/investigador/estudios/${s.id}`} className="btn btn-ghost btn-sm">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
