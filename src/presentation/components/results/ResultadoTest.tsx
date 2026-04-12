import React from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChainScore } from '../../../domain/biomechanics';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308'];

export const ResultadoTest: React.FC = () => {
  const currentPatient = useAppStore((s) => s.currentPatient);
  const analysisResults = useAppStore((s) => s.analysisResults);

  const latest = analysisResults[analysisResults.length - 1];

  return (
    <div className="clinical-card p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Resumen del test integrado</h2>
          <p className="text-xs text-slate-400">
            Paso 5 de 5 · Consolidado de huella plantar (futuro), ángulo tibiofemoral y cadenas miofasciales.
          </p>
        </div>
        {currentPatient && (
          <div className="text-xs text-slate-300">
            <p className="font-semibold">{currentPatient.nombre}</p>
            <p>
              {currentPatient.edad} años · {currentPatient.sexo} · {currentPatient.pesoKg} kg · {currentPatient.estaturaM} m
            </p>
          </div>
        )}
      </div>

      {!latest ? (
        <p className="text-xs text-slate-400">Aún no hay un análisis guardado para mostrar.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {latest.tibiofemoral && (
                <div className="clinical-card p-3 space-y-1">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Ángulo tibiofemoral</p>
                  <p className="text-base font-semibold">
                    {latest.tibiofemoral.angleDeg.toFixed(1)}°
                    <span className="ml-2 text-xs text-slate-400">{latest.tibiofemoral.classification}</span>
                  </p>
                </div>
              )}
              {latest.chainScores.map((score: ChainScore) => (
                <div key={score.chain} className="clinical-card p-3 space-y-1">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Cadena de {score.chain}</p>
                  <p className="text-base font-semibold text-clinical-primarySoft">{score.percentage}%</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="clinical-button-primary text-xs mt-2"
              onClick={() => {
                if (!latest) return;
                window.open(`/api/reports/${latest.studyUID.value}/pdf`, '_blank');
              }}
            >
              Generar reporte PDF
            </button>
          </div>

          <div className="h-56 clinical-card p-3">
            <p className="text-xs text-slate-300 mb-2">Distribución de cadenas musculares</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={latest.chainScores}
                  dataKey="percentage"
                  nameKey="chain"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {latest.chainScores.map((entry: ChainScore, index: number) => (
                    <Cell key={entry.chain} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#1f2937',
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
