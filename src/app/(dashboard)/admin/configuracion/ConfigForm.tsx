/**
 * SIROPE — ConfigForm
 * Formulario de configuración institucional, parámetros del sistema, y LDAP.
 */

'use client';

import { useState, useTransition } from 'react';
import { updateInstitutionConfig, updateSystemConfig, saveLdapConfig, testLdapConnection, uploadInstitutionLogo } from '@/app/actions/admin';
import { useToast } from '@/components/Toast';

interface ConfigFormProps {
  institution: {
    name: string;
    shortName: string;
    universityName: string;
    contactEmail: string;
    website: string;
    timezone: string;
    studentIdLabel: string;
    ethicsCommitteeName?: string;
    authMode?: string;
    ldapConfig?: string | null;
  } | null;
  configs: { id: string; key: string; value: string; description: string }[];
}

const DEFAULT_LDAP = {
  url: 'ldaps://ldap.universidad.cr:636',
  baseDn: 'ou=people,dc=universidad,dc=cr',
  bindDn: 'cn=sirope,ou=services,dc=universidad,dc=cr',
  bindPassword: '',
  emailAttribute: 'mail',
  nameAttribute: 'cn',
  studentIdAttribute: 'employeeNumber',
  searchFilter: '(mail={{email}})',
  startTls: false,
  tlsSkipVerify: false,
};

export default function ConfigForm({ institution, configs }: ConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [instForm, setInstForm] = useState({
    name: institution?.name || '',
    shortName: institution?.shortName || '',
    universityName: institution?.universityName || '',
    contactEmail: institution?.contactEmail || '',
    website: institution?.website || '',
    timezone: institution?.timezone || 'America/Costa_Rica',
    studentIdLabel: institution?.studentIdLabel || 'Carné',
    ethicsCommitteeName: institution?.ethicsCommitteeName || 'Comité Ético Científico (CEC)',
    primaryColor: '#6366f1',
    accentColor: '#f59e0b',
    authMode: institution?.authMode || 'CREDENTIALS',
  });
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    Object.fromEntries(configs.map((c) => [c.key, c.value]))
  );

  // Parse existing LDAP config or use defaults
  const parsedLdap = (() => {
    try {
      return institution?.ldapConfig ? { ...DEFAULT_LDAP, ...JSON.parse(institution.ldapConfig) } : DEFAULT_LDAP;
    } catch { return DEFAULT_LDAP; }
  })();
  const [ldapForm, setLdapForm] = useState(parsedLdap);
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleInstChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setInstForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleLdapChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setLdapForm((prev: typeof DEFAULT_LDAP) => ({ ...prev, [e.target.name]: val }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast('El archivo supera el límite de 2MB.', 'error');
      e.target.value = ''; // Reset
      return;
    }

    startTransition(() => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await uploadInstitutionLogo(base64);
        if (res.success) {
          toast('Logo actualizado exitosamente (recargue para ver cambios)', 'success');
        } else {
          toast(res.error || 'Error al subir el logo', 'error');
        }
      };
      reader.onerror = () => toast('Error al procesar el archivo local', 'error');
      reader.readAsDataURL(file);
    });
  }

  function handleSaveInstitution() {
    startTransition(async () => {
      await updateInstitutionConfig(instForm);
      toast('Configuración institucional guardada', 'success');
    });
  }

  function handleSaveLdap() {
    startTransition(async () => {
      const result = await saveLdapConfig(ldapForm);
      if (result.success) {
        toast('Configuración LDAP guardada', 'success');
      } else {
        toast(result.error || 'Error al guardar', 'error');
      }
    });
  }

  function handleTestLdap() {
    startTransition(async () => {
      setLdapTestResult(null);
      const result = await testLdapConnection(ldapForm);
      setLdapTestResult(result);
      toast(result.message, result.success ? 'success' : 'error');
    });
  }

  function handleSaveConfig(key: string) {
    startTransition(async () => {
      await updateSystemConfig(key, configValues[key] || '');
      toast(`${key} actualizado`, 'success');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Institución */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🏛️ Datos Institucionales</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Logotipo Institucional (Opcional)</label>
            <input className="form-input" style={{ padding: '8px' }} type="file" accept="image/png, image/jpeg, image/svg+xml, image/webp" onChange={handleLogoUpload} disabled={isPending} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Debe ser un archivo PNG, JPG, WEBP o SVG menor a 2MB. Si se omite, se usará el logotipo por defecto.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Universidad Matriz u Organización</label>
            <input className="form-input" name="universityName" value={instForm.universityName} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Unidad Gestora del Sistema</label>
            <input className="form-input" name="name" value={instForm.name} onChange={handleInstChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Siglas de la Unidad</label>
            <input className="form-input" name="shortName" value={instForm.shortName} onChange={handleInstChange} />
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
            <label className="form-label">Nombre del comité de ética</label>
            <input className="form-input" name="ethicsCommitteeName" value={instForm.ethicsCommitteeName} onChange={handleInstChange}
              placeholder="Ej: CEC, IRB, CEI, Comité de Bioética" />
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

      {/* Autenticación */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🔐 Autenticación</h2>
        <div className="form-group">
          <label className="form-label">Modo de autenticación</label>
          <select className="form-input" name="authMode" value={instForm.authMode} onChange={handleInstChange}>
            <option value="CREDENTIALS">Credenciales locales (email + contraseña)</option>
            <option value="LDAP">LDAP / Active Directory</option>
          </select>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {instForm.authMode === 'LDAP'
              ? '⚠️ Los administradores siempre pueden usar credenciales locales como respaldo.'
              : 'Los usuarios se autentican contra la base de datos local del sistema.'}
          </p>
        </div>

        {instForm.authMode === 'LDAP' && (
          <div style={{
            marginTop: 16, padding: 16,
            background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>⚙️ Configuración LDAP</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">URL del servidor</label>
                <input className="form-input" name="url" value={ldapForm.url} onChange={handleLdapChange}
                  placeholder="ldaps://ldap.universidad.cr:636" />
              </div>
              <div className="form-group">
                <label className="form-label">Base DN</label>
                <input className="form-input" name="baseDn" value={ldapForm.baseDn} onChange={handleLdapChange}
                  placeholder="ou=people,dc=universidad,dc=cr" />
              </div>
              <div className="form-group">
                <label className="form-label">Bind DN (usuario de servicio)</label>
                <input className="form-input" name="bindDn" value={ldapForm.bindDn} onChange={handleLdapChange}
                  placeholder="cn=sirope,ou=services,dc=..." />
              </div>
              <div className="form-group">
                <label className="form-label">Bind Password</label>
                <input className="form-input" name="bindPassword" type="password" value={ldapForm.bindPassword} onChange={handleLdapChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Filtro de búsqueda</label>
                <input className="form-input" name="searchFilter" value={ldapForm.searchFilter} onChange={handleLdapChange}
                  placeholder="(mail={{email}})" />
              </div>
              <div className="form-group">
                <label className="form-label">Atributo de email</label>
                <input className="form-input" name="emailAttribute" value={ldapForm.emailAttribute} onChange={handleLdapChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Atributo de nombre</label>
                <input className="form-input" name="nameAttribute" value={ldapForm.nameAttribute} onChange={handleLdapChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Atributo de carné</label>
                <input className="form-input" name="studentIdAttribute" value={ldapForm.studentIdAttribute} onChange={handleLdapChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.875rem' }}>
                <input type="checkbox" name="tlsSkipVerify" checked={ldapForm.tlsSkipVerify} onChange={handleLdapChange} />
                Ignorar certificados TLS (solo desarrollo)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSaveLdap} disabled={isPending}>
                {isPending ? 'Guardando...' : '💾 Guardar LDAP'}
              </button>
              <button className="btn btn-secondary" onClick={handleTestLdap} disabled={isPending}>
                {isPending ? '⏳ Probando...' : '🔌 Probar Conexión'}
              </button>
            </div>
            {ldapTestResult && (
              <div style={{
                marginTop: 12, padding: 10,
                borderRadius: 'var(--radius-sm)',
                background: ldapTestResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${ldapTestResult.success ? 'var(--color-success)' : 'var(--color-error)'}`,
                fontSize: '0.875rem',
              }}>
                {ldapTestResult.message}
              </div>
            )}
          </div>
        )}
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

      {/* Backup */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>💾 Backup y Mantenimiento</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.875rem' }}>
          Descargue una copia de seguridad de la base de datos SQLite. Para PostgreSQL, use <code>pg_dump</code>.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              const res = await fetch('/api/admin/backup');
              if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al generar backup');
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'sirope-backup.db';
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              alert('Error de conexión al generar backup');
            }
          }}
        >
          📥 Descargar Backup
        </button>
      </div>
    </div>
  );
}
