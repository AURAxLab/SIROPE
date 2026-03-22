# SIROPE — Guías por Rol

> **SIROPE** — Sistema de Registro Optativo de Participantes de Estudios
> Autor: Alexander Barquero Elizondo, Ph.D.

---

## 📊 Administrador (ADMIN)

### Responsabilidades
- Configurar la institución y parámetros del sistema
- Gestionar usuarios y semestres
- Aprobar/rechazar estudios de investigación
- Auditar actividad del sistema
- Exportar reportes

### Flujo de trabajo
1. **Configurar semestre** → Admin > Semestres > Nuevo semestre
2. **Revisar aprobaciones** → Dashboard muestra estudios pendientes → Revisar → Aprobar/Rechazar
3. **Gestionar usuarios** → Admin > Usuarios → Crear, desactivar, cambiar roles
4. **Auditar** → Admin > Auditoría → Filtrar por fecha, usuario, acción
5. **Exportar** → Admin > Reportes → Descargar CSV

### Permisos (9)
`MANAGE_SEMESTERS`, `MANAGE_USERS`, `MANAGE_SYSTEM_CONFIG`, `MANAGE_INSTITUTION`, `APPROVE_STUDIES`, `VIEW_AUDIT_LOG`, `CREATE_COURSE`, `VIEW_COURSE_CREDITS`, `EXPORT_REPORTS`

---

## 📚 Profesor (PROFESOR)

### Responsabilidades
- Crear y configurar cursos
- Habilitar créditos de investigación (opt-in)
- Definir máximo de créditos extra por curso
- Ver créditos asignados por estudiantes

### Flujo de trabajo
1. **Crear curso** → Profesor > Mis Cursos > Nuevo Curso
2. **Activar opt-in** → Editar curso → Marcar "Acepta créditos de investigación"
3. **Configurar máximo** → Definir cuántos créditos extra acepta el curso (0-10)
4. **Verificar créditos** → Profesor > Créditos → Ver asignaciones por estudiante
5. **Exportar** → Descargar CSV de créditos por curso

### Permisos (4)
`CREATE_COURSE`, `EDIT_OWN_COURSE`, `VIEW_COURSE_CREDITS`, `EXPORT_REPORTS`

---

## 🔬 Investigador Principal (INV_PRINCIPAL)

### Responsabilidades
- Crear y gestionar estudios de investigación
- Configurar preguntas de preselección
- Agregar colaboradores (Investigadores Ejecutores)
- Crear timeslots e importar desde Excel
- Marcar completitud de participantes

### Flujo de trabajo
1. **Crear estudio** → Investigador > Nuevo Estudio (estado: BORRADOR)
2. **Configurar prescreen** → Agregar preguntas Sí/No de elegibilidad
3. **Agregar colaboradores** → Investigador > Colaboradores > Buscar IE
4. **Enviar a aprobación** → El estudio pasa a PENDING_APPROVAL
5. *(Admin aprueba)* → Estado cambia a ACTIVE
6. **Crear timeslots** → Manualmente o importar Excel
7. **Marcar asistencia** → Después del timeslot: COMPLETED o NO_SHOW
8. **(Opcional) Cerrar estudio** → ACTIVE → CLOSED

### Formato Excel para importación
| Columna | Tipo | Ejemplo |
|---|---|---|
| `fecha` | Texto (YYYY-MM-DD) | `2026-04-01` |
| `horaInicio` | Texto (HH:MM) | `09:00` |
| `horaFin` | Texto (HH:MM) | `10:00` |
| `maxParticipantes` | Número (1-500) | `5` |
| `ubicacion` | Texto (opcional) | `Lab ECCI-204` |

### Permisos (12)
`CREATE_STUDY`, `EDIT_OWN_STUDY`, `DELETE_OWN_STUDY`, `SUBMIT_STUDY_FOR_APPROVAL`, `MANAGE_COLLABORATORS`, `CONFIGURE_PRESCREEN`, `CREATE_TIMESLOT`, `EDIT_TIMESLOT`, `IMPORT_TIMESLOTS`, `VIEW_ENROLLED_PARTICIPANTS`, `MARK_COMPLETION`, `BULK_MARK_COMPLETION`

---

## 🤝 Investigador Ejecutor (INV_EJECUTOR)

### Responsabilidades
- Colaborar en estudios asignados por el IP
- Crear y gestionar timeslots
- Ver participantes inscritos
- Marcar completitud

### Flujo de trabajo
1. *(IP lo agrega como colaborador)*
2. **Ver estudios** → Investigador > Estudios asignados
3. **Crear timeslots** → Investigador > Timeslots > Nuevo
4. **Ver inscritos** → Ver lista de participantes por timeslot
5. **Marcar asistencia** → COMPLETED o NO_SHOW

### Permisos (6)
`CREATE_TIMESLOT`, `EDIT_TIMESLOT`, `IMPORT_TIMESLOTS`, `VIEW_ENROLLED_PARTICIPANTS`, `MARK_COMPLETION`, `BULK_MARK_COMPLETION`

---

## 🎓 Estudiante (ESTUDIANTE)

### Responsabilidades
- Explorar estudios disponibles
- Completar cuestionarios de preselección
- Inscribirse en timeslots
- Asignar créditos ganados a cursos

### Flujo de trabajo
1. **Explorar estudios** → Estudiante > Estudios → Ver activos del semestre
2. **Completar prescreen** → Responder preguntas de elegibilidad
3. **Inscribirse** → Seleccionar timeslot disponible → Inscribirse
4. *(Recibir confirmación por email + recordatorio 24h antes)*
5. **Asistir** al estudio en la fecha y hora indicada
6. *(IP/IE marca completitud)*
7. **Asignar créditos** → Estudiante > Créditos → Seleccionar curso → Asignar

### Límites de créditos
- **Por estudio**: según créditos definidos por el IP
- **Por curso**: según máximo configurado por el profesor
- **Por semestre**: según máximo del sistema (configurable, default: 4)

### Permisos (7)
`BROWSE_STUDIES`, `ANSWER_PRESCREEN`, `SIGN_UP_TIMESLOT`, `CANCEL_SIGN_UP`, `JOIN_WAITLIST`, `ASSIGN_CREDITS`, `VIEW_OWN_HISTORY`

---

## 📊 ITI / Administrador de Sistemas

### Responsabilidades (no es un rol del sistema)
El personal de TI se encarga de:
- Desplegar la aplicación (ver [DEPLOY.md](./DEPLOY.md))
- Configurar variables de entorno y HTTPS
- Gestionar respaldos de la base de datos
- Configurar el cron de recordatorios
- Monitorear logs del servidor

### Tareas frecuentes
| Tarea | Comando |
|---|---|
| Respaldo de BD | `cp prisma/dev.db backups/sirope-$(date +%Y%m%d).db` |
| Ver logs | `npm start 2>&1 \| tee -a /var/log/sirope.log` |
| Actualizar | `git pull && npm install && npx prisma db push && npm run build` |
| Ejecutar tests | `npx vitest run` |
