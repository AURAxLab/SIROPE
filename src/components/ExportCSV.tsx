/**
 * SIROPE — ExportCSV
 * Botón reutilizable para exportar datos a CSV con toast de éxito.
 */

'use client';

import { useTransition } from 'react';
import { exportParticipationsCSV, exportCourseCreditsCSV } from '@/app/actions/admin';
import { useToast } from '@/components/Toast';

interface ExportCSVProps {
  type: 'participations' | 'credits';
  semesterId?: string;
  studyId?: string;
  courseId?: string;
  label?: string;
}

export default function ExportCSV({ type, semesterId, studyId, courseId, label }: ExportCSVProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleExport() {
    startTransition(async () => {
      let result;
      if (type === 'participations') {
        result = await exportParticipationsCSV({ semesterId, studyId, courseId });
      } else {
        result = await exportCourseCreditsCSV(courseId);
      }

      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sirope_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('📥 Archivo CSV descargado con éxito', 'success');
      } else {
        toast(result.error || 'Error al exportar', 'error');
      }
    });
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={isPending}>
      {isPending ? '⏳ Exportando...' : label || '📥 Exportar CSV'}
    </button>
  );
}
