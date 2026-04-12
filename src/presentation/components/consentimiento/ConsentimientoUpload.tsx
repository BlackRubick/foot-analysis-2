import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppStore } from '../../hooks/useAppStore';

export const ConsentimientoUpload: React.FC = () => {
  const currentPatient = useAppStore((s) => s.currentPatient);
  const consentUploaded = useAppStore((s) => s.consentUploaded);
  const setConsentUploaded = useAppStore((s) => s.setConsentUploaded);
   const currentStudyUID = useAppStore((s) => s.currentStudyUID);
  const startStudy = useAppStore((s) => s.startStudy);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!currentPatient || !file) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta información',
        text: 'Registre un paciente y seleccione un archivo antes de subir.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', currentPatient.id.value);

      const response = await fetch('/api/consents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo subir el consentimiento');
      }

      setConsentUploaded(true);
      await Swal.fire({
        icon: 'success',
        title: 'Consentimiento cargado',
        text: 'El consentimiento informado se guardó correctamente.',
        confirmButtonColor: '#0ea5e9',
      });
      // Si aún no hay estudio activo (por ejemplo, venimos de un paciente existente sin consentimiento),
      // creamos ahora el estudio y luego pasamos a captura.
      if (!currentStudyUID) {
        try {
          const studyResponse = await fetch('/api/studies/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId: currentPatient.id.value }),
          });

          const studyData = await studyResponse.json().catch(() => ({}));

          if (!studyResponse.ok) {
            throw new Error(studyData.message ?? 'No se pudo iniciar el estudio después de cargar el consentimiento');
          }

          startStudy({ value: studyData.studyUID });
        } catch (e: any) {
          await Swal.fire({
            icon: 'error',
            title: 'Error al iniciar estudio',
            text: e?.message ?? 'Se cargó el consentimiento, pero no se pudo iniciar el estudio automáticamente.',
            confirmButtonColor: '#ef4444',
          });
          return;
        }
      }

      navigate('/capture');
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al subir',
        text: error?.message ?? 'Ocurrió un error al subir el consentimiento.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const disabled = !currentPatient;

  return (
    <div className="clinical-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Consentimiento informado</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Paso 2 de 5 · Es obligatorio contar con consentimiento antes de realizar el análisis.
          </p>
        </div>
        <span
          className={`clinical-badge text-[10px] uppercase ${
            consentUploaded ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/40 text-amber-300'
          }`}
        >
          {consentUploaded ? 'Consentimiento cargado' : 'Pendiente'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <p className="text-slate-800 dark:text-slate-200">Suba un archivo PDF o imagen del consentimiento firmado.</p>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={disabled}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-800 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:text-slate-800 disabled:opacity-50 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-100"
        />
        {disabled && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Registre un paciente antes de adjuntar el consentimiento.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="clinical-button-primary text-xs"
          onClick={handleUpload}
          disabled={disabled || !file || isUploading}
        >
          {isUploading ? 'Subiendo…' : 'Subir consentimiento'}
        </button>
      </div>
    </div>
  );
};
