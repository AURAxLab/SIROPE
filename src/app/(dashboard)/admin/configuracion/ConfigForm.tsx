/**
 * SIROPE — ConfigForm
 * Formulario de configuración institucional y parámetros del sistema.
 */

'use client';

import { useState, useTransition } from 'react';
import { updateInstitutionConfig, updateSystemConfig } from '@/app/actions/admin';

interface ConfigFormProps {
  institution: {
    name: string;
    shortName: string;
    universityName: string;
    contactEmail: string;
    website: string;
    timezone: string;
    studentIdLabel: string;
  } | null;
  configs: { id: string; key: string; value: string; description: string }[];
}

export default function ConfigForm({ institution, configs }: ConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [instForm, setInstForm] = useState({
    name: institution?.name || '',
    shortName: institution?.shortName || '',
    universityName: institution?.universityName || '',
    contactEmail: institution?.contactEmail || '',
    website: institution?.website || '',
    timezone: institution?.timezone || 'America/Costa_Rica',
    studentIdLabel: institution?.studentIdLabel || 'Carné',
    primaryColor: '#6366f1',
    accentColor: '#f59e0b',
    authMode: 'credentials',
  });
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    Object.fromEntries(configs.map((c) => [c.key, c.value]))
  );
  const [saved, setSaved] = useState('');

  function handleInstChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setInstForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSaveInstitution() {
    startTransition(async () => {
      await updateInstitutionConfig(instForm);
      setSaved('Configuración institucional guardada ✅');
      setTimeout(() => setSaved(''), 3000);
    });
  }

  function handleSaveConfig(key: string) {
    startTransition(async () => {
      await updateSystemConfig(key, configValues[key] || '');
      setSaved(`${key} actualizado ✅`);
      setTimeout(() => setSaved(''), 3000);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {saved && (
        <div className="alert alert-success">{saved}</div>
      )}

      {/* Institución */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🏛️ Datos Institucionales</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre de la institución</label>
            <input className="form-input" name="name" value={instForm.name} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Siglas</label>
            <input className="form-input" name="shortName" value={instForm.shortName} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Universidad</label>
            <input className="form-input" name="universityName" value={instForm.universityName} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Email de contacto</label>
            <input className="form-input" name="contactEmail" value={instForm.contactEmail} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Sitio web</label>
            <input className="form-input" name="website" value={instForm.website} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Etiqueta de ID estudiantil</label>
            <input className="form-input" name="studentIdLabel" value={instForm.studentIdLabel} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Color primario</label>
            <input className="form-input" name="primaryColor" type="color" value={instForm.primaryColor} onChange={handleInstChange} style={{ height: 40 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Color acento</label>
            <input className="form-input" name="accentColor" type="color" value={instForm.accentColor} onChange={handleInstChange} style={{ height: 40 }} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSaveInstitution} disabled={isPending}>
          {isPending ? 'Guardando...' : '💾 Guardar Institución'}
        </button>
      </div>

      {/* System configs */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>⚙️ Parámetros del Sistema</h2>
        {configs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay parámetros configurados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {configs.map((c) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: 12, background: 'var(--surface-bg)',
                border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.key}</span>
                  {c.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{c.description}</p>}
                </div>
                <input
                  className="form-input"
                  style={{ width: 200 }}
                  value={configValues[c.key] || ''}
                  onChange={(e) => setConfigValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => handleSaveConfig(c.key)} disabled={isPending}>
                  💾
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
