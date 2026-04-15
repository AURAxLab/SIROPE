'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { getAdminStudies } from '@/app/actions/admin';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Borrador', badge: 'badge-neutral' },
  PENDING_APPROVAL: { label: 'Pendiente', badge: 'badge-warning' },
  ACTIVE: { label: 'Activo', badge: 'badge-success' },
  CLOSED: { label: 'Cerrado', badge: 'badge-info' },
  REJECTED: { label: 'Rechazado', badge: 'badge-error' },
};

interface StudyData {
  id: string;
  title: string;
  status: string;
  creditsWorth: number;
  principalInvestigator: { name: string };
  semester: { name: string };
}

interface AdminStudyTableProps {
  initialStudies: StudyData[];
  initialTotal: number;
}

export default function AdminStudyTable({ initialStudies, initialTotal }: AdminStudyTableProps) {
  const [isPending, startTransition] = useTransition();
  const [studies, setStudies] = useState<StudyData[]>(initialStudies);
  const [total, setTotal] = useState(initialTotal);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(total / pageSize);

  const fetchStudies = useCallback((p: number, s: string, status: string, size: number) => {
    startTransition(async () => {
      const result = await getAdminStudies({
        search: s || undefined,
        status: status || undefined,
        page: p,
        pageSize: size,
      });
      if (result.success && result.data) {
        const data = result.data as { studies: StudyData[]; total: number };
        setStudies(data.studies);
        setTotal(data.total);
      }
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchStudies(1, search, statusFilter, pageSize);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, pageSize, fetchStudies]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchStudies(newPage, search, statusFilter, pageSize);
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Resultados Totales</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ maxWidth: 300, margin: 0 }}
            placeholder="🔍 Buscar título o investigador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            {Object.entries(STATUS_LABELS).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
          
          <select 
            className="form-select" 
            style={{ width: 'auto' }} 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>

          {(search || statusFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setStatusFilter(''); }}
            >
              ✕ Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Investigador Principal</th>
                <th>Semestre</th>
                <th>Estado</th>
                <th>Créditos</th>
              </tr>
            </thead>
            <tbody>
              {studies.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No se encontraron estudios con esos criterios
                  </td>
                </tr>
              ) : (
                studies.map((s) => {
                  const statusInfo = STATUS_LABELS[s.status] || { label: s.status, badge: 'badge-neutral' };
                  return (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/estudios/${s.id}`}>
                      <td>
                        <Link href={`/admin/estudios/${s.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {s.title}
                        </Link>
                      </td>
                      <td>{s.principalInvestigator.name}</td>
                      <td>{s.semester.name}</td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
                      </td>
                      <td>{s.creditsWorth} cr.</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
            >
              ← Anterior
            </button>
            <span style={{ padding: '6px 12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Página {page} de {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
