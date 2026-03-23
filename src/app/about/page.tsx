/**
 * SIROPE — Acerca de
 * Página pública con información sobre el sistema,
 * comparación con SONA Systems, y créditos del autor.
 */

import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  let config = null;
  try {
    config = await prisma.institutionConfig.findFirst();
  } catch {
    // DB may not be initialized yet
  }

  return (
    <div style={{
      maxWidth: 800, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>
          🍯 SIROPE
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>
          Sistema de Registro Optativo de Participantes de Estudios
        </p>
        {config && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {config.name} · {config.universityName}
          </p>
        )}
      </div>

      {/* Qué es */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>¿Qué es SIROPE?</h2>
        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          SIROPE es una plataforma web que conecta investigadores con participantes estudiantiles 
          mediante un sistema estandarizado de créditos extra. Los estudiantes pueden explorar 
          estudios de investigación activos, inscribirse voluntariamente, y recibir créditos 
          académicos por su participación.
        </p>
        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: 12 }}>
          El modelo está inspirado en el{' '}
          <a href="https://www.sona-systems.com/" target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>
            SONA Systems
          </a>{' '}
          utilizado por más de 1,500 universidades en el mundo (Harvard, Stanford, MIT, Oxford),
          adaptado a la realidad latinoamericana.
        </p>
      </div>

      {/* Comparación */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>SIROPE vs. SONA Systems</h2>
        <div className="table-wrapper">
          <table className="table" style={{ fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th>Aspecto</th>
                <th>SONA Systems</th>
                <th>SIROPE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Costo anual</td>
                <td>$2,000 – $5,000 USD</td>
                <td><span className="badge badge-success">$0 — Código abierto</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Datos</td>
                <td>Servidores en EE.UU.</td>
                <td><span className="badge badge-primary">Servidores propios</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Idioma</td>
                <td>Inglés</td>
                <td>Español nativo</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Ley 8968 (CR)</td>
                <td>No cumple sin DPA</td>
                <td><span className="badge badge-success">Cumplimiento total</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>LDAP</td>
                <td>No</td>
                <td><span className="badge badge-success">Sí</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Créditos</td>
                <td>Pool genérico</td>
                <td>Asignación a cursos específicos</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Personalización</td>
                <td>Limitada</td>
                <td>Total (MIT License)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Principios éticos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Principios Éticos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '🤝', title: 'Voluntariedad', desc: 'Cada inscripción requiere confirmación explícita de participación voluntaria.' },
            { icon: '🏛️', title: 'Comité Ético', desc: 'Los estudios deben indicar aprobación CEC o justificar su exención.' },
            { icon: '📋', title: 'Auditoría', desc: 'Cada acción queda registrada con trazabilidad inmutable.' },
            { icon: '🔒', title: 'Privacidad', desc: 'Datos almacenados localmente, cumplimiento Ley 8968.' },
          ].map((p) => (
            <div key={p.title} style={{
              padding: 16, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Créditos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Créditos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', color: 'white', fontWeight: 800,
            flexShrink: 0,
          }}>
            AB
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Alexander Barquero Elizondo, Ph.D.</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>
              Diseñador y Desarrollador
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
              <a href="https://github.com/AURAxLab" target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>
                AURAxLab
              </a>
              {' · '}
              <a href="https://github.com/AURAxLab/SIROPE" target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>
                Repositorio
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stack */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '16px 0' }}>
        <p>Next.js · TypeScript · Prisma · SQLite/PostgreSQL</p>
        <p style={{ marginTop: 4 }}>Licencia MIT · © 2026</p>
      </div>
    </div>
  );
}
