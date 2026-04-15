/**
 * SIROPE — Gestión de Usuarios (Admin) — Client
 * Tabla con búsqueda, filtrado por rol/estado, y paginación.
 */

'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { getUsers } from '@/app/actions/admin';
import UserActions from './UserActions';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '🛡️ Admin',
  PROFESOR: '📚 Profesor',
  INV_PRINCIPAL: '🔬 Inv. Principal',
  INV_EJECUTOR: '🧪 Inv. Ejecutor',
  ESTUDIANTE: '🎓 Estudiante',
};

const ALL_ROLES = ['ADMIN', 'PROFESOR', 'INV_PRINCIPAL', 'INV_EJECUTOR', 'ESTUDIANTE'];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
  active: boolean;
  createdAt: string;
}

interface UserTableProps {
  currentUserId: string;
  initialUsers: User[];
  initialTotal: number;
}

export default function UserTable({ currentUserId, initialUsers, initialTotal }: UserTableProps) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  const fetchUsers = useCallback((p: number, s: string, r: string, a: boolean | undefined) => {
    startTransition(async () => {
      const result = await getUsers({
        search: s || undefined,
        role: r || undefined,
        active: a,
        page: p,
        pageSize,
      });
      if (result.success && result.data) {
        const data = result.data as { users: User[]; total: number };
        setUsers(data.users);
        setTotal(data.total);
      }
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers(1, search, roleFilter, activeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, activeFilter, fetchUsers]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchUsers(newPage, search, roleFilter, activeFilter);
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Resultados</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ maxWidth: 300, margin: 0 }}
            placeholder="🔍 Buscar por nombre, email o carné..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={activeFilter === undefined ? '' : String(activeFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setActiveFilter(v === '' ? undefined : v === 'true');
            }}
          >
            <option value="">Todos los estados</option>
            <option value="true">✅ Activos</option>
            <option value="false">🚫 Inactivos</option>
          </select>
          {(search || roleFilter || activeFilter !== undefined) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter(undefined); }}
            >
              ✕ Limpiar
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
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Carné</th>
                <th>Creado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No se encontraron usuarios con esos filtros
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: '0.875rem' }}>{u.email}</td>
                    <td><span className="badge badge-neutral">{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-success' : 'badge-error'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{u.studentId || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <UserActions userId={u.id} active={u.active} currentUserId={currentUserId} currentRole={u.role} currentName={u.name} currentEmail={u.email} currentStudentId={u.studentId || ''} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
