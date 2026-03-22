/**
 * SIROPE — API: Estudiantes por curso
 * Devuelve la lista de estudiantes inscritos en un curso con sus créditos y participaciones.
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (role !== 'PROFESOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  // Verify the professor owns this course (unless admin)
  if (role === 'PROFESOR') {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { professorId: true },
    });
    if (!course || course.professorId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado para este curso' }, { status: 403 });
    }
  }

  // Get enrolled students with their credits and participation counts
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          participations: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
          creditAssignments: {
            where: { courseId },
            select: { credits: true },
          },
        },
      },
    },
    orderBy: { student: { name: 'asc' } },
  });

  const students = enrollments.map((e: typeof enrollments[number]) => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
    studentId: e.student.studentId,
    participationCount: e.student.participations.length,
    credits: e.student.creditAssignments.reduce((sum: number, ca: { credits: number }) => sum + ca.credits, 0),
  }));

  return NextResponse.json({ students });
}
