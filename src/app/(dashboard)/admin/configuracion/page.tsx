/**
 * SIROPE — Configuración Institucional (Admin)
 * Editar parámetros del sistema almacenados en SystemConfig.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import ConfigForm from './ConfigForm';

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const systemConfigs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  });

  // Extract institution configs from SystemConfig
  const instKeys = ['NAME', 'SHORTNAME', 'UNIVERSITYNAME', 'CONTACTEMAIL', 'WEBSITE', 'TIMEZONE', 'STUDENTIDLABEL'];
  const instConfig: Record<string, string> = {};
  for (const key of instKeys) {
    const found = systemConfigs.find((c) => c.key === `INSTITUTION_${key}`);
    if (found) instConfig[key.toLowerCase()] = found.value;
  }

  // Fetch InstitutionConfig for auth settings
  const institutionModel = await prisma.institutionConfig.findUnique({
    where: { id: 'singleton' },
    select: { authMode: true, ldapConfig: true },
  });

  // Non-institution configs
  const nonInstConfigs = systemConfigs.filter((c) => !c.key.startsWith('INSTITUTION_'));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Configuración ⚙️</h1>
      </div>

      <ConfigForm
        institution={Object.keys(instConfig).length > 0 ? {
          name: instConfig.name || '',
          shortName: instConfig.shortname || '',
          universityName: instConfig.universityname || '',
          contactEmail: instConfig.contactemail || '',
          website: instConfig.website || '',
          timezone: instConfig.timezone || 'America/Costa_Rica',
          studentIdLabel: instConfig.studentidlabel || 'Carné',
          authMode: institutionModel?.authMode || 'CREDENTIALS',
          ldapConfig: institutionModel?.ldapConfig || null,
        } : null}
        configs={nonInstConfigs.map((c) => ({
          id: c.id,
          key: c.key,
          value: c.value,
          description: c.description || '',
        }))}
      />
    </div>
  );
}
