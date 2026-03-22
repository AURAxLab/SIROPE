/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Explorar Estudios — Lista de estudios activos para estudiantes
 * Tarjetas con información del estudio y enlace a detalle.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Role } from '@/lib/validations';
import styles from './estudios.module.css';

/**
 * Página de exploración de estudios activos del semestre actual.
 */
export default async function ExplorarEstudios() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
  });

  if (!activeSemester) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Explorar Estudios 🔬</h1>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p className="empty-state-text">No hay un semestre activo en este momento.</p>
        </div>
      </div>
    );
  }

  const studies = await prisma.study.findMany({
    where: { status: 'ACTIVE', semesterId: activeSemester.id },
    include: {
      principalInvestigator: { select: { name: true } },
      _count: {
        select: {
          timeslots: { where: { status: 'AVAILABLE' } },
          participations: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Explorar Estudios 🔬</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {studies.length} estudio{studies.length !== 1 ? 's' : ''} disponible{studies.length !== 1 ? 's' : ''} — Semestre {activeSemester.name}
          </p>
        </div>
      </div>

      {studies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <p className="empty-state-text">
            No hay estudios activos en este momento. ¡Vuelve pronto!
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {studies.map((study, i) => (
            <Link
              key={study.id}
              href={`/estudiante/estudios/${study.id}`}
              className={`${styles.studyCard} animate-slide-up stagger-${Math.min(i + 1, 4)}`}
            >
              {/* Header con créditos */}
              <div className={styles.cardHeader}>
                <span className={styles.credits}>
                  {study.creditsWorth} crédito{study.creditsWorth !== 1 ? 's' : ''}
                </span>
                <span className={styles.duration}>
                  ⏱ {study.estimatedDuration} min
                </span>
              </div>

              {/* Título y descripción */}
              <h3 className={styles.studyTitle}>{study.title}</h3>
              <p className={styles.studyDescription}>
                {study.description.length > 150
                  ? study.description.slice(0, 150) + '…'
                  : study.description}
              </p>

              {/* Investigador */}
              <div className={styles.researcher}>
                <span className={styles.researcherIcon}>👤</span>
                {study.principalInvestigator.name}
              </div>

              {/* Footer con stats */}
              <div className={styles.cardFooter}>
                <span className={styles.stat}>
                  🕐 {study._count.timeslots} horario{study._count.timeslots !== 1 ? 's' : ''}
                </span>
                {study.location && (
                  <span className={styles.stat}>
                    📍 {study.location}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
