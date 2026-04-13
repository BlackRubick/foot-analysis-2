
import React, { useEffect, useRef, useState } from 'react';

interface FootprintAnalysisProps {
  imageUrl?: string;
  onSave: (resultData: any) => void;
}

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
    color?: string;
  }>;
  side: 'left' | 'right';
  bands: Array<{
    label: string;
    color: string;
    px: number;
    py: number;
    left: number;
    right: number;
    leftPt: { x: number; y: number } | null;
    rightPt: { x: number; y: number } | null;
    widthPx: number;
    widthCm: number;
  }>;
  bandM: {
    left: number;
    right: number;
    py: number;
  };
  bandL3: {
    left: number;
    right: number;
    py: number;
  };
  bandL: {
    label: string;
    color: string;
    px: number;
    py: number;
  };
};
type FootOverlay = {
  left: FootSection | null;
  right: FootSection | null;
} | null;

let PX_PER_CM = 37.8;

export const FootprintAnalysis: React.FC<FootprintAnalysisProps> = ({ imageUrl, onSave }) => {
  const [footTypeInfo, setFootTypeInfo] = useState<string>('Sin análisis de huella plantar todavía.');
  const [footOverlay, setFootOverlay] = useState<FootOverlay | null>(null);
  const [debugContours, setDebugContours] = useState<Array<Array<{x:number,y:number}>>>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [calibPoints, setCalibPoints] = useState<{x: number, y: number}[]>([]);
  const [pxPerCm, setPxPerCm] = useState(PX_PER_CM);
  // Mostrar siempre el contorno automáticamente
  const showContoursOnly = true;
  const imageRef = useRef<HTMLImageElement | null>(null);

  // --- Calibración rápida ---
  const handleCalibrationClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    if (!calibrating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (e.currentTarget.naturalWidth || 1);
    const y = ((e.clientY - rect.top) / rect.height) * (e.currentTarget.naturalHeight || 1);
    setCalibPoints((prev) => {
      const next = [...prev, { x, y }];
      if (next.length === 2) {
        setTimeout(async () => {
          const distPx = Math.hypot(next[1].x - next[0].x, next[1].y - next[0].y);
          const cm = window.prompt(`La distancia seleccionada es de ${distPx.toFixed(1)} px. ¿Cuántos centímetros reales hay entre los dos puntos?`, "1");
          if (cm && parseFloat(cm) > 0) {
            const newPxPerCm = distPx / parseFloat(cm);
            setPxPerCm(newPxPerCm);
            PX_PER_CM = newPxPerCm;
            alert(`¡Calibración exitosa! 1 cm = ${newPxPerCm.toFixed(2)} px.`);
            setCalibrating(false);
            setCalibPoints([]);
            if (imageRef.current) {
              await analyzeFootprintAutomatically();
            }
          } else {
            setCalibrating(false);
            setCalibPoints([]);
          }
        }, 100);
      }
      return next.slice(0, 2);
    });
  };

  // ---
  const analyzeFootprintAutomatically = async () => {
    if (!imageRef.current || !(window as any).cv) return;
    const img = imageRef.current;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;

    // Crear un canvas temporal y obtener la imagen
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    const src = (window as any).cv.imread(canvas);

    // Procesamiento OpenCV.js
    let gray = new (window as any).cv.Mat();
    (window as any).cv.cvtColor(src, gray, (window as any).cv.COLOR_RGBA2GRAY, 0);
    let blur = new (window as any).cv.Mat();
    (window as any).cv.GaussianBlur(gray, blur, new (window as any).cv.Size(7, 7), 0, 0, (window as any).cv.BORDER_DEFAULT);
    let thresh = new (window as any).cv.Mat();
    (window as any).cv.threshold(blur, thresh, 0, 255, (window as any).cv.THRESH_BINARY + (window as any).cv.THRESH_OTSU);
    // Invertir: pies brillantes sobre fondo oscuro
    (window as any).cv.bitwise_not(thresh, thresh);
    // Eliminar ruido
    let kernel = (window as any).cv.getStructuringElement((window as any).cv.MORPH_ELLIPSE, new (window as any).cv.Size(7, 7));
    (window as any).cv.morphologyEx(thresh, thresh, (window as any).cv.MORPH_OPEN, kernel);

    // Encontrar contornos
    let contours = new (window as any).cv.MatVector();
    let hierarchy = new (window as any).cv.Mat();
    (window as any).cv.findContours(thresh, contours, hierarchy, (window as any).cv.RETR_EXTERNAL, (window as any).cv.CHAIN_APPROX_SIMPLE);

    // Filtrar los dos contornos más grandes
    let contourArr: Array<any> = [];
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = (window as any).cv.contourArea(cnt);
      if (area > (width * height) * 0.01) {
        contourArr.push({ area, cnt });
      }
    }
    contourArr.sort((a, b) => b.area - a.area);
    const mainContours = contourArr.slice(0, 2);

    // Convertir a formato [{x, y}] para debugContours
    const jsContours = mainContours.map(obj => {
      const cnt = obj.cnt;
      const arr = [];
      for (let j = 0; j < cnt.data32S.length; j += 2) {
        arr.push({ x: cnt.data32S[j], y: cnt.data32S[j + 1] });
      }
      return arr;
    });
    setDebugContours(jsContours);

    // Liberar memoria
    src.delete(); gray.delete(); blur.delete(); thresh.delete(); kernel.delete(); contours.delete(); hierarchy.delete();
  };


  useEffect(() => {
    if (imageUrl && imageRef.current) {
      analyzeFootprintAutomatically();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, pxPerCm]);

  return (
    <div className="grid gap-4 md:grid-cols-5 md:items-start">
      {/* Columna izquierda: imagen y overlays */}
      <div className="md:col-span-3">
        <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center h-[70vh] max-h-[620px]">
          {imageUrl ? (
            <div className="relative h-full w-full">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Estudio de huella/postura"
                className={`h-full w-full object-cover ${calibrating ? 'cursor-crosshair' : ''}`}
                onClick={handleCalibrationClick}
              />
              {/* Mostrar puntos de calibración */}
              {calibrating && calibPoints.map((pt, i) => (
                <svg key={i} className="absolute inset-0 h-full w-full pointer-events-none">
                  <circle
                    cx={(pt.x / (imageRef.current?.naturalWidth || 1)) * 100 + '%'}
                    cy={(pt.y / (imageRef.current?.naturalHeight || 1)) * 100 + '%'}
                    r="1.5%"
                    fill="#0ea5e9"
                    stroke="#fff"
                    strokeWidth="0.5%"
                  />
                </svg>
              ))}
              {/* Overlay de contornos de pies detectados */}
              {debugContours.length > 0 && imageRef.current && (
                <svg
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  width={imageRef.current.naturalWidth}
                  height={imageRef.current.naturalHeight}
                  viewBox={`0 0 ${imageRef.current.naturalWidth} ${imageRef.current.naturalHeight}`}
                  style={{ width: '100%', height: '100%' }}
                >
                  {debugContours.map((contour, i) => (
                    <polyline
                      key={i}
                      points={contour.map(pt => `${pt.x},${pt.y}`).join(' ')}
                      fill="none"
                      stroke={i===0?"#00eaff":"#ff00a2"}
                      strokeWidth={4}
                      opacity="0.95"
                    />
                  ))}
                </svg>
              )}
              {/* Mostrar overlays de análisis solo si no está activado el modo contorno */}
              {!showContoursOnly && footOverlay && (
                <svg className="absolute inset-0 h-full w-full">
                  {/* ...existing code for overlays... */}
                  {(['left', 'right'] as const).map((side) => {
                    const foot = footOverlay[side];
                    if (!foot) return null;
                    const scaleX = 100 / (imageRef.current?.naturalWidth || 1);
                    const scaleY = 100 / (imageRef.current?.naturalHeight || 1);
                    return (
                      <g key={side}>
                        {/* ...existing code for overlays... */}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          ) : (
            <div className="flex-1 px-4 py-8 text-center text-xs text-slate-500">
              No hay imagen capturada para esta vista en el estudio actual.
            </div>
          )}
        </div>
        {/* Contorno siempre visible, sin botón de alternancia */}
      </div>

      {/* Columna derecha: resultado, ayuda e interacción */}
      <div className="space-y-3 md:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-clinical-primary/10 text-[10px] font-semibold text-clinical-primary">
              FP
            </div>
            <div className="space-y-0.5">
              <p className="font-medium text-slate-800 dark:text-slate-100">Resultado huella plantar</p>
              <p className="text-slate-700 dark:text-slate-300">{footTypeInfo}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <button
            type="button"
            className={`clinical-button-primary mb-2 text-xs ${calibrating ? 'bg-amber-400' : ''}`}
            onClick={() => {
              setCalibrating((v) => !v);
              setCalibPoints([]);
            }}
          >
            {calibrating ? 'Haz clic en dos puntos de referencia...' : 'Calibrar escala (cm)'}
          </button>
          <p className="font-medium">Cómo se interpreta la huella plantar</p>
          <p>
            Se comparan los anchos de antepié y retropié con el grosor del mediopié (segmento de color). Según esa relación se
            clasifica el arco en pie cavo, plano o neutro.
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Guardar resultados del análisis actual</p>
            <p className="text-slate-600 dark:text-slate-400">
              Se almacenarán los resultados automáticos de la vista seleccionada (huella plantar) para el estudio activo.
            </p>
          </div>
          <button type="button" className="clinical-button-primary text-xs" onClick={() => onSave({ footTypeInfo })}>
            Guardar estudio
          </button>
        </div>
      </div>
    </div>
  );
};
