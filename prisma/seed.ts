/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Seed de Base de Datos
 * Crea datos iniciales para desarrollo y pruebas.
 * Incluye usuarios de todos los roles, semestres, cursos y estudios de ejemplo.
 *
 * Ejecutar: npm run seed
 */

import 'dotenv/config';
import bcryptjs from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/**
 * Ejecuta el seed completo de la base de datos.
 * Crea: configuración institucional, configuración del sistema,
 * semestre, usuarios de cada rol, cursos, matrículas y un estudio de ejemplo.
 */
async function main() {
  // Prisma v7: importar dinámicamente el cliente generado (ESM)
  const { PrismaClient } = await import('../src/generated/prisma/client.js');

  // Crear adaptador SQLite y cliente Prisma
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  /** Contraseña por defecto para todos los usuarios de prueba. */
  const DEFAULT_PASSWORD = 'Sirope2026!';

  console.log('🌱 Iniciando seed de base de datos...');

  const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, 12);

  // ─── Configuración Institucional ───
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
      contactEmail: 'sirope@ecci.ucr.ac.cr',
      website: 'https://ecci.ucr.ac.cr',
      timezone: 'America/Costa_Rica',
      studentIdLabel: 'Carné',
      authMode: 'CREDENTIALS',
      setupComplete: true,
    },
  });
  console.log('  ✅ Configuración institucional');

  // ─── Configuración del Sistema ───
  const systemConfigs = [
    { key: 'MAX_CREDITS_PER_SEMESTER', value: '4', description: 'Máximo de créditos que un estudiante puede obtener en un semestre' },
    { key: 'CANCELLATION_HOURS', value: '24', description: 'Horas mínimas antes del timeslot para cancelar sin penalización' },
    { key: 'NO_SHOW_PENALTY_DAYS', value: '7', description: 'Días de bloqueo por no-show' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('  ✅ Configuración del sistema');

  // ─── Semestre ───
  const semester = await prisma.semester.upsert({
    where: { name: 'I-2026' },
    update: {},
    create: {
      name: 'I-2026',
      startDate: new Date('2026-03-09'),
      endDate: new Date('2026-07-10'),
      active: true,
    },
  });
  console.log('  ✅ Semestre I-2026');

  // ─── Usuarios ───
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ucr.ac.cr' },
    update: {},
    create: {
      email: 'admin@ucr.ac.cr',
      passwordHash,
      name: 'Ana Administradora',
      role: 'ADMIN',
      active: true,
    },
  });

  const profesor = await prisma.user.upsert({
    where: { email: 'profesor@ucr.ac.cr' },
    update: {},
    create: {
      email: 'profesor@ucr.ac.cr',
      passwordHash,
      name: 'Pedro Profesor',
      role: 'PROFESOR',
      active: true,
    },
  });

  const investigadorPI = await prisma.user.upsert({
    where: { email: 'investigador@ucr.ac.cr' },
    update: {},
    create: {
      email: 'investigador@ucr.ac.cr',
      passwordHash,
      name: 'Irene Investigadora',
      role: 'INV_PRINCIPAL',
      active: true,
    },
  });

  const investigadorIE = await prisma.user.upsert({
    where: { email: 'ejecutor@ucr.ac.cr' },
    update: {},
    create: {
      email: 'ejecutor@ucr.ac.cr',
      passwordHash,
      name: 'Eduardo Ejecutor',
      role: 'INV_EJECUTOR',
      active: true,
    },
  });

  const estudiante = await prisma.user.upsert({
    where: { email: 'estudiante@ucr.ac.cr' },
    update: {},
    create: {
      email: 'estudiante@ucr.ac.cr',
      passwordHash,
      name: 'Sofía Estudiante',
      role: 'ESTUDIANTE',
      studentId: 'B90000',
      active: true,
    },
  });

  const estudiante2 = await prisma.user.upsert({
    where: { email: 'estudiante2@ucr.ac.cr' },
    update: {},
    create: {
      email: 'estudiante2@ucr.ac.cr',
      passwordHash,
      name: 'Carlos Estudiante',
      role: 'ESTUDIANTE',
      studentId: 'B90001',
      active: true,
    },
  });

  console.log('  ✅ Usuarios (6): admin, profesor, IP, IE, 2 estudiantes');

  // ─── Cursos ───
  const curso1 = await prisma.course.upsert({
    where: { code_semesterId: { code: 'CI-1101', semesterId: semester.id } },
    update: {},
    create: {
      code: 'CI-1101',
      name: 'Introducción a la Computación',
      semesterId: semester.id,
      professorId: profesor.id,
      maxExtraCredits: 2.0,
      optedIn: true,
    },
  });

  const curso2 = await prisma.course.upsert({
    where: { code_semesterId: { code: 'CI-1200', semesterId: semester.id } },
    update: {},
    create: {
      code: 'CI-1200',
      name: 'Programación I',
      semesterId: semester.id,
      professorId: profesor.id,
      maxExtraCredits: 1.5,
      optedIn: true,
    },
  });
  console.log('  ✅ Cursos (2): CI-1101, CI-1200');

  // ─── Matrículas ───
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: estudiante.id, courseId: curso1.id } },
    update: {},
    create: { studentId: estudiante.id, courseId: curso1.id },
  });
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: estudiante.id, courseId: curso2.id } },
    update: {},
    create: { studentId: estudiante.id, courseId: curso2.id },
  });
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: estudiante2.id, courseId: curso1.id } },
    update: {},
    create: { studentId: estudiante2.id, courseId: curso1.id },
  });
  console.log('  ✅ Matrículas (3)');

  // ─── Estudio de ejemplo ───
  const study = await prisma.study.upsert({
    where: { id: 'seed-study-1' },
    update: {},
    create: {
      id: 'seed-study-1',
      title: 'Usabilidad de Interfaces en Dispositivos Móviles',
      description: 'Estudio sobre la usabilidad de diferentes patrones de interfaz en aplicaciones móviles. Los participantes realizarán tareas simuladas en un prototipo y responderán un cuestionario posterior.',
      principalInvestigatorId: investigadorPI.id,
      semesterId: semester.id,
      creditsWorth: 1.0,
      estimatedDuration: 45,
      location: 'Laboratorio ECCI-204',
      status: 'ACTIVE',
      approvedById: admin.id,
      approvedAt: new Date(),
    },
  });
  console.log('  ✅ Estudio de ejemplo: "Usabilidad de Interfaces"');

  // ─── Colaborador ───
  await prisma.studyCollaborator.upsert({
    where: { studyId_userId: { studyId: study.id, userId: investigadorIE.id } },
    update: {},
    create: { studyId: study.id, userId: investigadorIE.id },
  });
  console.log('  ✅ Colaborador IE asignado');

  // ─── Prescreen ───
  const existingQuestions = await prisma.prescreenQuestion.findMany({
    where: { studyId: study.id },
  });

  if (existingQuestions.length === 0) {
    await prisma.prescreenQuestion.create({
      data: {
        studyId: study.id,
        questionText: '¿Tiene experiencia usando aplicaciones móviles regularmente?',
        requiredAnswer: true,
        orderIndex: 0,
      },
    });
    await prisma.prescreenQuestion.create({
      data: {
        studyId: study.id,
        questionText: '¿Tiene alguna discapacidad visual no corregida?',
        requiredAnswer: false,
        orderIndex: 1,
      },
    });
  }
  console.log('  ✅ Preguntas de preselección (2)');

  // ─── Timeslots ───
  const existingTimeslots = await prisma.timeslot.findMany({
    where: { studyId: study.id },
  });

  if (existingTimeslots.length === 0) {
    const baseDate = new Date('2026-04-01T09:00:00');
    for (let i = 0; i < 5; i++) {
      const startTime = new Date(baseDate);
      startTime.setDate(startTime.getDate() + i);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45);

      await prisma.timeslot.create({
        data: {
          studyId: study.id,
          createdById: investigadorPI.id,
          startTime,
          endTime,
          maxParticipants: 3,
          location: 'Laboratorio ECCI-204',
          status: 'AVAILABLE',
        },
      });
    }
  }
  console.log('  ✅ Timeslots (5): 1-5 abril 2026');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Usuarios de prueba (contraseña: Sirope2026!):');
  console.log('   admin@ucr.ac.cr       — Administrador');
  console.log('   profesor@ucr.ac.cr    — Profesor');
  console.log('   investigador@ucr.ac.cr — Investigador Principal');
  console.log('   ejecutor@ucr.ac.cr    — Investigador Ejecutor');
  console.log('   estudiante@ucr.ac.cr  — Estudiante (B90000)');
  console.log('   estudiante2@ucr.ac.cr — Estudiante (B90001)');
  await prisma.$disconnect();
}

main()
  .catch(async (error: unknown) => {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  });
