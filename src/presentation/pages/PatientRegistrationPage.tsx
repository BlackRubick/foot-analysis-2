import React from 'react';
import { RegistroPaciente } from '../components/registro/RegistroPaciente';
import { ConsentimientoUpload } from '../components/consentimiento/ConsentimientoUpload';
import { useAppStore } from '../hooks/useAppStore';

export const PatientRegistrationPage: React.FC = () => {
  const currentPatient = useAppStore((s) => s.currentPatient);

  return (
    <div className="space-y-4">
      {!currentPatient ? (
        <>
          <RegistroPaciente />
          <ConsentimientoUpload />
        </>
      ) : (
        <>
          <div className="clinical-card p-4 space-y-2 text-xs">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Paciente seleccionado</p>
            <p className="text-sm font-semibold">{currentPatient.nombre}</p>
            <p className="text-slate-700 dark:text-slate-300">
              {currentPatient.edad} años · {currentPatient.sexo} · {currentPatient.pesoKg} kg · {currentPatient.estaturaM} m
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-500">
              Este paciente ya existe en el sistema. Solo es necesario adjuntar el consentimiento informado.
            </p>
          </div>
          <ConsentimientoUpload />
        </>
      )}
    </div>
  );
};
