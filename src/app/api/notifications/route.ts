/**
 * SIROPE — API: Notificaciones
 * Genera notificaciones contextuales basadas en el rol del usuario.
 * No usa modelo de DB — se genera dinámicamente de datos existentes.
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

interface Notification {
  id: string;
  icon: string;
  message: string;
  time: string;
  href?: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const role = (request.nextUrl.searchParams.get('role') || session.user.role) as Role;
  const notifications: Notification[] = [];

  if (role === 'ADMIN') {
    // Pending study approvals
    const pendingStudies = await prisma.study.count({ where: { status: 'PENDING_APPROVAL' } });
    if (pendingStudies > 0) {
      notifications.push({
        id: 'pending-studies',
        icon: '⏳',
        message: `${pendingStudies} estudio${pendingStudies > 1 ? 's' : ''} pendiente${pendingStudies > 1 ? 's' : ''} de aprobación`,
        time: 'Requiere acción',
        href: '/admin/aprobaciones',
      });
    }

    // Inactive users
    const inactiveUsers = await prisma.user.count({ where: { active: false } });
    if (inactiveUsers > 0) {
      notifications.push({
        id: 'inactive-users',
        icon: '👤',
        message: `${inactiveUsers} usuario${inactiveUsers > 1 ? 's' : ''} inactivo${inactiveUsers > 1 ? 's' : ''}`,
        time: 'Revisar',
        href: '/admin/usuarios',
      });
    }

    // No active semester
    const activeSemester = await prisma.semester.findFirst({ where: { active: true } });
    if (!activeSemester) {
      notifications.push({
        id: 'no-semester',
        icon: '📅',
        message: 'No hay semestre activo configurado',
        time: 'Configurar',
        href: '/admin/semestres',
      });
    }
  }

  if (role === 'PROFESOR') {
    // Pending alternative assignments
    const pendingAlts = await prisma.alternativeAssignment.count({
      where: {
        status: 'PENDING',
        course: { professorId: session.user.id },
      },
    });
    if (pendingAlts > 0) {
      notifications.push({
        id: 'pending-alts',
        icon: '📝',
        message: `${pendingAlts} asignación${pendingAlts > 1 ? 'es' : ''} alternativa${pendingAlts > 1 ? 's' : ''} por revisar`,
        time: 'Requiere acción',
        href: '/profesor/creditos',
      });
    }
  }

  if (role === 'ESTUDIANTE') {
    // Upcoming participations
    const upcomingParticipations = await prisma.participation.count({
      where: {
        studentId: session.user.id,
        status: 'CONFIRMED',
        timeslot: { startTime: { gte: new Date() } },
      },
    });
    if (upcomingParticipations > 0) {
      notifications.push({
        id: 'upcoming',
        icon: '🗓️',
        message: `${upcomingParticipations} participación${upcomingParticipations > 1 ? 'es' : ''} próxima${upcomingParticipations > 1 ? 's' : ''}`,
        time: 'Próximamente',
        href: '/estudiante/inscripciones',
      });
    }

    // Credits earned
    const totalCredits = await prisma.creditAssignment.aggregate({
      where: { studentId: session.user.id },
      _sum: { credits: true },
    });
    const credits = totalCredits._sum.credits || 0;
    if (credits > 0) {
      notifications.push({
        id: 'credits',
        icon: '🏆',
        message: `Has acumulado ${credits} créditos extra`,
        time: 'Ver detalle',
        href: '/estudiante/creditos',
      });
    }
  }

  if (role === 'INV_PRINCIPAL' || role === 'INV_EJECUTOR') {
    // Studies needing timeslots
    const studiesNoSlots = await prisma.study.count({
      where: {
        principalInvestigatorId: session.user.id,
        status: 'ACTIVE',
        timeslots: { none: {} },
      },
    });
    if (studiesNoSlots > 0) {
      notifications.push({
        id: 'no-timeslots',
        icon: '🕐',
        message: `${studiesNoSlots} estudio${studiesNoSlots > 1 ? 's' : ''} sin horarios configurados`,
        time: 'Configurar',
        href: '/investigador/timeslots',
      });
    }
  }

  return NextResponse.json({ notifications });
}
