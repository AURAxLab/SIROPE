/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Profesor — Vista principal
 * Muestra los cursos del profesor con créditos asignados y matrículas.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

/**
 * Dashboard del profesor con resumen de cursos y créditos.
 */
export default async function ProfesorDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'PROFESOR') {
    redirect('/login');
  }

  const [courses, totalCreditsAssigned] = await Promise.all([
    prisma.course.findMany({
      where: {
        professorId: session.user.id,
        semester: { active: true },
      },
      include: {
        semester: { select: { name: true } },
        _count: {
          select: {
            enrollments: true,
            creditAssignments: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.creditAssignment.count({
      where: {
        course: {
          professorId: session.user.id,
          semester: { active: true },
        },
      },
    }),
  ]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Profesor 📚</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {session.user.name}
          </p>
        </div>
        <a href="/profesor/cursos/nuevo" className="btn btn-primary">
          + Nuevo Curso
        </a>
      </div>

      {/* Estadísticas */}
      <div className="stat-grid">
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>
            {courses.length}
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Cursos Activos
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCreditsAssigned}</div>
          <div className="stat-label">Créditos Asignados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {courses.reduce((sum, c) => sum + c._count.enrollments, 0)}
          </div>
          <div className="stat-label">Estudiantes Matriculados</div>
        </div>
      </div>

      {/* Cursos */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>📚 Mis Cursos</h2>
        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <p className="empty-state-text">
              No tiene cursos registrados este semestre.
            </p>
            <a href="/profesor/cursos/nuevo" className="btn btn-primary">
              Crear Curso
            </a>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Semestre</th>
                  <th>Max Créditos</th>
                  <th>Opt-in</th>
                  <th>Matrículas</th>
                  <th>Créditos</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td style={{ fontWeight: 600 }}>{course.code}</td>
                    <td>{course.name}</td>
                    <td>{course.semester.name}</td>
                    <td>{course.maxExtraCredits}</td>
                    <td>
                      <span className={`badge ${course.optedIn ? 'badge-success' : 'badge-neutral'}`}>
                        {course.optedIn ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>{course._count.enrollments}</td>
                    <td>{course._count.creditAssignments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
