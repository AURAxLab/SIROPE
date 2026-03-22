/**
 * SIROPE — Mis Cursos (Profesor)
 * Lista de cursos con toggle opt-in, crear nuevo, y gestión de créditos.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import CourseActions from './CourseActions';
import CourseStudents from './CourseStudents';

export default async function MisCursos() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'PROFESOR') redirect('/login');

  const activeSemester = await prisma.semester.findFirst({ where: { active: true } });

  const courses = await prisma.course.findMany({
    where: { professorId: session.user.id, semester: { active: true } },
    include: {
      semester: { select: { name: true } },
      _count: { select: { enrollments: true, creditAssignments: true } },
    },
    orderBy: { code: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Mis Cursos 📚</h1>
          {activeSemester && <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Semestre {activeSemester.name}</p>}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">No tienes cursos en el semestre activo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {courses.map((c) => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>{c.code}</span>
                    <span className={`badge ${c.optedIn ? 'badge-success' : 'badge-neutral'}`}>
                      {c.optedIn ? '✅ SIROPE activo' : '⏸ SIROPE inactivo'}
                    </span>
                  </div>
                  <h3 style={{ marginBottom: 4 }}>{c.name}</h3>
                  <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span>👥 {c._count.enrollments} estudiantes</span>
                    <span>🏆 {c._count.creditAssignments} asignaciones</span>
                    <span>📊 Máx. {c.maxExtraCredits} créditos extra</span>
                  </div>
                </div>
                <CourseActions courseId={c.id} optedIn={c.optedIn} />
              </div>
              <CourseStudents courseId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
