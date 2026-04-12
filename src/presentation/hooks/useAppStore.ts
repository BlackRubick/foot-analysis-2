import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PatientId, PatientPersonalData, ClinicalData, StudyUID, CapturedImageMeta } from '../../domain/patient';
import type { BiomechanicalAnalysisResult } from '../../domain/biomechanics';

interface AppState {
  patientCounter: number;
  currentPatient?: PatientPersonalData;
  currentClinicalData?: ClinicalData;
  consentUploaded: boolean;
  currentStudyUID?: StudyUID;
  capturedImages: CapturedImageMeta[];
  analysisResults: BiomechanicalAnalysisResult[];

  setPatient: (patient: PatientPersonalData, clinical?: ClinicalData) => void;
  setConsentUploaded: (uploaded: boolean) => void;
  startStudy: (uid: StudyUID) => void;
  addCapturedImage: (image: CapturedImageMeta) => void;
  addAnalysisResult: (result: BiomechanicalAnalysisResult) => void;
}

export const useAppStore = create<AppState>()(
  devtools((set) => ({
    patientCounter: 1,
    capturedImages: [],
    analysisResults: [],
    consentUploaded: false,

    setPatient: (patient, clinical) =>
      set((state) => ({
        currentPatient: patient,
        currentClinicalData: clinical ?? state.currentClinicalData,
      })),

    setConsentUploaded: (uploaded) => set({ consentUploaded: uploaded }),

    startStudy: (uid) => set({ currentStudyUID: uid }),

    addCapturedImage: (image) =>
      set((state) => ({
        capturedImages: [...state.capturedImages, image],
      })),

    addAnalysisResult: (result) =>
      set((state) => ({
        analysisResults: [...state.analysisResults, result],
      })),
  }))
);
