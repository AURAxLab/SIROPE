/**
 * SIROPE — Loading state para Admin Dashboard
 */
import { SkeletonStatGrid, SkeletonTable } from '@/components/Skeleton';

export default function AdminLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Panel de Administración ⚙️</h1>
      </div>
      <SkeletonStatGrid count={4} />
      <div style={{ marginTop: 24 }}>
        <SkeletonTable rows={3} cols={4} />
      </div>
    </div>
  );
}
