/**
 * SIROPE — CourseActions
 * Toggle opt-in para cursos del profesor.
 */

'use client';

import { useTransition } from 'react';
import { updateCourse } from '@/app/actions/courses';

interface CourseActionsProps {
  courseId: string;
  optedIn: boolean;
}

export default function CourseActions({ courseId, optedIn }: CourseActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await updateCourse(courseId, { optedIn: !optedIn });
      window.location.reload();
    });
  }

  return (
    <button
      className={`btn ${optedIn ? 'btn-secondary' : 'btn-primary'} btn-sm`}
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? 'Actualizando...' : optedIn ? '⏸ Desactivar SIROPE' : '✅ Activar SIROPE'}
    </button>
  );
}
