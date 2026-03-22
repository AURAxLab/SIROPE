/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Admin — Vista principal
 * Panel de administración con resumen del sistema, estudios pendientes
 * de aprobación, y accesos a configuración.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import ExportCSV from '@/components/ExportCSV';

/**
 * Dashboard del administrador con métricas del sistema.
 */
export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') {
    redirect('/login');
  }

  // Métricas del sistema
  const [
    totalUsers,
    activeStudies,
    pendingApproval,
    totalParticipations,
    activeSemester,
  ] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.study.count({ where: { status: 'ACTIVE' } }),
    prisma.study.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        principalInvestigator: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.participation.count({ where: { status: 'COMPLETED' } }),
    prisma.semester.findFirst({ where: { active: true } }),
  ]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Panel de Administración ⚙️</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Semestre: {activeSemester?.name || 'Sin semestre activo'}
          </p>
        </div>
        <ExportCSV type="participations" label="📥 Exportar Participaciones" />
      </div>

      {/* Estadísticas del sistema */}
      <div className="stat-grid">
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>
            {pendingApproval.length}
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Pendientes de Aprobar
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-label">Usuarios Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeStudies}</div>
          <div className="stat-label">Estudios Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalParticipations}</div>
          <div className="stat-label">Participaciones Completadas</div>
        </div>
      </div>

      {/* Estudios pendientes de aprobación */}
      {pendingApproval.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--color-warning)' }}>
          <h2 style={{ marginBottom: 16 }}>
            ⏳ Estudios Pendientes de Aprobación
          </h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Investigador</th>
                  <th>Fecha Envío</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingApproval.map((study) => (
                  <tr key={study.id}>
                    <td style={{ fontWeight: 600 }}>{study.title}</td>
                    <td>{study.principalInvestigator.name}</td>
                    <td>
                      {study.createdAt.toLocaleDateString('es-CR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <a
                        href={`/admin/aprobaciones/${study.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Revisar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="stat-grid">
        <a href="/admin/usuarios" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👥</div>
          <h3>Gestionar Usuarios</h3>
          <p style={{ fontSize: '0.8125rem' }}>Crear, editar y desactivar cuentas</p>
        </a>
        <a href="/admin/semestres" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📅</div>
          <h3>Semestres</h3>
          <p style={{ fontSize: '0.8125rem' }}>Configurar ciclos académicos</p>
        </a>
        <a href="/admin/configuracion" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚙️</div>
          <h3>Configuración</h3>
          <p style={{ fontSize: '0.8125rem' }}>Institución, límites y parámetros</p>
        </a>
        <a href="/admin/analytics" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📈</div>
          <h3>Analytics</h3>
          <p style={{ fontSize: '0.8125rem' }}>Métricas y estadísticas del sistema</p>
        </a>
        <a href="/admin/auditoria" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
          <h3>Auditoría</h3>
          <p style={{ fontSize: '0.8125rem' }}>Registro de acciones del sistema</p>
        </a>
      </div>
    </div>
  );
}
