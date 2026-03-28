/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Profesor — Vista principal
 * Tema UI: UCR Celeste + Frontend-Design Upgrade
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import { 
  BookOpen, Users, Award, BookMarked, 
  PlusCircle, LayoutDashboard, GraduationCap, ChevronRight 
} from 'lucide-react';

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

  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header: Editorial Typography & Flex spatial composition */}
      <div className="page-header stagger-1">
        <div>
          <h1 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LayoutDashboard size={28} color="var(--celeste-500)" />
            Panel Docente
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
            Prof. <strong style={{ color: 'var(--text-primary)' }}>{session.user.name}</strong> — Gestión de optativas
          </p>
        </div>
        <a href="/profesor/cursos/nuevo" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: '32px' }}>
          <PlusCircle size={18} /> Registrar Curso
        </a>
      </div>

      {/* Grid Asimétrico Principal */}
      <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Hero Card */}
        <div className="card-gradient" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '32px' }}>
          <BookMarked size={140} color="rgba(255,255,255,0.04)" style={{ position: 'absolute', right: -20, bottom: -20, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-value" style={{ color: 'white', fontSize: '4rem', lineHeight: 1 }}>
              {courses.length}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
              <BookOpen size={28} color="white" />
            </div>
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 12, fontSize: '1.05rem', letterSpacing: '0.01em' }}>
            Grupos Activos en el Semestre
          </div>
        </div>

        {/* Secondary Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="stat-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Alumnos Matriculados</div>
              <Users size={18} color="var(--celeste-500)" />
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{totalStudents}</div>
          </div>
          
          <div className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="stat-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Créditos Extra Otorgados</div>
              <Award size={18} color="var(--celeste-500)" />
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{totalCreditsAssigned}</div>
          </div>
        </div>
      </div>

      {/* Catálogo de Cursos */}
      <div className="card stagger-3" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--surface-border)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
            <GraduationCap size={22} color="var(--celeste-400)" />
            Desglose de Cursos
          </h2>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state" style={{ padding: '80px 24px' }}>
            <div style={{ background: 'var(--surface-hover)', padding: 24, borderRadius: '50%', marginBottom: 20 }}>
              <BookMarked size={48} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
              No tienes cursos registrados este semestre.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
              Agrega tus grupos para permitir que los estudiantes acumulen horas optativas.
            </p>
            <a href="/profesor/cursos/nuevo" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: '32px' }}>
              Registrar Primer Curso
            </a>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Código y Nombre</th>
                  <th style={{ textAlign: 'center' }}>Semestre</th>
                  <th style={{ textAlign: 'center' }}>Límite Hrs.</th>
                  <th style={{ textAlign: 'center' }}>Opt-in UCR</th>
                  <th style={{ textAlign: 'center' }}>Matrículas <Users size={12} style={{marginLeft: 4, display: 'inline-block'}} /></th>
                  <th style={{ textAlign: 'center' }}>Adjudicados <Award size={12} style={{marginLeft: 4, display: 'inline-block'}} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td style={{ paddingLeft: 32 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--celeste-300)', letterSpacing: '0.02em' }}>{course.code}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{course.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{course.semester.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{course.maxExtraCredits} pts</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${course.optedIn ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                        {course.optedIn ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>{course._count.enrollments}</td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>{course._count.creditAssignments}</td>
                    <td style={{ paddingRight: 32, textAlign: 'right' }}>
                       <a href="#" style={{ color: 'var(--text-secondary)', display: 'inline-flex', padding: 8, background: 'var(--surface-hover)', borderRadius: '50%' }}>
                          <ChevronRight size={16} />
                        </a>
                    </td>
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
