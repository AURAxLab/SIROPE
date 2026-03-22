/**
 * SIROPE — NuevoUsuarioForm
 * Formulario para crear usuario con email, nombre, contraseña, rol,
 * y carné (opcional, para estudiantes).
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/app/actions/admin';

const ROLES = [
  { value: 'ESTUDIANTE', label: '🎓 Estudiante' },
  { value: 'PROFESOR', label: '📚 Profesor' },
  { value: 'INV_PRINCIPAL', label: '🔬 Investigador Principal' },
  { value: 'INV_EJECUTOR', label: '🧪 Investigador Ejecutor' },
  { value: 'ADMIN', label: '🛡️ Administrador' },
];

export default function NuevoUsuarioForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'ESTUDIANTE',
    studentId: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    startTransition(async () => {
      const result = await createUser({
        email: form.email,
        name: form.name,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        studentId: form.studentId || undefined,
      });

      if (result.success) {
        router.push('/admin/usuarios');
      } else {
        setError(result.error || 'Error al crear usuario');
      }
    });
  }

  return (
    <div>
      <nav style={{ marginBottom: 20 }}>
        <a href="/admin/usuarios" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Volver a usuarios
        </a>
      </nav>

      <h1 className="page-title" style={{ marginBottom: 24 }}>Nuevo Usuario 👤</h1>

      <div className="card" style={{ maxWidth: 600 }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange}
              placeholder="Ej: María García López" required minLength={2} maxLength={100} />
          </div>

          <div className="form-group">
            <label className="form-label">Correo electrónico *</label>
            <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="usuario@universidad.cr" required />
          </div>

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select className="form-select" name="role" value={form.role} onChange={handleChange}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {form.role === 'ESTUDIANTE' && (
            <div className="form-group">
              <label className="form-label">Carné estudiantil</label>
              <input className="form-input" name="studentId" value={form.studentId} onChange={handleChange}
                placeholder="Ej: B90000" />
              <span className="form-hint">Solo para estudiantes</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Contraseña *</label>
              <input className="form-input" name="password" type="password" value={form.password}
                onChange={handleChange} placeholder="Mínimo 8 caracteres" required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña *</label>
              <input className="form-input" name="confirmPassword" type="password" value={form.confirmPassword}
                onChange={handleChange} placeholder="Repetir contraseña" required minLength={8} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <a href="/admin/usuarios" className="btn btn-secondary">Cancelar</a>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Creando...' : '👤 Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
