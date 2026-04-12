import React from 'react';
import { CapturaCamara } from '../components/captura/CapturaCamara';
import { useAppStore } from '../hooks/useAppStore';

export const CapturePage: React.FC = () => {
  const consentUploaded = useAppStore((s) => s.consentUploaded);

  return (
    <div className="space-y-4">
      {!consentUploaded && (
        <div className="clinical-card border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-100">
          Es obligatorio contar con consentimiento informado cargado antes de la captura. Este flujo no debería usarse en
          producción sin validar dicho documento.
        </div>
      )}
      <CapturaCamara />
    </div>
  );
};
