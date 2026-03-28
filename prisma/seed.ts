/**
 * SIROPE â€” Sistema de Registro Optativo de Participantes de Estudios
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
 * Crea: configuraciÃ³n institucional, configuraciÃ³n del sistema,
 * semestre, usuarios de cada rol, cursos, matrÃ­culas y un estudio de ejemplo.
 */
async function main() {
  // Prisma v7: importar dinÃ¡micamente el cliente generado (ESM)
  const { PrismaClient } = await import('../src/generated/prisma/client.js');

  // Crear adaptador SQLite y cliente Prisma
  const dbUrl = process.env.DATABASE_URL || 'file:./data/dev.db';
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  /** ContraseÃ±a por defecto para todos los usuarios de prueba. */
  const DEFAULT_PASSWORD = 'Sirope2026!';

  console.log('ðŸŒ± Iniciando seed de base de datos...');

  const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, 12);

  // â”€â”€â”€ ConfiguraciÃ³n Institucional â”€â”€â”€
  await prisma.institutionConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Escuela de Ciencias de la ComputaciÃ³n e InformÃ¡tica',
      shortName: 'ECCI',
      universityName: 'Universidad de Costa Rica',
      primaryColor: '#4F46E5',
      accentColor: '#F59E0B',
      contactEmail: 'sirope@universidad.cr',
      website: 'https://universidad.cr',
      timezone: 'America/Costa_Rica',
      studentIdLabel: 'CarnÃ©',
      authMode: 'CREDENTIALS',
      setupComplete: true,
    },
  });
  console.log('  âœ… ConfiguraciÃ³n institucional');

  // â”€â”€â”€ ConfiguraciÃ³n del Sistema â”€â”€â”€
  const systemConfigs = [
    { key: 'MAX_CREDITS_PER_SEMESTER', value: '4', description: 'MÃ¡ximo de crÃ©ditos que un estudiante puede obtener en un semestre' },
    { key: 'CANCELLATION_HOURS', value: '24', description: 'Horas mÃ­nimas antes del timeslot para cancelar sin penalizaciÃ³n' },
    { key: 'NO_SHOW_PENALTY_DAYS', value: '7', description: 'DÃ­as de bloqueo por no-show' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('  âœ… ConfiguraciÃ³n del sistema');

  // â”€â”€â”€ Semestre â”€â”€â”€
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
  console.log('  âœ… Semestre I-2026');

  // â”€â”€â”€ Usuarios â”€â”€â”€
  const admin = await prisma.user.upsert({
    where: { email: 'admin@universidad.cr' },
    update: {},
    create: {
      email: 'admin@universidad.cr',
      passwordHash,
      name: 'Ana Administradora',
      role: 'ADMIN',
      active: true,
    },
  });

  const profesor = await prisma.user.upsert({
    where: { email: 'profesor@universidad.cr' },
    update: {},
    create: {
      email: 'profesor@universidad.cr',
      passwordHash,
      name: 'Pedro Profesor',
      role: 'PROFESOR',
      active: true,
    },
  });

  const investigadorPI = await prisma.user.upsert({
    where: { email: 'investigador@universidad.cr' },
    update: {},
    create: {
      email: 'investigador@universidad.cr',
      passwordHash,
      name: 'Irene Investigadora',
      role: 'INV_PRINCIPAL',
      active: true,
    },
  });

  const investigadorIE = await prisma.user.upsert({
    where: { email: 'ejecutor@universidad.cr' },
    update: {},
    create: {
      email: 'ejecutor@universidad.cr',
      passwordHash,
      name: 'Eduardo Ejecutor',
      role: 'INV_EJECUTOR',
      active: true,
    },
  });

  const estudiante = await prisma.user.upsert({
    where: { email: 'estudiante@universidad.cr' },
    update: {},
    create: {
      email: 'estudiante@universidad.cr',
      passwordHash,
      name: 'SofÃ­a Estudiante',
      role: 'ESTUDIANTE',
      studentId: 'B90000',
      active: true,
    },
  });

  const estudiante2 = await prisma.user.upsert({
    where: { email: 'estudiante2@universidad.cr' },
    update: {},
    create: {
      email: 'estudiante2@universidad.cr',
      passwordHash,
      name: 'Carlos Estudiante',
      role: 'ESTUDIANTE',
      studentId: 'B90001',
      active: true,
    },
  });

  console.log('  âœ… Usuarios (6): admin, profesor, IP, IE, 2 estudiantes');

  // â”€â”€â”€ Cursos â”€â”€â”€
  const curso1 = await prisma.course.upsert({
    where: { code_semesterId: { code: 'CI-1101', semesterId: semester.id } },
    update: {},
    create: {
      code: 'CI-1101',
      name: 'IntroducciÃ³n a la ComputaciÃ³n',
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
      name: 'ProgramaciÃ³n I',
      semesterId: semester.id,
      professorId: profesor.id,
      maxExtraCredits: 1.5,
      optedIn: true,
    },
  });
  console.log('  âœ… Cursos (2): CI-1101, CI-1200');

  // â”€â”€â”€ MatrÃ­culas â”€â”€â”€
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
  console.log('  âœ… MatrÃ­culas (3)');

  // â”€â”€â”€ Estudio de ejemplo â”€â”€â”€
  const study = await prisma.study.upsert({
    where: { id: 'seed-study-1' },
    update: {},
    create: {
      id: 'seed-study-1',
      title: 'Usabilidad de Interfaces en Dispositivos MÃ³viles',
      description: 'Estudio sobre la usabilidad de diferentes patrones de interfaz en aplicaciones mÃ³viles. Los participantes realizarÃ¡n tareas simuladas en un prototipo y responderÃ¡n un cuestionario posterior.',
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
  console.log('  âœ… Estudio de ejemplo: "Usabilidad de Interfaces"');

  // â”€â”€â”€ Colaborador â”€â”€â”€
  await prisma.studyCollaborator.upsert({
    where: { studyId_userId: { studyId: study.id, userId: investigadorIE.id } },
    update: {},
    create: { studyId: study.id, userId: investigadorIE.id },
  });
  console.log('  âœ… Colaborador IE asignado');

  // â”€â”€â”€ Prescreen â”€â”€â”€
  const existingQuestions = await prisma.prescreenQuestion.findMany({
    where: { studyId: study.id },
  });

  if (existingQuestions.length === 0) {
    await prisma.prescreenQuestion.create({
      data: {
        studyId: study.id,
        questionText: 'Â¿Tiene experiencia usando aplicaciones mÃ³viles regularmente?',
        requiredAnswer: true,
        orderIndex: 0,
      },
    });
    await prisma.prescreenQuestion.create({
      data: {
        studyId: study.id,
        questionText: 'Â¿Tiene alguna discapacidad visual no corregida?',
        requiredAnswer: false,
        orderIndex: 1,
      },
    });
  }
  console.log('  âœ… Preguntas de preselecciÃ³n (2)');

  // â”€â”€â”€ Timeslots â”€â”€â”€
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
  console.log('  âœ… Timeslots (5): 1-5 abril 2026');

  console.log('\nðŸŽ‰ Seed completado exitosamente!');
  console.log('\nðŸ“‹ Usuarios de prueba (contraseÃ±a: Sirope2026!):');
  console.log('   admin@universidad.cr       â€” Administrador');
  console.log('   profesor@universidad.cr    â€” Profesor');
  console.log('   investigador@universidad.cr â€” Investigador Principal');
  console.log('   ejecutor@universidad.cr    â€” Investigador Ejecutor');
  console.log('   estudiante@universidad.cr  â€” Estudiante (B90000)');
  console.log('   estudiante2@universidad.cr â€” Estudiante (B90001)');
  await prisma.$disconnect();
}

main()
  .catch(async (error: unknown) => {
    console.error('âŒ Error en seed:', error);
    process.exit(1);
  });
