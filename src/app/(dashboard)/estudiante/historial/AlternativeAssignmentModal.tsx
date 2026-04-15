'use client';

import { useState, useTransition } from 'react';
import { submitAlternativeAssignment } from '@/app/actions/policies';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface Props {
  courses: CourseOption[];
}

export default function AlternativeAssignmentModal({ courses }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [description, setDescription] = useState('');
  const [credits, setCredits] = useState<number>(1);

  if (courses.length === 0) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || description.trim().length < 20) {
      toast('La descripción debe tener al menos 20 caracteres', 'error');
      return;
    }

    startTransition(async () => {
      const res = await submitAlternativeAssignment({
        courseId,
        description,
        credits: Number(credits)
      });
      
      if (res.success) {
        toast('Asignación alternativa enviada correctamente', 'success');
        setIsOpen(false);
        setDescription('');
        router.refresh();
      } else {
        toast(res.error || 'Error al enviar la solicitud', 'error');
      }
    });
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setIsOpen(true)}>
        📝 Enviar Asignación Alternativa
      </button>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Asignación Alternativa</h3>
              <button 
                className="modal-close" 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                Si tienes objeciones para participar en estudios, puedes enviar un trabajo alternativo (ej. un ensayo) para ganar créditos. El profesor de tu grupo debe revisarlo.
              </div>

              <div className="form-group">
                <label className="form-label">Curso destino</label>
                <select 
                  className="form-input" 
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  disabled={isPending}
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Créditos solicitados</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={credits}
                  onChange={e => setCredits(parseFloat(e.target.value))}
                  disabled={isPending}
                  min={0.5}
                  max={5}
                  step={0.5}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción del Ensayo / Trabajo o Enlace</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isPending}
                  placeholder="Describe de qué trató tu ensayo o pega el enlace al documento (min 20 caracteres)..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isPending}
                >
                  {isPending ? 'Enviando...' : 'Enviar a Revisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
