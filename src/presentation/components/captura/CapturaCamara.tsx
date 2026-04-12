import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import type { CameraView } from '../../../domain/patient';
import { useAppStore } from '../../hooks/useAppStore';

interface CameraSlot {
  id: CameraView;
  label: string;
  description: string;
}

const CAMERA_SLOTS: CameraSlot[] = [
  {
    id: 'frontal',
    label: 'Huella plantar (vista inferior)',
    description: 'Orientada a registrar la huella plantar desde la caja podoscópica.',
  },
  {
    id: 'sagital',
    label: 'Rodilla · ángulo tibiofemoral (sagital)',
    description: 'Vista lateral para medir el ángulo tibiofemoral de rodilla.',
  },
  {
    id: 'posterior',
    label: 'Postura global / cadenas miofasciales',
    description: 'Vista posterior para evaluar cadenas miofasciales y alineación.',
  },
];

export const CapturaCamara: React.FC = () => {
  const videoRefs = useRef<Record<CameraView, HTMLVideoElement | null>>({
    frontal: null,
    sagital: null,
    posterior: null,
  });
  const streamsRef = useRef<Record<CameraView, MediaStream | null>>({
    frontal: null,
    sagital: null,
    posterior: null,
  });
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceByView, setSelectedDeviceByView] = useState<Record<CameraView, string>>({
    frontal: '',
    sagital: '',
    posterior: '',
  });
  const currentPatient = useAppStore((s) => s.currentPatient);
  const currentStudyUID = useAppStore((s) => s.currentStudyUID);
  const addCapturedImage = useAppStore((s) => s.addCapturedImage);
  const capturedImages = useAppStore((s) => s.capturedImages);
  const [filesByView, setFilesByView] = useState<Record<CameraView, File | null>>({
    frontal: null,
    sagital: null,
    posterior: null,
  });
  const navigate = useNavigate();

  const startStreamForView = async (view: CameraView, deviceId?: string) => {
    try {
      // Detener stream previo, si existe
      const previous = streamsRef.current[view];
      if (previous) {
        previous.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };

      const media = await navigator.mediaDevices.getUserMedia(constraints);
      streamsRef.current[view] = media;

      const video = videoRefs.current[view];
      if (video) {
        video.srcObject = media;
        void video.play();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('No se pudo iniciar la cámara para la vista', view, e);
      await Swal.fire({
        icon: 'error',
        title: 'Cámara no disponible',
        text: 'No se pudo acceder a la cámara seleccionada. Verifique permisos o seleccione otro dispositivo.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Solicitar permiso una vez para poder enumerar dispositivos con etiquetas
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();

        if (!active) {
          tempStream.getTracks().forEach((t) => t.stop());
          return;
        }

        const videos = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videos);

        // Seleccionar por defecto la primera cámara para todas las vistas
        const defaultId = videos[0]?.deviceId ?? '';
        setSelectedDeviceByView({
          frontal: defaultId,
          sagital: defaultId,
          posterior: defaultId,
        });

        // Detenemos el stream temporal; las vistas abrirán sus propios streams al seleccionar dispositivo
        tempStream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('No se pudo acceder a la cámara', e);
        await Swal.fire({
          icon: 'error',
          title: 'Cámara no disponible',
          text: 'No se pudo acceder a la cámara. Verifique permisos del navegador.',
          confirmButtonColor: '#ef4444',
        });
      }
    })();

    return () => {
      active = false;
      // Detener todos los streams abiertos por vista
      Object.values(streamsRef.current).forEach((stream) => {
        stream?.getTracks().forEach((t) => t.stop());
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = async (view: CameraView) => {
    if (!currentPatient || !currentStudyUID) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta información',
        text: 'Debe registrar un paciente y tener un estudio activo antes de capturar.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }
    const video = videoRefs.current[view];
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;

    const file = new File([blob], `${currentPatient.id.value}-${currentStudyUID.value}-${view}.jpg`, {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', currentPatient.id.value);
    formData.append('studyUID', currentStudyUID.value);
    formData.append('view', view);

    try {
      const response = await fetch('/api/studies/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo guardar la captura');
      }

      const data = await response.json();

      addCapturedImage({
        id: data.id,
        patientId: currentPatient.id,
        studyUID: currentStudyUID,
        view,
        capturedAt: new Date(data.capturedAt),
        url: data.url,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Imagen capturada',
        text: `Se guardó correctamente la vista ${view}.`,
        confirmButtonColor: '#0ea5e9',
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al capturar',
        text: error?.message ?? 'Ocurrió un error al guardar la imagen.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleUploadFromFile = async (view: CameraView) => {
    if (!currentPatient || !currentStudyUID) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta información',
        text: 'Debe registrar un paciente y tener un estudio activo antes de subir una imagen.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const file = filesByView[view];
    if (!file) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin archivo seleccionado',
        text: 'Seleccione un archivo de imagen antes de subir.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', currentPatient.id.value);
    formData.append('studyUID', currentStudyUID.value);
    formData.append('view', view);

    try {
      const response = await fetch('/api/studies/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo guardar la imagen');
      }

      const data = await response.json();

      addCapturedImage({
        id: data.id,
        patientId: currentPatient.id,
        studyUID: currentStudyUID,
        view,
        capturedAt: new Date(data.capturedAt),
        url: data.url,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Imagen cargada',
        text: `Se guardó correctamente la vista ${view} desde archivo.`,
        confirmButtonColor: '#0ea5e9',
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al subir',
        text: error?.message ?? 'Ocurrió un error al guardar la imagen.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const disabledHint = !currentPatient || !currentStudyUID;

  const hasImagesForCurrentStudy = Boolean(
    currentStudyUID &&
      capturedImages.some((img) => img.studyUID.value === currentStudyUID.value)
  );

  return (
    <div className="clinical-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Captura simultánea 3 cámaras</h2>
          <p className="text-xs text-slate-400">
            Paso 3 de 5 · Capture en el mismo estudio: huella plantar, rodilla (ángulo tibiofemoral) y postura/cadenas.
          </p>
        </div>
        {disabledHint && (
          <p className="text-xs text-amber-400 max-w-xs text-right">
            Registre un paciente y cree un estudio antes de capturar (consentimiento informado obligatorio).
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CAMERA_SLOTS.map((slot) => (
          <div key={slot.id} className="space-y-2">
            {(() => {
              const latest = [...capturedImages].reverse().find((img) => img.view === slot.id);
              return (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-medium">{slot.label}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{slot.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="clinical-badge text-[10px] uppercase tracking-wide">{slot.id}</span>
                      <select
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        disabled={disabledHint || !videoDevices.length}
                        value={selectedDeviceByView[slot.id]}
                        onChange={async (e) => {
                          const id = e.target.value;
                          setSelectedDeviceByView((prev) => ({ ...prev, [slot.id]: id }));
                          if (id) {
                            await startStreamForView(slot.id, id);
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
                  </div>
                  <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black aspect-[4/3]">
                    <video
                      ref={(el) => {
                        videoRefs.current[slot.id] = el;
                      }}
                      className={`h-full w-full object-cover ${latest ? 'opacity-0' : ''}`}
                      muted
                      playsInline
                    />
                    {latest && (
                      <img
                        src={latest.url}
                        alt={`Vista ${slot.label}`}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                  </div>
                </>
              );
            })()}
            <button
              type="button"
              className="clinical-button-primary w-full text-xs"
              onClick={() => handleCapture(slot.id)}
              disabled={disabledHint}
            >
              Capturar {slot.label}
            </button>
            <div className="space-y-1 pt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">O bien, cargar una imagen desde archivo:</p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={disabledHint}
                  className="text-[10px] text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px] file:text-slate-800 disabled:opacity-50 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setFilesByView((prev) => ({ ...prev, [slot.id]: file }));
                  }}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={disabledHint || !filesByView[slot.id]}
                  onClick={() => void handleUploadFromFile(slot.id)}
                >
                  Subir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          className="clinical-button-primary text-xs"
          onClick={async () => {
            if (!currentStudyUID) {
              await Swal.fire({
                icon: 'warning',
                title: 'Sin estudio activo',
                text: 'Debe existir un estudio activo antes de continuar al análisis.',
                confirmButtonColor: '#f59e0b',
              });
              return;
            }
            if (!hasImagesForCurrentStudy) {
              await Swal.fire({
                icon: 'warning',
                title: 'Sin imágenes capturadas',
                text: 'Capture o cargue al menos una vista antes de continuar al análisis biomecánico.',
                confirmButtonColor: '#f59e0b',
              });
              return;
            }
            navigate('/analysis');
          }}
        >
          Siguiente paso: análisis biomecánico
        </button>
      </div>
    </div>
  );
};
