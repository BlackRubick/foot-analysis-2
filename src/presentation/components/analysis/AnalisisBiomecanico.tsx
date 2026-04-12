import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CameraView } from '../../../domain/patient';
import { type AnatomicalPoint, type TibiofemoralAngleResult, computeTibiofemoralAngle } from '../../../domain/biomechanics';
import { mediaPipeVisionAnalyzer } from '../../../infrastructure/vision/mediapipeClient';
import { useAppStore } from '../../hooks/useAppStore';
import Swal from 'sweetalert2';

interface MarkerCanvasProps {
  imageUrl: string;
  view: CameraView;
  onTibiofemoralComputed: (result: ReturnType<typeof computeTibiofemoralAngle>) => void;
  initialPoints?: AnatomicalPoint[];
}

const MarkerCanvas: React.FC<MarkerCanvasProps> = ({ imageUrl, onTibiofemoralComputed, initialPoints }) => {
  const [points, setPoints] = useState<AnatomicalPoint[]>([]);

  // Si recibimos puntos iniciales (por ejemplo, de un análisis automático),
  // los usamos para prellenar el canvas cuando aún no hay puntos manuales.
  React.useEffect(() => {
    if (initialPoints && !points.length) {
      setPoints(initialPoints);
      if (initialPoints.length >= 3) {
        const [hip, knee, ankle] = initialPoints;
        const result = computeTibiofemoralAngle({ hip, knee, ankle });
        onTibiofemoralComputed(result);
      }
    }
  }, [initialPoints, points.length, onTibiofemoralComputed]);

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
          const radius = 8; // en unidades de porcentaje relativas al viewBox 0-100

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
              {/* Segmentos fémur y tibia */}
              <line
                x1={hipX + '%'}
                y1={hipY + '%'}
                x2={kx + '%'}
                y2={ky + '%'}
                stroke="#22c55e"
                strokeWidth={2}
              />
              <line
                x1={kx + '%'}
                y1={ky + '%'}
                x2={ankleX + '%'}
                y2={ankleY + '%'}
                stroke="#22c55e"
                strokeWidth={2}
              />

              {/* Arco del ángulo en la rodilla */}
              <path
                d={`M ${startX},${startY} A ${radius},${radius} 0 ${largeArc} ${sweep} ${endX},${endY}`}
                fill="none"
                stroke="#f97316"
                strokeWidth={1.5}
              />

              {/* Etiqueta con el valor del ángulo */}
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

// Para el nuevo análisis plantar, FootOverlay puede ser null o tener left/right
type FootSection = {
  heel: { x: number; y: number };
  toe2: { x: number; y: number };
  axis: { x1: number; y1: number; x2: number; y2: number };
  footLength: number;
  sections: Array<{
    name: string;
    px: number;
    py: number;
    width: number;
    left: { x: number; y: number };
    right: { x: number; y: number };
  }>;
  side: 'left' | 'right';
};
type FootOverlay = {
  left: FootSection | null;
  right: FootSection | null;
} | null;

const AnalisisBiomecanico: React.FC = () => {
  const navigate = useNavigate();
  const capturedImages = useAppStore((s) => s.capturedImages);
  const currentStudyUID = useAppStore((s) => s.currentStudyUID);
  const addAnalysisResult = useAppStore((s) => s.addAnalysisResult);

  const [selectedView, setSelectedView] = useState<CameraView>('frontal');
  const [angleInfo, setAngleInfo] = useState<string>('Sin medición angular de rodilla todavía.');
  const [tibioResult, setTibioResult] = useState<TibiofemoralAngleResult | undefined>();
  const [autoKneePoints, setAutoKneePoints] = useState<AnatomicalPoint[] | undefined>();
  const [footTypeInfo, setFootTypeInfo] = useState<string>(
    'Sin análisis de huella plantar todavía. Use la vista frontal para analizar el apoyo del pie.'
  );
  const [heelAlignmentInfo, setHeelAlignmentInfo] = useState<string>(
    'Sin análisis de calcáneo todavía. Use la vista posterior para estimar el valgo/varo.'
  );
  const [footOverlay, setFootOverlay] = useState<FootOverlay | null>(null);
  const [savedViews, setSavedViews] = useState<CameraView[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const VIEW_LABELS: Record<CameraView, string> = {
    frontal: 'Huella plantar (vista inferior)',
    sagital: 'Rodilla · ángulo tibiofemoral',
    posterior: 'Postura global / cadenas',
  };

  const imageForView = useMemo(
    () => capturedImages.find((img) => img.view === selectedView)?.url,
    [capturedImages, selectedView]
  );

  const currentResultTitle = useMemo(() => {
    if (selectedView === 'frontal') return 'Resultado huella plantar';
    if (selectedView === 'sagital') return 'Resultado ángulo tibiofemoral';
    return 'Resultado alineación de calcáneo';
  }, [selectedView]);

  const currentResultText = useMemo(() => {
    if (selectedView === 'frontal') return footTypeInfo;
    if (selectedView === 'sagital') return angleInfo;
    return heelAlignmentInfo;
  }, [selectedView, angleInfo, footTypeInfo, heelAlignmentInfo]);

  const handleSaveAnalysis = async () => {
    if (!currentStudyUID) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin estudio activo',
        text: 'Debe existir un estudio activo antes de guardar el análisis.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }
    addAnalysisResult({
      studyUID: currentStudyUID,
      view: selectedView,
      tibiofemoral: tibioResult,
      chainScores: [],
    });

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyUID: currentStudyUID.value,
          tibiofemoralAngleDeg: tibioResult?.angleDeg,
          tibiofemoralClassification: tibioResult?.classification,
          chainScores: [],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo guardar el análisis');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Análisis guardado',
        text: 'El análisis biomecánico se guardó correctamente.',
        confirmButtonColor: '#0ea5e9',
      });

      setSavedViews((prev) => {
        if (prev.includes(selectedView)) return prev;
        const next = [...prev, selectedView];
        if (next.length === 3) {
          navigate('/chains');
        }
        return next;
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error?.message ?? 'Ocurrió un error al guardar el análisis.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

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

      // El marcado de cadenas musculares se gestiona en el apartado específico de cadenas.
    } else {
      setAutoKneePoints(undefined);
      setTibioResult(undefined);
      setAngleInfo(
        'No se pudieron detectar automáticamente los puntos de cadera, rodilla y tobillo. Marque los puntos manualmente en la imagen.'
      );
    }
  };

// 🔥 SOLO CAMBIÓ analyzeFootprintAutomatically (todo lo demás intacto)

const analyzeFootprintAutomatically = async () => {
  if (!imageRef.current) return;

  const img = imageRef.current;
  const canvas = document.createElement('canvas');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let sumBrightness = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumBrightness += v;
    count++;
  }

  const meanBrightness = count ? sumBrightness / count : 0;
  const threshold = meanBrightness * 0.8;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  const isFootPixel: boolean[] = new Array(width * height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      if (v < threshold) {
        isFootPixel[y * width + x] = true;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    setFootTypeInfo('No se detectó huella.');
    return;
  }

  // 🔥 dividir pies
  const centerX = Math.floor((minX + maxX) / 2);

  const feet = [
    { name: 'Izquierdo', xStart: minX, xEnd: centerX },
    { name: 'Derecho', xStart: centerX, xEnd: maxX }
  ];

  const roiHeight = maxY - minY + 1;
  const band = (pos: number) => Math.round(minY + roiHeight * pos);

  const scanAt = (centerPos: number, foot: any) => {
    const y = band(centerPos);

    let left = foot.xEnd;
    let right = foot.xStart;

    for (let x = foot.xStart; x <= foot.xEnd; x++) {
      if (isFootPixel[y * width + x]) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }

    const w = right >= left ? right - left : 0;
    return { width: w, left, right, y };
  };

  const results = feet.map((foot) => {
    const fore = scanAt(0.25, foot);
    const mid = scanAt(0.5, foot);
    const rear = scanAt(0.75, foot);

    const refWidth = Math.max(fore.width, rear.width, 1);
    const ratio = mid.width / refWidth;

    let type: 'indeterminado' | 'cavo' | 'plano' | 'neutro' = 'indeterminado';
    if (ratio < 0.3) type = 'cavo';
    else if (ratio > 0.7) type = 'plano';
    else type = 'neutro';
    return { ...foot, fore, mid, rear, ratio, type };
  });

  const text = results
    .map(r =>
      `${r.name}: ${
        r.type === 'cavo'
          ? 'Pie cavo'
          : r.type === 'plano'
          ? 'Pie plano'
          : 'Pie neutro'
      } (${(r.ratio * 100).toFixed(0)}%)`
    )
    .join(' | ');

  setFootTypeInfo(text);

  // Construir overlay visual para cada pie (left/right)
  const overlay: FootOverlay = { left: null, right: null };
  results.forEach((r, idx) => {
    // Eje longitudinal: de talón (retropié) a antepié (dedo 2)
    const heel = { x: (r.rear.left + r.rear.right) / 2, y: r.rear.y };
    const toe2 = { x: (r.fore.left + r.fore.right) / 2, y: r.fore.y };
    const axis = {
      x1: heel.x,
      y1: heel.y,
      x2: toe2.x,
      y2: toe2.y,
    };
    const footLength = Math.hypot(axis.x2 - axis.x1, axis.y2 - axis.y1);
    // Secciones: fore, mid, rear
    const sections = [
      {
        name: 'Antepié',
        px: (r.fore.left + r.fore.right) / 2,
        py: r.fore.y,
        width: r.fore.width,
        left: { x: r.fore.left, y: r.fore.y },
        right: { x: r.fore.right, y: r.fore.y },
      },
      {
        name: 'Mediopié',
        px: (r.mid.left + r.mid.right) / 2,
        py: r.mid.y,
        width: r.mid.width,
        left: { x: r.mid.left, y: r.mid.y },
        right: { x: r.mid.right, y: r.mid.y },
      },
      {
        name: 'Retropié',
        px: (r.rear.left + r.rear.right) / 2,
        py: r.rear.y,
        width: r.rear.width,
        left: { x: r.rear.left, y: r.rear.y },
        right: { x: r.rear.right, y: r.rear.y },
      },
    ];
    const side = idx === 0 ? 'left' : 'right';
    overlay[side] = { heel, toe2, axis, footLength, sections, side };
  });
  setFootOverlay(overlay);
  };

  const analyzeHeelAlignmentAutomatically = async () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let sumBrightness = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      sumBrightness += v;
      count++;
    }
    const meanBrightness = count ? sumBrightness / count : 0;
    const threshold = meanBrightness * 0.8;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    const isFootPixel: boolean[] = new Array(width * height).fill(false);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const v = 0.299 * r + 0.587 * g + 0.114 * b;
        if (v < threshold) {
          isFootPixel[y * width + x] = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      setHeelAlignmentInfo('No se detectó claramente el contorno del talón en la imagen.');
      return;
    }

    const roiHeight = maxY - minY + 1;
    const bandRange = (from: number, to: number) => {
      const yStart = Math.round(minY + roiHeight * from);
      const yEnd = Math.round(minY + roiHeight * to);
      let sumX = 0;
      let n = 0;
      for (let y = yStart; y <= yEnd; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (isFootPixel[y * width + x]) {
            sumX += x;
            n++;
          }
        }
      }
      return n ? sumX / n : null;
    };

    const topCx = bandRange(0.3, 0.5);
    const bottomCx = bandRange(0.7, 1.0);

    if (topCx == null || bottomCx == null) {
      setHeelAlignmentInfo('No se pudo estimar la alineación del calcáneo.');
      return;
    }

    const diff = bottomCx - topCx;
    const tol = (maxX - minX) * 0.02;

    let classification = '';
    if (Math.abs(diff) <= tol) {
      classification = 'Calcáneo neutro (sin desviación significativa)';
    } else if (diff > 0) {
      classification = 'Tendencia a valgo de calcáneo (talón se abre hacia lateral)';
    } else {
      classification = 'Tendencia a varo de calcáneo (talón se cierra hacia medial)';
    }

    setHeelAlignmentInfo(`${classification} · desplazamiento relativo: ${diff.toFixed(1)} px`);
  };

  // Lanzar análisis automático cuando cambia la vista seleccionada o la imagen asociada.
  // Para rodilla (sagital) disparamos el análisis en el onLoad de la imagen oculta,
  // y aquí mantenemos solo huella plantar y calcáneo.
  useEffect(() => {
    if (!imageForView || !imageRef.current) return;

    (async () => {
      if (selectedView === 'frontal') {
        await analyzeFootprintAutomatically();
      } else if (selectedView === 'posterior') {
        await analyzeHeelAlignmentAutomatically();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageForView, selectedView]);

  return (
    <div className="space-y-4">
      <div className="clinical-card p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Análisis biomecánico</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paso 4 de 5 · Huella plantar (vista inferior), ángulo tibiofemoral (sagital) y alineación del calcáneo/postura posterior.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-slate-600 dark:text-slate-400 md:items-end">
            <span className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-500">Vista seleccionada</span>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-900/60">
              {(['frontal', 'sagital', 'posterior'] as CameraView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setSelectedView(view)}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    selectedView === view
                      ? 'bg-clinical-primary text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {VIEW_LABELS[view]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5 md:items-start">
          {/* Columna izquierda: imagen y overlays */}
          <div className="md:col-span-3">
            <div
              className={`w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center ${
                selectedView === 'frontal'
                  ? 'h-[70vh] max-h-[620px]'
                  : 'h-[90vh] max-h-[980px]'
              }`}
            >
              {imageForView ? (
                selectedView === 'sagital' ? (
                  <>
                    <MarkerCanvas
                      imageUrl={imageForView}
                      view={selectedView}
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
                    {/* Imagen oculta para alimentar a MediaPipe sin interferir con el canvas interactivo */}
                    <img
                      ref={imageRef}
                      src={imageForView}
                      alt="Estudio para MediaPipe"
                      className="hidden"
                      onLoad={async () => {
                        await runAutomaticKneeAnalysis();
                      }}
                    />
                  </>
                ) : (
                  <div className="relative h-full w-full">
                    <img
                      ref={imageRef}
                      src={imageForView}
                      alt="Estudio de huella/postura"
                      className="h-full w-full object-cover"
                      onLoad={async () => {
                        if (selectedView === 'frontal') {
                          await analyzeFootprintAutomatically();
                        } else if (selectedView === 'posterior') {
                          await analyzeHeelAlignmentAutomatically();
                        }
                      }}
                    />
                    {selectedView === 'frontal' && footOverlay && (
                      <svg className="absolute inset-0 h-full w-full">
                        {/* Renderizar cada pie por separado, alineando medidas a su eje */}
                        {(['left', 'right'] as const).map((side) => {
                          const foot = footOverlay[side];
                          if (!foot) return null;
                          // Escala de píxeles a porcentaje
                          const scaleX = 100 / (imageRef.current?.naturalWidth || 1);
                          const scaleY = 100 / (imageRef.current?.naturalHeight || 1);
                          return (
                            <g key={side}>
                              {/* Eje longitudinal */}
                              <line
                                x1={foot.axis.x1 * scaleX + '%'}
                                y1={foot.axis.y1 * scaleY + '%'}
                                x2={foot.axis.x2 * scaleX + '%'}
                                y2={foot.axis.y2 * scaleY + '%'}
                                stroke="#16a34a"
                                strokeWidth={2}
                              />
                              {/* Secciones y medidas */}
                              {foot.sections.map((sec: typeof foot.sections[number], i: number) => (
                                <g key={sec.name}>
                                  {/* Línea de sección */}
                                  <line
                                    x1={sec.left.x * scaleX + '%'}
                                    y1={sec.left.y * scaleY + '%'}
                                    x2={sec.right.x * scaleX + '%'}
                                    y2={sec.right.y * scaleY + '%'}
                                    stroke="#f59e42"
                                    strokeWidth={2}
                                  />
                                  {/* Etiqueta de sección */}
                                  <rect
                                    x={(sec.px * scaleX - 2) + '%'}
                                    y={(sec.py * scaleY - 4) + '%'}
                                    width="4%"
                                    height="4%"
                                    rx={1}
                                    fill="#f59e42"
                                  />
                                  <text
                                    x={sec.px * scaleX + '%'}
                                    y={(sec.py * scaleY - 1) + '%'}
                                    textAnchor="middle"
                                    fontSize={8}
                                    fill="#fff"
                                    fontWeight={600}
                                  >
                                    {sec.name}
                                  </text>
                                  {/* Medida de ancho */}
                                  <rect
                                    x={((sec.left.x + sec.right.x) / 2 * scaleX - 6) + '%'}
                                    y={((sec.left.y + sec.right.y) / 2 * scaleY - 6) + '%'}
                                    width="12%"
                                    height="5%"
                                    rx={1.5}
                                    fill="#fde68a"
                                  />
                                  <text
                                    x={((sec.left.x + sec.right.x) / 2 * scaleX) + '%'}
                                    y={((sec.left.y + sec.right.y) / 2 * scaleY - 2.7) + '%'}
                                    textAnchor="middle"
                                    fontSize={7}
                                    fill="#0f172a"
                                    fontWeight={600}
                                  >
                                    {sec.width.toFixed(1)} px
                                  </text>
                                </g>
                              ))}
                              {/* Puntos clave */}
                              <circle cx={foot.heel.x * scaleX + '%'} cy={foot.heel.y * scaleY + '%'} r={3} fill="#0ea5e9" />
                              <circle cx={foot.toe2.x * scaleX + '%'} cy={foot.toe2.y * scaleY + '%'} r={3} fill="#0ea5e9" />
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                )
              ) : (
                <div className="flex-1 px-4 py-8 text-center text-xs text-slate-500">
                  No hay imagen capturada para esta vista en el estudio actual.
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: resultado, ayuda e interacción */}
          <div className="space-y-3 md:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-clinical-primary/10 text-[10px] font-semibold text-clinical-primary">
                  {selectedView === 'frontal' && 'FP'}
                  {selectedView === 'sagital' && 'TF'}
                  {selectedView === 'posterior' && 'CA'}
                </div>
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{currentResultTitle}</p>
                  <p className="text-slate-700 dark:text-slate-300">{currentResultText}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {selectedView === 'sagital' ? (
                <>
                  <p className="font-medium">Cómo se calcula el ángulo de rodilla</p>
                  <p>
                    Se trazan dos segmentos: cadera-rodilla (fémur) y rodilla-tobillo (tibia). El arco naranja alrededor de la rodilla
                    representa el ángulo tibiofemoral mostrado en grados.
                  </p>
                </>
              ) : selectedView === 'frontal' ? (
                <>
                  <p className="font-medium">Cómo se interpreta la huella plantar</p>
                  <p>
                    Se comparan los anchos de antepié y retropié con el grosor del mediopié (segmento de color). Según esa relación se
                    clasifica el arco en pie cavo, plano o neutro.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Cómo se estima el valgo/varo de calcáneo</p>
                  <p>
                    Se analiza la columna de apoyo del talón en la vista posterior y se calcula el desplazamiento lateral entre la parte
                    superior e inferior del calcáneo para indicar tendencia a valgo, varo o neutro.
                  </p>
                </>
              )}
            </div>

            {selectedView === 'sagital' && imageForView && (
              <button
                type="button"
                className="clinical-button-primary w-fit text-[11px]"
                onClick={async () => {
                  if (!imageRef.current) return;
                  await runAutomaticKneeAnalysis();
                }}
              >
                Recalcular ángulo automáticamente
              </button>
            )}

            <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Guardar resultados del análisis actual</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Se almacenarán los resultados automáticos de la vista seleccionada (huella plantar, ángulo tibiofemoral o alineación del
                  calcáneo) para el estudio activo.
                </p>
              </div>
              <button type="button" className="clinical-button-primary text-xs" onClick={handleSaveAnalysis}>
                Guardar estudio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisBiomecanico;
