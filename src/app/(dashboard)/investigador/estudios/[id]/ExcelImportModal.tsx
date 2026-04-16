'use client';

import { useState, useTransition, useRef } from 'react';
import { importTimeslots } from '@/app/actions/timeslots';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';

interface Props {
  studyId: string;
}

export default function ExcelImportModal({ studyId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<{ created: number; errors: string[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast('Por favor selecciona un archivo .xlsx válido', 'error');
      return;
    }
    setSelectedFile(file);
    setImportSummary(null);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['fecha', 'horaInicio', 'horaFin', 'maxParticipantes', 'ubicacion'],
      ['2026-05-10', '08:00', '09:00', 5, 'Laboratorio B'],
      ['2026-05-11', '14:30', '15:30', 2, 'Cámara Gesell'],
      ['NOTA FORMATO:', 'Usar formato de 24h para las horas (ej: 14:30). Las fechas preferiblemente YYYY-MM-DD o DD/MM/YYYY.', '', '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Column widths
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Horarios');
    XLSX.writeFile(wb, 'plantilla_horarios.xlsx');
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    startTransition(async () => {
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // raw: false fuerza a SheetJS a exportar el "texto visible" (formato) en vez 
        // de los seriales numéricos de Excel (ej: 46152), protegiendo contra el encoding tico.
        const rows = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '', 
          raw: false, 
          dateNF: 'yyyy-mm-dd' 
        }) as Array<any>;
        
        if (rows.length === 0) {
          toast('El archivo está vacío.', 'error');
          return;
        }

        // Remap to expected schema types
        const payload = rows.flatMap((r) => {
          let fecha = String(r.fecha || '').trim();
          let horaInicio = String(r.horaInicio || '').trim();
          let horaFin = String(r.horaFin || '').trim();

          // Ignorar fila de notas si el usuario no la borró
          if (fecha.includes('NOTA FORMATO')) return [];
          
          // Arreglo tico: Si Excel forzó un formato DD/MM/YYYY, convertirlo a YYYY-MM-DD
          if (fecha.includes('/')) {
             const parts = fecha.split('/');
             if (parts.length === 3 && parts[2].length === 4) {
               // parts = [DD, MM, YYYY] -> YYYY-MM-DD
               fecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             }
          }
          
          // A veces las horas traen espacios invisibles o si vienen con AM/PM tratamos de filtrarlo rápido
          horaInicio = horaInicio.replace(/\s+/g, '');
          horaFin = horaFin.replace(/\s+/g, '');
          
          return [{
            fecha,
            horaInicio,
            horaFin,
            maxParticipantes: parseInt(String(r.maxParticipantes || '1'), 10),
            ubicacion: r.ubicacion ? String(r.ubicacion).trim() : undefined,
          }];
        });

        if (payload.length === 0) {
           toast('Existen problemas leyendo tu Excel, o solo contiene encabezados.', 'error');
           return;
        }

        const res = await importTimeslots(studyId, payload);
        
        if (res.success && res.data) {
          setImportSummary(res.data);
          if (res.data.created > 0) {
            toast(`⏳ Se han creado ${res.data.created} horarios con éxito.`, 'success');
            router.refresh();
          } else {
            toast('No se pudo importar ningún registro. Revisa los errores.', 'error');
          }
        } else {
          toast(res.error || 'Fallo general al procesar la importación', 'error');
        }
      } catch (err: any) {
        toast(`Error al leer archivo: ${err.message}`, 'error');
      }
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setImportSummary(null);
  };

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setIsOpen(true)}>
        <FileSpreadsheet size={16} /> Importar Excel
      </button>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Subida Masiva de Horarios</h3>
              <button className="modal-close" onClick={closeModal} disabled={isPending}>×</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div className="alert alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  Acelera la creación de horarios. Descarga la plantilla para ver el formato exacto.
                </span>
                <button type="button" onClick={downloadTemplate} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}>
                  <Download size={14} /> Plantilla
                </button>
              </div>

              {/* Uploader Box */}
              {!importSummary && (
                <div 
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--celeste-500)' : 'var(--surface-border-strong)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragActive ? 'rgba(0,192,243,0.05)' : 'var(--surface-bg)',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Upload size={32} color={dragActive ? 'var(--celeste-500)' : 'var(--text-muted)'} style={{ margin: '0 auto 12px' }} />
                  {selectedFile ? (
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--celeste-500)', margin: '0 0 4px' }}>{selectedFile.name}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Haz clic para cambiar de archivo</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        Arrastra tu .xlsx aquí o haz clic para buscar
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        Solo formatos estructurados según la plantilla
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resumen de Importación */}
              {importSummary && (
                <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: importSummary.created > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: 8, borderRadius: '50%' }}>
                      <FileSpreadsheet size={20} color={importSummary.created > 0 ? '#10b981' : '#ef4444'} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 600 }}>Carga Completada</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {importSummary.created} horarios creados exitosamente.
                      </p>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
                        Filas ignoradas o fallidas ({importSummary.errors.length}):
                      </p>
                      <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', maxHeight: 150, overflowY: 'auto' }}>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.8125rem', color: '#b91c1c' }}>
                          {importSummary.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--surface-border)' }}>
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isPending}>
                {importSummary ? 'Cerrar' : 'Cancelar'}
              </button>
              {!importSummary && selectedFile && (
                <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isPending}>
                  {isPending ? 'Procesando...' : 'Procesar Horarios'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
