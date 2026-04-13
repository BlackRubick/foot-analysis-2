
import React from 'react';
import { FootprintAnalysis } from '../components/analysis/FootprintAnalysis';
import { KneeAngleAnalysis } from '../components/analysis/KneeAngleAnalysis';
import { HeelAlignmentAnalysis } from '../components/analysis/HeelAlignmentAnalysis';
import { useAppStore } from '../hooks/useAppStore';


export const AnalysisPage: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const capturedImages = useAppStore((s) => s.capturedImages);
  const currentStudyUID = useAppStore((s) => s.currentStudyUID);

  // Filtrar imágenes por estudio activo
  const getImageUrl = (view: 'frontal' | 'sagital' | 'posterior') => {
    if (!currentStudyUID) return undefined;
    const img = capturedImages.find(
      (i) => i.view === view && i.studyUID.value === currentStudyUID.value
    );
    return img?.url;
  };

  const handleSave = () => setStep((s) => s + 1);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button className={step === 0 ? 'font-bold' : ''} onClick={() => setStep(0)}>Huella plantar</button>
        <button className={step === 1 ? 'font-bold' : ''} onClick={() => setStep(1)}>Ángulo rodilla</button>
        <button className={step === 2 ? 'font-bold' : ''} onClick={() => setStep(2)}>Alineación calcáneo</button>
      </div>
      {step === 0 && <FootprintAnalysis imageUrl={getImageUrl('frontal')} onSave={handleSave} />}
      {step === 1 && <KneeAngleAnalysis imageUrl={getImageUrl('sagital')} onSave={handleSave} />}
      {step === 2 && <HeelAlignmentAnalysis imageUrl={getImageUrl('posterior')} onSave={handleSave} />}
    </div>
  );
};
