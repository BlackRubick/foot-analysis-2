import React, { useEffect, useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { httpClient } from '../../infrastructure/httpClient';

interface DashboardStats {
  totalPatients: number;
  totalAnalyses: number;
  analysesLast7Days: number;
}

export const DashboardPage: React.FC = () => {
  const currentPatient = useAppStore((s) => s.currentPatient);
  const analysisResults = useAppStore((s) => s.analysisResults);

  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await httpClient.get<DashboardStats & { lastPatient?: unknown }>('/stats/dashboard');
        if (mounted) setStats(data);
      } catch {
        if (mounted) setStats(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="clinical-card p-4 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide dark:text-slate-400">Pacientes activos</p>
          <p className="text-2xl font-semibold text-clinical-primary">{stats?.totalPatients ?? 0}</p>
          <p className="text-[11px] text-slate-500">Total de pacientes registrados en la base de datos.</p>
        </div>
        <div className="clinical-card p-4 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide dark:text-slate-400">Estudios recientes</p>
          <p className="text-2xl font-semibold text-clinical-primarySoft">{stats?.analysesLast7Days ?? 0}</p>
          <p className="text-[11px] text-slate-500">Análisis biomecánicos realizados en los últimos 7 días.</p>
        </div>
        <div className="clinical-card p-4 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide dark:text-slate-400">Flujo de trabajo</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            1. Registrar paciente · 2. Subir consentimiento · 3. Captura 3 cámaras · 4. Marcar puntos · 5. Ver resultados.
          </p>
        </div>
      </div>

      <div className="clinical-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Resumen rápido del último paciente</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Accesos rápidos al flujo clínico.</p>
        </div>
        {currentPatient ? (
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold">{currentPatient.nombre}</p>
            <p>
              {currentPatient.edad} años · {currentPatient.sexo} · {currentPatient.pesoKg} kg · {currentPatient.estaturaM} m
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-500">Aún no hay pacientes registrados en esta sesión.</p>
        )}
      </div>
    </div>
  );
};
