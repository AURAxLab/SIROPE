/**
 * SIROPE — CourseStudents
 * Vista expandible de estudiantes inscritos en un curso.
 */

'use client';

import { useState, useTransition } from 'react';

interface CourseStudentsProps {
  courseId: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  credits: number;
  participationCount: number;
}

export default function CourseStudents({ courseId }: CourseStudentsProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  function handleToggle() {
    if (!expanded && !loaded) {
      startTransition(async () => {
        const res = await fetch(`/api/course-students?courseId=${courseId}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
          setLoaded(true);
        }
      });
    }
    setExpanded(!expanded);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? '⏳ Cargando...' : expanded ? '▲ Ocultar estudiantes' : '▼ Ver estudiantes'}
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {students.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '8px 0' }}>
              No hay estudiantes inscritos en este curso.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Correo</th>
                    <th>Carné</th>
                    <th>Participaciones</th>
                    <th>Créditos</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.email}</td>
                      <td style={{ fontFamily: 'monospace' }}>{s.studentId || '—'}</td>
                      <td>{s.participationCount}</td>
                      <td>
                        <span className={`badge ${s.credits > 0 ? 'badge-success' : 'badge-neutral'}`}>
                          {s.credits}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
