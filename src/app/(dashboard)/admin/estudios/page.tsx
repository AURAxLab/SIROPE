import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import AdminStudyTable from './AdminStudyTable';

export default async function AdminEstudiosPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const pageSize = 25;

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        principalInvestigator: { select: { name: true } },
        semester: { select: { name: true } },
      },
    }),
    prisma.study.count(),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Directorio General de Estudios 📚</h1>
      </div>
      
      <AdminStudyTable initialStudies={studies} initialTotal={total} />
    </div>
  );
}
