/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * API Route — Cron de Recordatorios
 * Endpoint protegido por token secreto para procesamiento periódico.
 * Diseñado para ser invocado cada hora por un cron externo o
 * un servicio como Vercel Cron o similar.
 *
 * Ejemplo de invocación:
 *   curl -X POST https://sirope.example.com/api/cron/reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextResponse } from 'next/server';
import { processReminders } from '@/app/actions/notifications';

/**
 * POST /api/cron/reminders
 * Procesa y envía recordatorios de participaciones próximas.
 * Requiere token de autorización para evitar acceso no autorizado.
 */
export async function POST(request: Request) {
  // Verificar token de autorización
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const result = await processReminders();

  return NextResponse.json({
    success: result.success,
    data: result.data,
    timestamp: new Date().toISOString(),
  });
}
