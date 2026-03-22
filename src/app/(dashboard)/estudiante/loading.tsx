/**
 * SIROPE — Loading state para Estudiante
 */
import { SkeletonStatGrid, SkeletonCard } from '@/components/Skeleton';

export default function EstudianteLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Mi Dashboard 🎓</h1>
      </div>
      <SkeletonStatGrid count={4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
