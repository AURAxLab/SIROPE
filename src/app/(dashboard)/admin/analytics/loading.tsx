/**
 * SIROPE — Loading state para Analytics
 */
import { SkeletonStatGrid, SkeletonTable, Skeleton } from '@/components/Skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics 📊</h1>
      </div>
      <Skeleton width={100} height={20} style={{ marginBottom: 12 }} />
      <SkeletonStatGrid count={4} />
      <Skeleton width={200} height={20} style={{ marginTop: 32, marginBottom: 12 }} />
      <SkeletonStatGrid count={4} />
      <div style={{ marginTop: 32 }}>
        <Skeleton width={180} height={20} style={{ marginBottom: 12 }} />
        <SkeletonTable rows={3} cols={5} />
      </div>
    </div>
  );
}
