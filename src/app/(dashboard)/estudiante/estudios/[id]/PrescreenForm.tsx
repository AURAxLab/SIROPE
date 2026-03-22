/**
 * SIROPE — PrescreenForm
 * Formulario de preselección interactivo para estudios.
 */

'use client';

import { useState, useTransition } from 'react';
import { submitPrescreenAnswers } from '@/app/actions/prescreen';

interface Question {
  id: string;
  questionText: string;
  requiredAnswer: boolean;
}

interface PrescreenFormProps {
  questions: Question[];
  studentId: string;
  studyId: string;
}

/**
 * Formulario de prescreen con botones Sí/No por pregunta.
 */
export default function PrescreenForm({ questions, studentId, studyId }: PrescreenFormProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const allAnswered = Object.keys(answers).length === questions.length;

  function handleAnswer(questionId: string, answer: boolean) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function handleSubmit() {
    startTransition(async () => {
      setError('');
      const formattedAnswers = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? false,
      }));

      const result = await submitPrescreenAnswers(studyId, formattedAnswers);

      if (!result.success) {
        setError(result.error || 'Error al enviar respuestas');
      } else {
        // Recargar la página para mostrar elegibilidad
        window.location.reload();
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => (
          <div
            key={q.id}
            style={{
              padding: 16,
              background: 'var(--surface-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-border)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 10 }}>
              {i + 1}. {q.questionText}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn ${answers[q.id] === true ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleAnswer(q.id, true)}
              >
                ✅ Sí
              </button>
              <button
                type="button"
                className={`btn ${answers[q.id] === false ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                onClick={() => handleAnswer(q.id, false)}
              >
                ❌ No
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: 20, width: '100%' }}
        disabled={!allAnswered || isPending}
        onClick={handleSubmit}
      >
        {isPending ? 'Verificando...' : 'Verificar Elegibilidad'}
      </button>
    </div>
  );
}
