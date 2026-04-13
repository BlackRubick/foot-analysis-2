
import React, { useEffect, useRef, useState } from 'react';

interface HeelAlignmentAnalysisProps {
  imageUrl?: string;
  onSave: (resultData: any) => void;
}

export const HeelAlignmentAnalysis: React.FC<HeelAlignmentAnalysisProps> = ({ imageUrl, onSave }) => {
  const [heelAlignmentInfo, setHeelAlignmentInfo] = useState<string>('Sin análisis de calcáneo todavía.');
  const imageRef = useRef<HTMLImageElement | null>(null);

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

  useEffect(() => {
    if (imageUrl && imageRef.current) {
      analyzeHeelAlignmentAutomatically();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div className="grid gap-4 md:grid-cols-5 md:items-start">
      <div className="md:col-span-3">
        <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center h-[90vh] max-h-[980px]">
          {imageUrl ? (
            <div className="relative h-full w-full">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Estudio de huella/postura"
                className="h-full w-full object-cover"
                onLoad={analyzeHeelAlignmentAutomatically}
              />
            </div>
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
              CA
            </div>
            <div className="space-y-0.5">
              <p className="font-medium text-slate-800 dark:text-slate-100">Resultado alineación de calcáneo</p>
              <p className="text-slate-700 dark:text-slate-300">{heelAlignmentInfo}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="font-medium">Cómo se estima el valgo/varo de calcáneo</p>
          <p>
            Se analiza la columna de apoyo del talón en la vista posterior y se calcula el desplazamiento lateral entre la parte
            superior e inferior del calcáneo para indicar tendencia a valgo, varo o neutro.
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Guardar resultados del análisis actual</p>
            <p className="text-slate-600 dark:text-slate-400">
              Se almacenarán los resultados automáticos de la vista seleccionada (alineación del calcáneo) para el estudio activo.
            </p>
          </div>
          <button type="button" className="clinical-button-primary text-xs" onClick={() => onSave({ heelAlignmentInfo })}>
            Guardar estudio
          </button>
        </div>
      </div>
    </div>
  );
};
