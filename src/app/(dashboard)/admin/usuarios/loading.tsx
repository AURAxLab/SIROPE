/**
 * SIROPE — Loading state para Usuarios
 */
import { SkeletonStatGrid, SkeletonTable, Skeleton } from '@/components/Skeleton';

export default function UsuariosLoading() {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Usuarios 👥</h1>
        <Skeleton width={140} height={36} borderRadius="8px" />
      </div>
      <SkeletonStatGrid count={1} />
      <div className="card" style={{ marginTop: 16, marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Skeleton width={300} height={36} />
          <Skeleton width={150} height={36} />
          <Skeleton width={150} height={36} />
        </div>
      </div>
      <SkeletonTable rows={6} cols={7} />
    </div>
  );
}
