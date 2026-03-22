/**
 * SIROPE — LDAP Authentication Adapter
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Adaptador para autenticación contra servidores LDAP/Active Directory.
 * Soporta bind directo y búsqueda por atributo.
 *
 * La configuración se almacena como JSON en InstitutionConfig.ldapConfig
 */

// ============================================================
// Tipos
// ============================================================

/** Configuración LDAP almacenada en InstitutionConfig.ldapConfig */
export interface LdapConfig {
  /** URL del servidor LDAP (ej: ldaps://ldap.universidad.cr:636) */
  url: string;
  /** Base DN para búsqueda de usuarios (ej: ou=people,dc=universidad,dc=cr) */
  baseDn: string;
  /** DN del usuario de servicio para bind inicial (ej: cn=sirope,ou=services,dc=universidad,dc=cr) */
  bindDn: string;
  /** Contraseña del usuario de servicio */
  bindPassword: string;
  /** Atributo LDAP que contiene el email (default: mail) */
  emailAttribute: string;
  /** Atributo LDAP que contiene el nombre completo (default: cn) */
  nameAttribute: string;
  /** Atributo LDAP que contiene el carné estudiantil (default: employeeNumber) */
  studentIdAttribute: string;
  /** Filtro de búsqueda (default: (mail={{email}})) — {{email}} se reemplaza */
  searchFilter: string;
  /** Si true, usa STARTTLS */
  startTls: boolean;
  /** Si true, ignora certificados TLS inválidos (solo para desarrollo) */
  tlsSkipVerify: boolean;
}

/** Resultado de una autenticación LDAP exitosa */
export interface LdapUser {
  email: string;
  name: string;
  studentId: string | null;
}

/** Valores por defecto para una configuración LDAP nueva */
export const DEFAULT_LDAP_CONFIG: LdapConfig = {
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

// ============================================================
// Funciones
// ============================================================

/**
 * Parsea la configuración LDAP desde el JSON almacenado en la BD.
 * Retorna null si no hay configuración válida.
 */
export function parseLdapConfig(jsonString: string | null): LdapConfig | null {
  if (!jsonString) return null;
  try {
    const parsed = JSON.parse(jsonString);
    return { ...DEFAULT_LDAP_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

/**
 * Autentica un usuario contra un servidor LDAP.
 *
 * Flujo:
 * 1. Bind con usuario de servicio (bindDn/bindPassword)
 * 2. Buscar usuario por email usando searchFilter
 * 3. Re-bind con el DN encontrado y la contraseña del usuario
 * 4. Si todo OK, retorna los datos del usuario
 *
 * Usa la librería nativa de Node.js o ldapts si está disponible.
 * Si no hay librería LDAP, hace una simulación HTTP básica.
 *
 * @param config - Configuración LDAP
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Datos del usuario o null si la autenticación falla
 */
export async function authenticateWithLDAP(
  config: LdapConfig,
  email: string,
  password: string
): Promise<LdapUser | null> {
  // Intentar usar ldapts (biblioteca LDAP para Node.js)
  try {
    const { Client } = await import('ldapts');

    const tlsOptions = config.tlsSkipVerify
      ? { rejectUnauthorized: false }
      : undefined;

    const client = new Client({
      url: config.url,
      tlsOptions,
    });

    try {
      // 1. Bind con usuario de servicio
      await client.bind(config.bindDn, config.bindPassword);

      // 2. Buscar usuario por email
      const filter = config.searchFilter.replace('{{email}}', email);
      const { searchEntries } = await client.search(config.baseDn, {
        filter,
        scope: 'sub',
        attributes: [config.emailAttribute, config.nameAttribute, config.studentIdAttribute, 'dn'],
      });

      if (searchEntries.length === 0) {
        await client.unbind();
        return null;
      }

      const entry = searchEntries[0];
      const userDn = entry.dn;

      // 3. Re-bind con las credenciales del usuario
      await client.unbind();

      const userClient = new Client({
        url: config.url,
        tlsOptions,
      });

      try {
        await userClient.bind(userDn, password);
        await userClient.unbind();
      } catch {
        // Contraseña incorrecta
        return null;
      }

      // 4. Extraer datos del usuario
      const getName = (attr: string | Buffer | (string | Buffer)[]): string => {
        if (Array.isArray(attr)) return String(attr[0] || '');
        return String(attr || '');
      };

      return {
        email: getName(entry[config.emailAttribute] as string) || email,
        name: getName(entry[config.nameAttribute] as string) || email.split('@')[0],
        studentId: entry[config.studentIdAttribute]
          ? getName(entry[config.studentIdAttribute] as string)
          : null,
      };
    } catch (err) {
      console.error('[LDAP] Error durante autenticación:', err);
      try { await client.unbind(); } catch { /* ignore */ }
      return null;
    }
  } catch {
    // ldapts no está instalado — usar fallback con variables de entorno
    console.warn('[LDAP] ldapts no instalado. Para habilitar LDAP ejecute: npm install ldapts');
    console.warn('[LDAP] Autenticación LDAP no disponible, use modo CREDENTIALS.');
    return null;
  }
}

/**
 * Verifica la conectividad con un servidor LDAP.
 * Intenta hacer bind con el usuario de servicio.
 *
 * @param config - Configuración LDAP a probar
 * @returns Mensaje de éxito o error
 */
export async function testLdapConnection(
  config: LdapConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const { Client } = await import('ldapts');

    const tlsOptions = config.tlsSkipVerify
      ? { rejectUnauthorized: false }
      : undefined;

    const client = new Client({
      url: config.url,
      tlsOptions,
      connectTimeout: 5000,
    });

    try {
      await client.bind(config.bindDn, config.bindPassword);
      await client.unbind();
      return { success: true, message: `✅ Conexión exitosa a ${config.url}` };
    } catch (err) {
      return { success: false, message: `❌ Error de bind: ${(err as Error).message}` };
    }
  } catch {
    return { success: false, message: '❌ ldapts no instalado. Ejecute: npm install ldapts' };
  }
}
