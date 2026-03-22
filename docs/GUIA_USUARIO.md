# SIROPE — Guía de Usuario

> **SIROPE** — Sistema de Registro Optativo de Participantes de Estudios
> Autor: Alexander Barquero Elizondo, Ph.D.

---

## 🚀 Inicio Rápido

### ¿Qué es SIROPE?

SIROPE es una plataforma web donde **estudiantes universitarios** pueden inscribirse como participantes en **estudios de investigación** y recibir **créditos extra** a cambio. El sistema conecta investigadores, profesores, estudiantes y administración en un flujo automatizado y auditable.

### Primer Login

1. Abra el navegador y visite la URL de SIROPE proporcionada por su administrador
2. Ingrese su correo institucional y contraseña
3. El sistema lo redirige automáticamente a su dashboard correspondiente según su rol

> 💡 Si es la primera vez y el administrador activó LDAP, use sus credenciales institucionales.

---

## 🎓 Si eres Estudiante

### Explorar estudios
1. Vaya a **Estudios** en el menú lateral
2. Vea los estudios activos del semestre actual
3. Lea los detalles: descripción, ubicación, créditos, requisitos

### Inscribirse
1. Abra un estudio → **Ver horarios disponibles**
2. Si hay preguntas de preselección, respóndalas honestamente
3. Seleccione un horario con cupo disponible → **Inscribirse**
4. Recibirá confirmación y un recordatorio 24h antes

### Después de participar
1. El investigador marcará su asistencia como **Completado**
2. Vaya a **Créditos** → Verá sus participaciones completadas
3. Seleccione un curso con créditos de investigación habilitados
4. Asigne los créditos ganados → El profesor podrá verlos

### Si no puede asistir
- Cancele su inscripción **antes** del horario
- Si no asiste sin cancelar, se marcará como **No Show**

---

## 📚 Si eres Profesor

### Crear un curso
1. Vaya a **Mis Cursos** → **Nuevo Curso**
2. Llene: nombre, código, semestre
3. Habilite la casilla **"Acepta créditos de investigación"**
4. Configure el máximo de créditos extra permitidos (ej: 3)

### Ver créditos asignados
1. Vaya a **Créditos** → Seleccione un curso
2. Vea la lista de estudiantes que han asignado créditos
3. Exporte a CSV para sus registros con el botón **📊 Exportar**

---

## 🔬 Si eres Investigador Principal

### Crear un estudio
1. Vaya a **Estudios** → **Nuevo Estudio**
2. Llene todos los campos obligatorios:
   - Título, descripción, créditos ofrecidos
   - Capacidad máxima, ubicación
3. El estudio se crea como **Borrador**

### Configurar preselección (opcional)
1. Abra el estudio → **Prescreen**
2. Agregue preguntas Sí/No para filtrar participantes elegibles
3. Las preguntas se presentan antes de la inscripción

### Agregar colaboradores
1. Abra el estudio → **Colaboradores**
2. Busque investigadores ejecutores por nombre o email
3. Los colaboradores podrán crear timeslots y marcar asistencia

### Crear horarios (timeslots)
- **Manual:** Nuevo Timeslot → fecha, hora inicio/fin, capacidad, ubicación
- **Importar Excel:** Suba un archivo `.xlsx` con columnas: `fecha`, `horaInicio`, `horaFin`, `maxParticipantes`, `ubicacion`

### Enviar a aprobación
1. Cuando todo esté listo → **Enviar a aprobación**
2. El estado cambia a **Pendiente de Aprobación**
3. Un administrador revisará y aprobará/rechazará

### Marcar asistencia
1. Después del timeslot, vaya a **Participantes**
2. Marque cada participante como **Completado** o **No asistió**
3. Los estudiantes completados podrán asignar créditos

---

## 🤝 Si eres Investigador Ejecutor

Trabaja con estudios asignados por un Investigador Principal:

1. Vea sus estudios asignados en **Estudios**
2. Cree timeslots y vea participantes inscritos
3. Marque asistencia después de cada sesión

> ⚠️ No puede crear estudios nuevos ni modificar la configuración del estudio.

---

## 📊 Si eres Administrador

### Dashboard
- Métricas: usuarios activos, estudios, participaciones, créditos
- Alertas: estudios pendientes de aprobación, usuarios inactivos

### Gestión de usuarios
1. **Usuarios** → **Nuevo Usuario** → Crear con rol y email
2. Editar nombre, email, rol directamente en la tabla
3. Desactivar usuarios que ya no participan

### Semestres
1. **Semestres** → **Nuevo Semestre** → nombre, fecha inicio/fin
2. Solo puede haber un semestre activo a la vez

### Aprobaciones
1. Revise los estudios en estado **Pendiente de Aprobación**
2. Lea los detalles → **Aprobar** o **Rechazar** con justificación

### Auditoría
- Filtre por fecha, usuario, tipo de acción
- Cada registro muestra: quién, qué, cuándo, estado anterior/nuevo

### Configuración
- **Institucional**: nombre, siglas, colores, logo, zona horaria
- **Autenticación**: CREDENTIALS (local) o LDAP (directorio institucional)
- **Parámetros**: MAX_CREDITS_PER_SEMESTER, CANCELLATION_HOURS, etc.

---

## 🔔 Notificaciones

La campana (🔔) en la barra lateral muestra alertas contextuales por rol:

| Rol | Notificaciones |
|---|---|
| Admin | Estudios pendientes, usuarios inactivos, sin semestre activo |
| Profesor | Asignaciones alternativas pendientes |
| Estudiante | Participaciones próximas, créditos sin asignar |
| Investigador | Estudios sin timeslots |

---

## ❓ Preguntas Frecuentes

**¿Puedo cancelar después de inscribirme?**
Sí, hasta antes del horario. Vaya a Inscripciones → Cancelar.

**¿Qué pasa si no asisto?**
Se marca como No Show. Esto queda en su historial pero no genera penalización automática.

**¿Cuántos créditos puedo obtener?**
Depende de 3 límites: por estudio (lo define el investigador), por curso (lo define el profesor), y por semestre (lo define el sistema).

**¿Cómo cambio mi contraseña?**
Contacte al administrador. Si el sistema usa LDAP, cambie la contraseña en su directorio institucional.

**¿Los datos son seguros?**
Sí. SIROPE usa cifrado bcrypt para contraseñas, validación en servidor, y un sistema de auditoría que registra todas las acciones.
