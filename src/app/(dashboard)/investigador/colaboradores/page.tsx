/**
 * SIROPE — Gestión de Colaboradores
 * Agregar/quitar IEs de un estudio.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import CollaboratorActions from './CollaboratorActions';

interface SearchParams {
  searchParams: Promise<{ studyId?: string }>;
}

export default async function ColaboradoresPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = session.user.role as Role;
  if (role !== 'INV_PRINCIPAL') redirect('/investigador');

  // Estudios del PI
  const studies = await prisma.study.findMany({
    where: { principalInvestigatorId: session.user.id },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'desc' },
  });

  const selectedStudyId = sp.studyId || studies[0]?.id || '';

  // Colaboradores actuales
  const collaborators = selectedStudyId
    ? await prisma.studyCollaborator.findMany({
        where: { studyId: selectedStudyId },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    : [];

  // IEs disponibles para agregar
  const existingCollabIds = collaborators.map((c) => c.userId);
  const availableIEs = await prisma.user.findMany({
    where: {
      role: 'INV_EJECUTOR',
      active: true,
      id: { notIn: existingCollabIds },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Colaboradores 🤝</h1>
      </div>

      {/* Selector de estudio */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label className="form-label">Seleccionar Estudio</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {studies.map((s) => (
            <a
              key={s.id}
              href={`/investigador/colaboradores?studyId=${s.id}`}
              className={`btn ${s.id === selectedStudyId ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {selectedStudyId && (
        <CollaboratorActions
          studyId={selectedStudyId}
          collaborators={collaborators.map((c) => ({
            id: c.id,
            userId: c.user.id,
            name: c.user.name,
            email: c.user.email,
          }))}
          availableIEs={availableIEs.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))}
        />
      )}
    </div>
  );
}
