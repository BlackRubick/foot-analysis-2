
import React, { useEffect, useRef, useState } from 'react';
import { computeTibiofemoralAngle, AnatomicalPoint, TibiofemoralAngleResult } from '../../../domain/biomechanics';
import { mediaPipeVisionAnalyzer } from '../../../infrastructure/vision/mediapipeClient';

interface KneeAngleAnalysisProps {
  imageUrl?: string;
  onSave: (resultData: any) => void;
}

const MarkerCanvas: React.FC<{
  imageUrl: string;
  initialPoints?: AnatomicalPoint[];
  onTibiofemoralComputed: (result: TibiofemoralAngleResult) => void;
}> = ({ imageUrl, initialPoints, onTibiofemoralComputed }) => {
  const [points, setPoints] = useState<AnatomicalPoint[]>([]);

  useEffect(() => {
    if (initialPoints && !points.length) {
      setPoints(initialPoints);
      if (initialPoints.length >= 3) {
        const [hip, knee, ankle] = initialPoints;
        const result = computeTibiofemoralAngle({ hip, knee, ankle });
        onTibiofemoralComputed(result);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoints]);

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const labels = ['cadera', 'rodilla', 'tobillo'];
    const nextLabel = labels[Math.min(points.length, labels.length - 1)];

    const newPoints = [...points, { label: nextLabel, x, y }];
    setPoints(newPoints);

    if (newPoints.length >= 3) {
      const [hip, knee, ankle] = newPoints;
      const result = computeTibiofemoralAngle({ hip, knee, ankle });
      onTibiofemoralComputed(result);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-black aspect-[3/4]"
      onClick={handleClick}
    >
      <img src={imageUrl} alt="Estudio" className="h-full w-full object-contain" />
      <svg className="absolute inset-0 h-full w-full">
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x * 100 + '%'} cy={p.y * 100 + '%'} r={4} fill="#0ea5e9" />
            <text x={p.x * 100 + '%'} y={p.y * 100 + '%'} dy={-6} fontSize={10} fill="#e5e7eb">
              {p.label}
            </text>
          </g>
        ))}
        {points.length >= 3 && (() => {
          const [hip, knee, ankle] = points;
          const kx = knee.x * 100;
          const ky = knee.y * 100;

          const hipX = hip.x * 100;
          const hipY = hip.y * 100;
          const ankleX = ankle.x * 100;
          const ankleY = ankle.y * 100;

          const angleRes = computeTibiofemoralAngle({ hip, knee, ankle });
          const angleDeg = angleRes.angleDeg;

          const a1 = Math.atan2(hipY - ky, hipX - kx);
          const a2 = Math.atan2(ankleY - ky, ankleX - kx);
          let diff = a2 - a1;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;
          const sweep = diff > 0 ? 1 : 0;
          const radius = 8;

          const startX = kx + radius * Math.cos(a1);
          const startY = ky + radius * Math.sin(a1);
          const endX = kx + radius * Math.cos(a2);
          const endY = ky + radius * Math.sin(a2);

          const midAngle = a1 + diff / 2;
          const labelRadius = radius + 4;
          const labelX = kx + labelRadius * Math.cos(midAngle);
          const labelY = ky + labelRadius * Math.sin(midAngle);

          return (
            <>
              <line x1={hipX + '%'} y1={hipY + '%'} x2={kx + '%'} y2={ky + '%'} stroke="#22c55e" strokeWidth={2} />
              <line x1={kx + '%'} y1={ky + '%'} x2={ankleX + '%'} y2={ankleY + '%'} stroke="#22c55e" strokeWidth={2} />
              <path d={`M ${startX},${startY} A ${radius},${radius} 0 ${largeArc} ${sweep} ${endX},${endY}`} fill="none" stroke="#f97316" strokeWidth={1.5} />
              <text x={labelX} y={labelY} fontSize={9} fill="#fde68a" stroke="#111827" strokeWidth={0.25}>
                {angleDeg.toFixed(1)}°
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
};

export const KneeAngleAnalysis: React.FC<KneeAngleAnalysisProps> = ({ imageUrl, onSave }) => {
  const [angleInfo, setAngleInfo] = useState<string>('Sin medición angular de rodilla todavía.');
  const [tibioResult, setTibioResult] = useState<TibiofemoralAngleResult | undefined>();
  const [autoKneePoints, setAutoKneePoints] = useState<AnatomicalPoint[] | undefined>();
  const imageRef = useRef<HTMLImageElement | null>(null);

  const runAutomaticKneeAnalysis = async () => {
    if (!imageRef.current) return;
    const auto = await mediaPipeVisionAnalyzer.analyzeLowerLimbFromImage(imageRef.current);
    if (auto.hip && auto.knee && auto.ankle) {
      const hip: AnatomicalPoint = { label: 'cadera', x: auto.hip.x, y: auto.hip.y };
      const knee: AnatomicalPoint = { label: 'rodilla', x: auto.knee.x, y: auto.knee.y };
      const ankle: AnatomicalPoint = { label: 'tobillo', x: auto.ankle.x, y: auto.ankle.y };
      const result = computeTibiofemoralAngle({ hip, knee, ankle });
      setAutoKneePoints([hip, knee, ankle]);
      setTibioResult(result);
      setAngleInfo(
        `Ángulo tibiofemoral (automático): ${result.angleDeg.toFixed(1)}° · ${
          result.classification === 'normal'
            ? 'Normal (dentro del rango fisiológico)'
            : result.classification === 'valgo'
            ? 'Valgo (rodilla hacia adentro: ángulo aumentado)'
            : 'Varo (rodilla hacia afuera: ángulo disminuido)'
        }`
      );
    } else {
      setAutoKneePoints(undefined);
      setTibioResult(undefined);
      setAngleInfo('No se pudieron detectar automáticamente los puntos de cadera, rodilla y tobillo. Marque los puntos manualmente en la imagen.');
    }
  };

  useEffect(() => {
    if (imageUrl && imageRef.current) {
      runAutomaticKneeAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div className="grid gap-4 md:grid-cols-5 md:items-start">
      <div className="md:col-span-3">
        <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center h-[90vh] max-h-[980px]">
          {imageUrl ? (
            <>
              <MarkerCanvas
                imageUrl={imageUrl}
                initialPoints={autoKneePoints}
                onTibiofemoralComputed={(result) => {
                  setTibioResult(result);
                  setAngleInfo(
                    `Ángulo tibiofemoral: ${result.angleDeg.toFixed(1)}° · ${
                      result.classification === 'normal'
                        ? 'Normal'
                        : result.classification === 'valgo'
                        ? 'Valgo'
                        : 'Varo'
                    }`
                  );
                }}
              />
              {/* Imagen oculta para MediaPipe */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Estudio para MediaPipe"
                className="hidden"
                onLoad={runAutomaticKneeAnalysis}
              />
            </>
          ) : (
            <div className="flex-1 px-4 py-8 text-center text-xs text-slate-500">
              No hay imagen capturada para esta vista en el estudio actual.
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3 md:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-clinical-primary/10 text-[10px] font-semibold text-clinical-primary">
              TF
            </div>
            <div className="space-y-0.5">
              <p className="font-medium text-slate-800 dark:text-slate-100">Resultado ángulo tibiofemoral</p>
              <p className="text-slate-700 dark:text-slate-300">{angleInfo}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <button
            type="button"
            className="clinical-button-primary mb-2 text-xs"
            onClick={runAutomaticKneeAnalysis}
          >
            Recalcular ángulo automáticamente
          </button>
          <p className="font-medium">Cómo se calcula el ángulo de rodilla</p>
          <p>
            Se trazan dos segmentos: cadera-rodilla (fémur) y rodilla-tobillo (tibia). El arco naranja alrededor de la rodilla
            representa el ángulo tibiofemoral mostrado en grados.
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Guardar resultados del análisis actual</p>
            <p className="text-slate-600 dark:text-slate-400">
              Se almacenarán los resultados automáticos de la vista seleccionada (ángulo tibiofemoral) para el estudio activo.
            </p>
          </div>
          <button type="button" className="clinical-button-primary text-xs" onClick={() => onSave({ tibiofemoral: tibioResult })}>
            Guardar estudio
          </button>
        </div>
      </div>
    </div>
  );
};
