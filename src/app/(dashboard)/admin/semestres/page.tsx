/**
 * SIROPE — Gestión de Semestres (Admin)
 * Crear, activar/desactivar semestres.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import SemesterActions from './SemesterActions';

export default async function SemestresPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const semesters = await prisma.semester.findMany({
    include: {
      _count: { select: { courses: true, studies: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Semestres 📅</h1>
        <a href="/admin/semestres/nuevo" className="btn btn-primary">+ Nuevo Semestre</a>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Cursos</th>
                <th>Estudios</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.startDate.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>{s.endDate.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge ${s.active ? 'badge-success' : 'badge-neutral'}`}>
                      {s.active ? '🟢 Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{s._count.courses}</td>
                  <td>{s._count.studies}</td>
                  <td>
                    <SemesterActions semesterId={s.id} active={s.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
