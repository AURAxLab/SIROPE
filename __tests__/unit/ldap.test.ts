/**
 * SIROPE — Tests: LDAP Configuration & Parsing
 * Verifica el parsing de configuración LDAP, valores por defecto,
 * y la lógica del adaptador.
 */

import { describe, it, expect } from 'vitest';
import { parseLdapConfig, DEFAULT_LDAP_CONFIG } from '@/lib/ldap';
import type { LdapConfig } from '@/lib/ldap';

// ============================================================
// Tests: parseLdapConfig
// ============================================================

describe('parseLdapConfig', () => {
  it('Retorna null si el input es null', () => {
    expect(parseLdapConfig(null)).toBe(null);
  });

  it('Retorna null si el input es string vacío', () => {
    expect(parseLdapConfig('')).toBe(null);
  });

  it('Retorna null si el JSON es inválido', () => {
    expect(parseLdapConfig('not valid json{')).toBe(null);
  });

  it('Retorna defaults si el JSON es un objeto vacío', () => {
    const result = parseLdapConfig('{}');
    expect(result).not.toBeNull();
    expect(result!.url).toBe(DEFAULT_LDAP_CONFIG.url);
    expect(result!.baseDn).toBe(DEFAULT_LDAP_CONFIG.baseDn);
    expect(result!.bindDn).toBe(DEFAULT_LDAP_CONFIG.bindDn);
    expect(result!.emailAttribute).toBe('mail');
    expect(result!.nameAttribute).toBe('cn');
    expect(result!.studentIdAttribute).toBe('employeeNumber');
    expect(result!.searchFilter).toBe('(mail={{email}})');
    expect(result!.startTls).toBe(false);
    expect(result!.tlsSkipVerify).toBe(false);
  });

  it('Mezcla valores parciales con defaults', () => {
    const partial = JSON.stringify({
      url: 'ldaps://custom.server:636',
      baseDn: 'ou=users,dc=custom,dc=cr',
    });
    const result = parseLdapConfig(partial);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('ldaps://custom.server:636');
    expect(result!.baseDn).toBe('ou=users,dc=custom,dc=cr');
    // Defaults for unspecified fields
    expect(result!.bindDn).toBe(DEFAULT_LDAP_CONFIG.bindDn);
    expect(result!.emailAttribute).toBe('mail');
  });

  it('Configuración completa se parsea correctamente', () => {
    const full: LdapConfig = {
      url: 'ldaps://ldap.ucr.ac.cr:636',
      baseDn: 'ou=people,dc=ucr,dc=ac,dc=cr',
      bindDn: 'cn=sirope,ou=apps,dc=ucr,dc=ac,dc=cr',
      bindPassword: 'secret123',
      emailAttribute: 'email',
      nameAttribute: 'displayName',
      studentIdAttribute: 'carnet',
      searchFilter: '(&(email={{email}})(objectClass=person))',
      startTls: true,
      tlsSkipVerify: true,
    };
    const result = parseLdapConfig(JSON.stringify(full));
    expect(result).toEqual(full);
  });

  it('Atributos extra en el JSON se ignoran sin error', () => {
    const withExtras = JSON.stringify({
      url: 'ldaps://test:636',
      unknownField: 'value',
      anotherExtra: 42,
    });
    const result = parseLdapConfig(withExtras);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('ldaps://test:636');
  });
});

// ============================================================
// Tests: DEFAULT_LDAP_CONFIG
// ============================================================

describe('DEFAULT_LDAP_CONFIG', () => {
  it('Tiene todos los campos requeridos', () => {
    const requiredKeys: (keyof LdapConfig)[] = [
      'url', 'baseDn', 'bindDn', 'bindPassword',
      'emailAttribute', 'nameAttribute', 'studentIdAttribute',
      'searchFilter', 'startTls', 'tlsSkipVerify',
    ];
    for (const key of requiredKeys) {
      expect(DEFAULT_LDAP_CONFIG).toHaveProperty(key);
    }
  });

  it('Usa LDAPS por defecto', () => {
    expect(DEFAULT_LDAP_CONFIG.url).toMatch(/^ldaps:\/\//);
  });

  it('TLS skip verify desactivado por defecto', () => {
    expect(DEFAULT_LDAP_CONFIG.tlsSkipVerify).toBe(false);
  });

  it('Filtro de búsqueda contiene placeholder {{email}}', () => {
    expect(DEFAULT_LDAP_CONFIG.searchFilter).toContain('{{email}}');
  });

  it('bindPassword vacío por defecto (seguridad)', () => {
    expect(DEFAULT_LDAP_CONFIG.bindPassword).toBe('');
  });
});

// ============================================================
// Tests: Lógica de searchFilter
// ============================================================

describe('LDAP Search Filter', () => {
  it('Reemplaza {{email}} correctamente', () => {
    const filter = '(mail={{email}})';
    const result = filter.replace('{{email}}', 'user@universidad.cr');
    expect(result).toBe('(mail=user@universidad.cr)');
  });

  it('Filtro complejo con AND reemplaza correctamente', () => {
    const filter = '(&(mail={{email}})(objectClass=person))';
    const result = filter.replace('{{email}}', 'test@uni.cr');
    expect(result).toBe('(&(mail=test@uni.cr)(objectClass=person))');
  });

  it('Sin placeholder no se modifica', () => {
    const filter = '(uid=someuser)';
    const result = filter.replace('{{email}}', 'ignored@test.cr');
    expect(result).toBe('(uid=someuser)');
  });
});
