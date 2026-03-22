/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Layout Raíz — Estructura base de la aplicación
 * Carga la tipografía Inter de Google Fonts y aplica el tema oscuro.
 */

import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'SIROPE — Sistema de Registro Optativo de Participantes de Estudios',
  description:
    'Plataforma para gestionar la participación de estudiantes en estudios de investigación y la asignación de créditos extra.',
};

/**
 * Layout raíz que envuelve toda la aplicación.
 * Aplica Inter como tipografía principal y dark mode por defecto.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
