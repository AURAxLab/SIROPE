/**
 * SIROPE — Loading state para Admin Dashboard
 */
import { SkeletonStatGrid, SkeletonTable } from '@/components/Skeleton';

export default function AdminLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ height: '40px', width: '250px', background: 'var(--surface-border)', borderRadius: 'var(--radius-md)' }} className="animate-pulse" />
      </div>
      <SkeletonStatGrid count={4} />
      <div style={{ marginTop: 24 }}>
        <SkeletonTable rows={3} cols={4} />
      </div>
    </div>
  );
}
