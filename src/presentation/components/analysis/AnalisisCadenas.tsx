import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnatomicalPoint, ChainTraitDefinition, ChainScore } from '../../../domain/biomechanics';
import { CHAIN_TRAITS, computeChainScores, computeTibiofemoralAngle } from '../../../domain/biomechanics';
import { useAppStore } from '../../hooks/useAppStore';
import Swal from 'sweetalert2';
import { mediaPipeVisionAnalyzer } from '../../../infrastructure/vision/mediapipeClient';

export const AnalisisCadenas: React.FC = () => {
  const navigate = useNavigate();
  const currentStudyUID = useAppStore((s) => s.currentStudyUID);
  const addAnalysisResult = useAppStore((s) => s.addAnalysisResult);
  const capturedImages = useAppStore((s) => s.capturedImages);

  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [autoApplied, setAutoApplied] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  const chainScores = useMemo(() => computeChainScores(selectedTraits), [selectedTraits]);

  const toggleTrait = (id: string) => {
    setSelectedTraits((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const setTraitPresence = (id: string, present: boolean) => {
    setSelectedTraits((prev) => {
      const has = prev.includes(id);
      if (present && !has) return [...prev, id];
      if (!present && has) return prev.filter((t) => t !== id);
      return prev;
    });
  };

  // Utilidad común para cargar una imagen en memoria y poder analizarla con canvas o MediaPipe.
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const startLiveStream = async (deviceId?: string) => {
    try {
      const previous = liveStreamRef.current;
      if (previous) {
        previous.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };

      const media = await navigator.mediaDevices.getUserMedia(constraints);
      liveStreamRef.current = media;

      const video = liveVideoRef.current;
      if (video) {
        video.srcObject = media;
        void video.play();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('No se pudo iniciar la cámara en cadenas musculares', e);
      await Swal.fire({
        icon: 'error',
        title: 'Cámara no disponible',
        text: 'No se pudo acceder a la cámara seleccionada. Verifique permisos o seleccione otro dispositivo.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const autoDetectFromFootprint = async (url: string) => {
    const img = await loadImage(url);
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

    if (minX > maxX || minY > maxY) return;

    const roiHeight = maxY - minY + 1;
    const band = (pos: number) => Math.round(minY + roiHeight * pos);

    const widthsAt = (centerPos: number) => {
      const y = band(centerPos);
      let left = maxX;
      let right = minX;
      for (let x = minX; x <= maxX; x++) {
        if (isFootPixel[y * width + x]) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
      return right >= left ? right - left : 0;
    };

    const widthFore = widthsAt(0.25);
    const widthMid = widthsAt(0.5);
    const widthRear = widthsAt(0.75);
    const refWidth = Math.max(widthFore, widthRear, 1);
    const ratio = widthMid / refWidth;

    // Mapeo simple de la huella a rasgos de cadena.
    if (ratio < 0.3) {
      // Pie cavo / supino → cadena de extensión.
      setTraitPresence('ext-pie-cavo', true);
      setTraitPresence('ap-pie-eversion', false);
      setTraitPresence('esp-pie-pronado', false);
    } else if (ratio > 0.7) {
      // Pie plano / pronado → cadenas de apertura/espiración.
      setTraitPresence('ext-pie-cavo', false);
      setTraitPresence('ap-pie-eversion', true);
      setTraitPresence('esp-pie-pronado', true);
    }
  };

  const autoDetectFromHeel = async (url: string) => {
    const img = await loadImage(url);
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

    if (minX > maxX || minY > maxY) return;

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
    if (topCx == null || bottomCx == null) return;

    const diff = bottomCx - topCx;
    const tol = (maxX - minX) * 0.02;

    if (Math.abs(diff) <= tol) {
      // neutro, no marcamos rasgos específicos.
      return;
    }

    if (diff > 0) {
      // Valgo de calcáneo → cadena de cierre.
      setTraitPresence('cierre-valgo-calcaneo', true);
      setTraitPresence('ap-varo-calcaneo', false);
    } else {
      // Varo de calcáneo → cadena de apertura.
      setTraitPresence('ap-varo-calcaneo', true);
      setTraitPresence('cierre-valgo-calcaneo', false);
    }
  };

  const autoDetectFromKnee = async (url: string) => {
    const img = await loadImage(url);
    const auto = await mediaPipeVisionAnalyzer.analyzeLowerLimbFromImage(img);
    if (auto.hip && auto.knee && auto.ankle) {
      const hip: AnatomicalPoint = { label: 'cadera', x: auto.hip.x, y: auto.hip.y };
      const knee: AnatomicalPoint = { label: 'rodilla', x: auto.knee.x, y: auto.knee.y };
      const ankle: AnatomicalPoint = { label: 'tobillo', x: auto.ankle.x, y: auto.ankle.y };
      const result = computeTibiofemoralAngle({ hip, knee, ankle });

      const angle = result.angleDeg;
      const isFlexum = angle < 175;
      const isRecurvatum = angle > 185;
      setTraitPresence('flex-genu-flexum', isFlexum);
      setTraitPresence('ext-genu-recurvatum', isRecurvatum);
    }
  };

  // Permite reutilizar los detectores automáticos existentes sobre una foto
  // tomada desde la cámara en vivo de esta pantalla.
  const autoDetectFromSnapshot = async (dataUrl: string) => {
    const tasks: Promise<void>[] = [];

    // Usamos la misma imagen para los tres detectores básicos disponibles
    // (pie, calcáneo, rodilla) para alimentar las cadenas que hoy están implementadas.
    tasks.push(autoDetectFromFootprint(dataUrl).then(() => {}));
    tasks.push(autoDetectFromHeel(dataUrl).then(() => {}));
    tasks.push(autoDetectFromKnee(dataUrl).then(() => {}));

    await Promise.all(tasks);
  };

  // Al entrar en el apartado de cadenas, intentamos detectar automáticamente algunos rasgos
  // relacionados con pie, calcáneo y rodilla a partir de las imágenes ya capturadas.
  useEffect(() => {
    if (autoApplied) return;
    if (!capturedImages || !capturedImages.length) return;

    const frontal = capturedImages.find((img) => img.view === 'frontal');
    const posterior = capturedImages.find((img) => img.view === 'posterior');
    const sagital = capturedImages.find((img) => img.view === 'sagital');

    const tasks: Promise<void>[] = [];

    if (frontal) {
      tasks.push(autoDetectFromFootprint(frontal.url).then(() => {}));
    }
    if (posterior) {
      tasks.push(autoDetectFromHeel(posterior.url).then(() => {}));
    }
    if (sagital) {
      tasks.push(autoDetectFromKnee(sagital.url).then(() => {}));
    }

    if (!tasks.length) return;

    (async () => {
      try {
        await Promise.all(tasks);
      } finally {
        setAutoApplied(true);
      }
    })();
  }, [autoApplied, capturedImages]);

  // Configurar cámara en vivo para observación clínica durante el análisis de cadenas.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();

        if (!active) {
          tempStream.getTracks().forEach((t) => t.stop());
          return;
        }

        const videos = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videos);

        const defaultId = videos[0]?.deviceId ?? '';
        setSelectedDeviceId(defaultId);

        tempStream.getTracks().forEach((t) => t.stop());

        if (defaultId) {
          await startLiveStream(defaultId);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('No se pudo acceder a la cámara en cadenas musculares', e);
      }
    })();

    return () => {
      active = false;
      const stream = liveStreamRef.current;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveChains = async () => {
    if (!currentStudyUID) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin estudio activo',
        text: 'Debe existir un estudio activo antes de guardar el análisis de cadenas.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const scores = computeChainScores(selectedTraits);

    addAnalysisResult({
      studyUID: currentStudyUID,
      view: 'frontal',
      tibiofemoral: undefined,
      chainScores: scores,
    });

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyUID: currentStudyUID.value,
          tibiofemoralAngleDeg: undefined,
          tibiofemoralClassification: undefined,
          chainScores: scores,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo guardar el análisis de cadenas');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Cadenas guardadas',
        text: 'El análisis de cadenas musculares se guardó correctamente.',
        confirmButtonColor: '#0ea5e9',
      });

      navigate('/results');
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error?.message ?? 'Ocurrió un error al guardar el análisis de cadenas.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="clinical-card p-4 flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cadenas musculares</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Apartado específico para registrar el estado de las cadenas miofasciales a partir de la exploración clínica y las imágenes.
        </p>
        <p className="text-[11px] text-clinical-primary">
          Los rasgos se marcan automáticamente según lo detectado en las fotos de pie, calcáneo y rodilla; se usan para el resumen global.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda: cámara en vivo (más ancha) */}
        <div className="space-y-3 text-xs lg:col-span-2">
          <div className="clinical-card p-4 space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Cámara en vivo para cadenas</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use la vista seleccionada para observar al paciente durante la valoración.
                </p>
              </div>
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                value={selectedDeviceId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedDeviceId(id);
                  if (id) {
                    await startLiveStream(id);
                  }
                }}
              >
                <option value="">Seleccionar cámara</option>
                {videoDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Cámara ${dev.deviceId.substring(0, 6)}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black aspect-[4/3]">
              <video
                ref={liveVideoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              {chainScores.length > 0 && (
                <div className="absolute left-2 top-2 max-w-[70%] space-y-1 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] text-slate-100 shadow-lg">
                  <p className="font-semibold text-[10px] text-clinical-primarySoft">Cadenas activas (auto)</p>
                  <div className="flex flex-wrap gap-1">
                    {chainScores
                      .filter((score) => score.percentage > 0)
                      .map((score) => (
                        <span
                          key={score.chain}
                          className="inline-flex items-center gap-1 rounded-full border border-clinical-primary/40 bg-slate-900/60 px-2 py-0.5"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-clinical-primary" />
                          <span className="capitalize">{score.chain}</span>
                          <span className="font-semibold text-clinical-primarySoft">{score.percentage}%</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                className="clinical-button-primary text-[11px]"
                onClick={async () => {
                  const video = liveVideoRef.current;
                  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
                    await Swal.fire({
                      icon: 'warning',
                      title: 'Sin imagen de cámara',
                      text: 'Asegúrese de que la cámara esté activa antes de tomar la foto.',
                      confirmButtonColor: '#f59e0b',
                    });
                    return;
                  }

                  const canvas = document.createElement('canvas');
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                  await autoDetectFromSnapshot(dataUrl);
                }}
              >
                Tomar foto y actualizar cadenas
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: checklist automático + resumen y guardado (más estrecha) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="clinical-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Checklist de cadenas musculares (automático)</h3>
            <div className="max-h-80 overflow-y-auto pr-1 space-y-2 text-xs">
              {CHAIN_TRAITS.map((trait: ChainTraitDefinition) => {
                const active = selectedTraits.includes(trait.id);
                return (
                  <div
                    key={trait.id}
                    className="flex items-start gap-2 text-slate-800 dark:text-slate-200"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border text-[8px] ${
                        active
                          ? 'border-clinical-primary bg-clinical-primary text-slate-900'
                          : 'border-slate-500/60 bg-transparent text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span>
                      {trait.label}
                      <span className="ml-1 text-[10px] uppercase text-slate-500 dark:text-slate-400">[{trait.chain}]</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="clinical-card p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <p className="font-medium text-slate-800 dark:text-slate-200">Resultado porcentual aproximado</p>
              <div className="flex flex-wrap gap-1">
                {chainScores.map((score: ChainScore) => (
                  <span
                    key={score.chain}
                    className="clinical-badge bg-slate-800/80 border border-slate-700 flex items-center gap-1"
                  >
                    <span className="capitalize">Cadena de {score.chain}</span>
                    <span className="font-semibold text-clinical-primarySoft">{score.percentage}%</span>
                  </span>
                ))}
              </div>
            </div>

            <button type="button" className="clinical-button-primary w-full text-xs" onClick={handleSaveChains}>
              Guardar análisis de cadenas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
