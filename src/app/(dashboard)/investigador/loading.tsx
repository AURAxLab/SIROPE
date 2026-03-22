/**
 * SIROPE — Loading state para Investigador
 */
import { SkeletonStatGrid, SkeletonCard } from '@/components/Skeleton';

export default function InvestigadorLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard Investigador 🔬</h1>
      </div>
      <SkeletonStatGrid count={3} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
