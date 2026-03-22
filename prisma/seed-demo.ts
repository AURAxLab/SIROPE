/**
 * SIROPE — Seed de Demostración para Stakeholders
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Crea un dataset completo y realista para presentaciones.
 * Incluye:
 * - 15+ usuarios (admin, profesores, investigadores, estudiantes)
 * - 6 cursos con matrículas
 * - 5 estudios en diferentes estados (borrador, pendiente, activo, cerrado, rechazado)
 * - Timeslots con participaciones (completadas, no-show, canceladas)
 * - Asignaciones de créditos
 * - Registros de auditoría
 *
 * Ejecutar: npx tsx prisma/seed-demo.ts
 */

import 'dotenv/config';
import bcryptjs from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client.js');
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  const PASSWORD = 'Demo2026!';
  const hash = await bcryptjs.hash(PASSWORD, 12);

  console.log('\n🎬 SIROPE — Seed de demostración para stakeholders');
  console.log('═'.repeat(55));

  // ─── Configuración ───
  await prisma.institutionConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Escuela de Ciencias de la Computación e Informática',
      shortName: 'ECCI',
      universityName: 'Universidad de Costa Rica',
      primaryColor: '#4F46E5',
      accentColor: '#F59E0B',
      contactEmail: 'sirope@ecci.universidad.cr',
      website: 'https://ecci.universidad.cr',
      timezone: 'America/Costa_Rica',
      studentIdLabel: 'Carné',
      authMode: 'CREDENTIALS',
      setupComplete: true,
    },
  });

  const configs = [
    { key: 'MAX_CREDITS_PER_SEMESTER', value: '4', description: 'Máximo de créditos extra por semestre' },
    { key: 'CANCELLATION_HOURS', value: '24', description: 'Horas para cancelar sin penalización' },
    { key: 'NO_SHOW_PENALTY_DAYS', value: '7', description: 'Días de bloqueo por no-show' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log('✅ Configuración institucional y del sistema');

  // ─── Semestres ───
  const sem1 = await prisma.semester.upsert({
    where: { name: 'I-2026' },
    update: {},
    create: { name: 'I-2026', startDate: new Date('2026-03-09'), endDate: new Date('2026-07-10'), active: true },
  });
  await prisma.semester.upsert({
    where: { name: 'II-2025' },
    update: {},
    create: { name: 'II-2025', startDate: new Date('2025-08-11'), endDate: new Date('2025-12-12'), active: false },
  });
  console.log('✅ Semestres (2): I-2026 (activo), II-2025 (pasado)');

  // ─── Usuarios ───
  const admin = await upsertUser('admin@universidad.cr', 'Ana Alfaro', 'ADMIN', null);
  const prof1 = await upsertUser('mario.brenes@universidad.cr', 'Mario Brenes', 'PROFESOR', null);
  const prof2 = await upsertUser('laura.mora@universidad.cr', 'Laura Mora', 'PROFESOR', null);
  const pi1 = await upsertUser('diana.rios@universidad.cr', 'Dra. Diana Ríos', 'INV_PRINCIPAL', null);
  const pi2 = await upsertUser('jorge.vargas@universidad.cr', 'Dr. Jorge Vargas', 'INV_PRINCIPAL', null);
  const ie1 = await upsertUser('carlos.zun@universidad.cr', 'Carlos Zúñiga', 'INV_EJECUTOR', null);
  const ie2 = await upsertUser('maria.roj@universidad.cr', 'María Rojas', 'INV_EJECUTOR', null);

  const students = [];
  const studentData = [
    { email: 'sofia.cast@universidad.cr', name: 'Sofía Castillo', id: 'B90001' },
    { email: 'andres.herr@universidad.cr', name: 'Andrés Herrera', id: 'B90002' },
    { email: 'val.sala@universidad.cr', name: 'Valentina Salas', id: 'B90003' },
    { email: 'daniel.cha@universidad.cr', name: 'Daniel Chaves', id: 'B90004' },
    { email: 'camila.sol@universidad.cr', name: 'Camila Solís', id: 'B90005' },
    { email: 'pablo.nav@universidad.cr', name: 'Pablo Navarrete', id: 'B90006' },
    { email: 'lucia.agu@universidad.cr', name: 'Lucía Aguilar', id: 'B90007' },
    { email: 'diego.mend@universidad.cr', name: 'Diego Mendoza', id: 'B90008' },
  ];
  for (const s of studentData) {
    students.push(await upsertUser(s.email, s.name, 'ESTUDIANTE', s.id));
  }
  console.log(`✅ Usuarios (${3 + 2 + 2 + studentData.length}): 1 admin, 2 prof, 2 PI, 2 IE, ${studentData.length} estudiantes`);

  // ─── Cursos ───
  const courses = [
    { code: 'CI-1101', name: 'Introducción a la Computación', prof: prof1.id, max: 2.0 },
    { code: 'CI-1200', name: 'Programación I', prof: prof1.id, max: 1.5 },
    { code: 'CI-1310', name: 'Estructuras de Datos', prof: prof2.id, max: 2.0 },
    { code: 'CI-1330', name: 'Bases de Datos', prof: prof2.id, max: 1.0 },
    { code: 'CI-2414', name: 'Ingeniería de Software', prof: prof1.id, max: 3.0 },
    { code: 'CI-2600', name: 'Interacción Humano-Computador', prof: prof2.id, max: 2.5 },
  ];
  const courseRecs = [];
  for (const c of courses) {
    courseRecs.push(await prisma.course.upsert({
      where: { code_semesterId: { code: c.code, semesterId: sem1.id } },
      update: {},
      create: { code: c.code, name: c.name, semesterId: sem1.id, professorId: c.prof, maxExtraCredits: c.max, optedIn: true },
    }));
  }
  console.log(`✅ Cursos (${courses.length})`);

  // ─── Matrículas ───
  let enrollCount = 0;
  for (let si = 0; si < students.length; si++) {
    // Each student enrolled in 2-3 courses
    const coursesToEnroll = courseRecs.slice(si % 4, (si % 4) + 3);
    for (const c of coursesToEnroll) {
      await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId: students[si].id, courseId: c.id } },
        update: {},
        create: { studentId: students[si].id, courseId: c.id },
      });
      enrollCount++;
    }
  }
  console.log(`✅ Matrículas (${enrollCount})`);

  // ─── Estudio 1: ACTIVO con participaciones ───
  const study1 = await upsertStudy('demo-study-1', {
    title: 'Usabilidad de Interfaces en Dispositivos Móviles',
    description: 'Evaluación de patrones de interfaz (bottom sheets, tabs, drawers) en apps móviles con eye-tracking. Participantes interactúan con prototipos Figma y responden encuesta SUS.',
    piId: pi1.id, semId: sem1.id, credits: 1.0, duration: 45,
    location: 'Lab ECCI-204', status: 'ACTIVE', adminId: admin.id,
  });

  // Colaborador
  await prisma.studyCollaborator.upsert({
    where: { studyId_userId: { studyId: study1.id, userId: ie1.id } },
    update: {}, create: { studyId: study1.id, userId: ie1.id },
  });

  // Prescreen
  await createPrescreenIfNeeded(study1.id, [
    { q: '¿Usa smartphone diariamente?', answer: true, order: 0 },
    { q: '¿Tiene alguna discapacidad visual no corregida?', answer: false, order: 1 },
  ]);

  // Timeslots pasados (con participaciones) + futuros
  const ts1Past = await createTimeslotIfNeeded(study1.id, pi1.id, daysFromNow(-5), 45, 5, 'Lab ECCI-204');
  const ts2Past = await createTimeslotIfNeeded(study1.id, pi1.id, daysFromNow(-3), 45, 5, 'Lab ECCI-204');
  const ts3Future = await createTimeslotIfNeeded(study1.id, pi1.id, daysFromNow(2), 45, 5, 'Lab ECCI-204');
  const ts4Future = await createTimeslotIfNeeded(study1.id, pi1.id, daysFromNow(5), 45, 5, 'Lab ECCI-204');
  const ts5Future = await createTimeslotIfNeeded(study1.id, pi1.id, daysFromNow(8), 45, 3, 'Lab ECCI-204');

  // Participaciones en timeslots pasados
  if (ts1Past && ts2Past) {
    await createParticipation(ts1Past.id, study1.id, students[0].id, 'COMPLETED');
    await createParticipation(ts1Past.id, study1.id, students[1].id, 'COMPLETED');
    await createParticipation(ts1Past.id, study1.id, students[2].id, 'NO_SHOW');
    await createParticipation(ts2Past.id, study1.id, students[3].id, 'COMPLETED');
    await createParticipation(ts2Past.id, study1.id, students[4].id, 'COMPLETED');
  }

  // Inscripciones futuras
  if (ts3Future) {
    await createParticipation(ts3Future.id, study1.id, students[5].id, 'SIGNED_UP');
    await createParticipation(ts3Future.id, study1.id, students[6].id, 'SIGNED_UP');
  }

  console.log('✅ Estudio 1: "Usabilidad Móvil" — ACTIVO, 5 timeslots, 7 participaciones');

  // ─── Estudio 2: ACTIVO ───
  const study2 = await upsertStudy('demo-study-2', {
    title: 'Efectividad de Gamificación en Aprendizaje de Programación',
    description: 'Comparación de métodos de enseñanza con y sin elementos de gamificación en cursos de programación introductoria. Pre-test y post-test con grupo control.',
    piId: pi2.id, semId: sem1.id, credits: 1.5, duration: 60,
    location: 'Sala de Reuniones ECCI-301', status: 'ACTIVE', adminId: admin.id,
  });
  await prisma.studyCollaborator.upsert({
    where: { studyId_userId: { studyId: study2.id, userId: ie2.id } },
    update: {}, create: { studyId: study2.id, userId: ie2.id },
  });
  const ts6 = await createTimeslotIfNeeded(study2.id, pi2.id, daysFromNow(1), 60, 8, 'ECCI-301');
  const ts7 = await createTimeslotIfNeeded(study2.id, pi2.id, daysFromNow(4), 60, 8, 'ECCI-301');
  const ts8 = await createTimeslotIfNeeded(study2.id, pi2.id, daysFromNow(7), 60, 8, 'ECCI-301');
  if (ts6) {
    await createParticipation(ts6.id, study2.id, students[0].id, 'SIGNED_UP');
    await createParticipation(ts6.id, study2.id, students[7].id, 'SIGNED_UP');
  }
  console.log('✅ Estudio 2: "Gamificación" — ACTIVO, 3 timeslots, 2 inscripciones');

  // ─── Estudio 3: PENDIENTE DE APROBACIÓN ───
  await upsertStudy('demo-study-3', {
    title: 'Impacto del Trabajo Remoto en la Productividad de Equipos Ágiles',
    description: 'Encuesta y entrevistas a equipos de desarrollo que migaron a trabajo remoto durante 2025. Analiza métricas de velocity, satisfacción y burnout.',
    piId: pi1.id, semId: sem1.id, credits: 0.5, duration: 30,
    location: 'Virtual (Zoom)', status: 'PENDING_APPROVAL', adminId: null,
  });
  console.log('✅ Estudio 3: "Trabajo Remoto" — PENDIENTE DE APROBACIÓN');

  // ─── Estudio 4: BORRADOR ───
  await upsertStudy('demo-study-4', {
    title: 'Evaluación de Herramientas de IA para Code Review',
    description: 'Estudio piloto comparando la efectividad de revisiones de código asistidas por IA vs. revisiones manuales en proyectos universitarios.',
    piId: pi2.id, semId: sem1.id, credits: 2.0, duration: 90,
    location: 'Lab ECCI-205', status: 'DRAFT', adminId: null,
  });
  console.log('✅ Estudio 4: "IA Code Review" — BORRADOR');

  // ─── Estudio 5: CERRADO (con datos completos) ───
  const study5 = await upsertStudy('demo-study-5', {
    title: 'Percepción de Privacidad en Redes Sociales',
    description: 'Estudio sobre cómo los estudiantes universitarios perciben y gestionan su privacidad en redes sociales. Cuestionario estandarizado + entrevista corta.',
    piId: pi1.id, semId: sem1.id, credits: 1.0, duration: 40,
    location: 'Lab ECCI-204', status: 'CLOSED', adminId: admin.id,
  });
  const ts9 = await createTimeslotIfNeeded(study5.id, pi1.id, daysFromNow(-14), 40, 5, 'Lab ECCI-204');
  const ts10 = await createTimeslotIfNeeded(study5.id, pi1.id, daysFromNow(-12), 40, 5, 'Lab ECCI-204');
  if (ts9 && ts10) {
    await createParticipation(ts9.id, study5.id, students[0].id, 'COMPLETED');
    await createParticipation(ts9.id, study5.id, students[1].id, 'COMPLETED');
    await createParticipation(ts9.id, study5.id, students[2].id, 'COMPLETED');
    await createParticipation(ts10.id, study5.id, students[3].id, 'COMPLETED');
    await createParticipation(ts10.id, study5.id, students[4].id, 'COMPLETED');
    await createParticipation(ts10.id, study5.id, students[5].id, 'COMPLETED');
  }
  console.log('✅ Estudio 5: "Privacidad" — CERRADO, 6 participaciones completadas');

  // ─── Asignaciones de créditos ───
  // Students 0-4 completed study1, let's assign some credits
  const completedParticipations = await prisma.participation.findMany({
    where: { status: 'COMPLETED', study: { id: { in: [study1.id, study5.id] } } },
    include: { student: true, study: true },
  });

  let creditCount = 0;
  for (const p of completedParticipations.slice(0, 6)) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: p.studentId },
    });
    if (enrollment) {
      const existing = await prisma.creditAssignment.findFirst({
        where: { participationId: p.id },
      });
      if (!existing) {
        await prisma.creditAssignment.create({
          data: {
            participationId: p.id,
            studentId: p.studentId,
            courseId: enrollment.courseId,
            credits: p.study.creditsWorth,
          },
        });
        creditCount++;
      }
    }
  }
  console.log(`✅ Asignaciones de créditos (${creditCount})`);

  // ─── Audit logs ───
  const auditEntries = [
    { userId: admin.id, action: 'APPROVE_STUDY', entityType: 'Study', entityId: study1.id },
    { userId: admin.id, action: 'APPROVE_STUDY', entityType: 'Study', entityId: study2.id },
    { userId: admin.id, action: 'CREATE_USER', entityType: 'User', entityId: students[0].id },
    { userId: pi1.id, action: 'CREATE_STUDY', entityType: 'Study', entityId: study1.id },
    { userId: pi2.id, action: 'CREATE_STUDY', entityType: 'Study', entityId: study2.id },
    { userId: pi1.id, action: 'SUBMIT_FOR_APPROVAL', entityType: 'Study', entityId: study1.id },
    { userId: ie1.id, action: 'MARK_COMPLETION', entityType: 'Participation', entityId: 'bulk' },
  ];
  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }
  console.log(`✅ Registros de auditoría (${auditEntries.length})`);

  // ─── Resumen final ───
  console.log('\n' + '═'.repeat(55));
  console.log('🎉 Seed de demostración completado!');
  console.log('═'.repeat(55));
  console.log(`\n📊 Resumen:`);
  console.log(`   • ${3 + 2 + 2 + studentData.length} usuarios`);
  console.log(`   • ${courses.length} cursos`);
  console.log(`   • 5 estudios (1 activo, 1 activo, 1 pendiente, 1 borrador, 1 cerrado)`);
  console.log(`   • ${enrollCount} matrículas`);
  console.log(`   • ~10 timeslots con participaciones`);
  console.log(`   • ${creditCount} asignaciones de créditos`);
  console.log(`   • ${auditEntries.length} registros de auditoría`);
  console.log(`\n🔑 Contraseña para TODOS los usuarios: ${PASSWORD}`);
  console.log(`\n👤 Cuentas de demo:`);
  console.log(`   admin@universidad.cr           — Ana Alfaro (Administradora)`);
  console.log(`   mario.brenes@universidad.cr     — Mario Brenes (Profesor)`);
  console.log(`   laura.mora@universidad.cr       — Laura Mora (Profesora)`);
  console.log(`   diana.rios@universidad.cr       — Dra. Diana Ríos (Inv. Principal)`);
  console.log(`   jorge.vargas@universidad.cr     — Dr. Jorge Vargas (Inv. Principal)`);
  console.log(`   carlos.zun@universidad.cr       — Carlos Zúñiga (Inv. Ejecutor)`);
  console.log(`   sofia.cast@universidad.cr       — Sofía Castillo (Estudiante B90001)`);
  console.log(`   andres.herr@universidad.cr      — Andrés Herrera (Estudiante B90002)`);

  await prisma.$disconnect();

  // ─── Helper functions ───
  async function upsertUser(email: string, name: string, role: string, studentId: string | null) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: hash, name, role, studentId, active: true },
    });
  }

  async function upsertStudy(id: string, data: {
    title: string; description: string; piId: string; semId: string;
    credits: number; duration: number; location: string; status: string; adminId: string | null;
  }) {
    return prisma.study.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title: data.title,
        description: data.description,
        principalInvestigatorId: data.piId,
        semesterId: data.semId,
        creditsWorth: data.credits,
        estimatedDuration: data.duration,
        location: data.location,
        status: data.status,
        approvedById: data.adminId,
        approvedAt: data.adminId ? new Date() : undefined,
      },
    });
  }

  async function createPrescreenIfNeeded(studyId: string, questions: { q: string; answer: boolean; order: number }[]) {
    const existing = await prisma.prescreenQuestion.findMany({ where: { studyId } });
    if (existing.length > 0) return;
    for (const qn of questions) {
      await prisma.prescreenQuestion.create({
        data: { studyId, questionText: qn.q, requiredAnswer: qn.answer, orderIndex: qn.order },
      });
    }
  }

  async function createTimeslotIfNeeded(studyId: string, createdById: string, start: Date, durationMins: number, maxP: number, loc: string) {
    const existing = await prisma.timeslot.findFirst({
      where: { studyId, startTime: start },
    });
    if (existing) return existing;
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMins);
    return prisma.timeslot.create({
      data: { studyId, createdById, startTime: start, endTime: end, maxParticipants: maxP, location: loc, status: 'AVAILABLE' },
    });
  }

  async function createParticipation(timeslotId: string, studyId: string, studentId: string, status: string) {
    const existing = await prisma.participation.findFirst({
      where: { timeslotId, studentId },
    });
    if (existing) return existing;
    return prisma.participation.create({
      data: {
        timeslotId, studyId, studentId, status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  function daysFromNow(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    return d;
  }
}

main().catch(async (error: unknown) => {
  console.error('❌ Error en seed de demo:', error);
  process.exit(1);
});
