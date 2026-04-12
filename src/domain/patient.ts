export type Sex = 'M' | 'F' | 'Otro';

export interface PatientId {
  value: string; // e.g. patient-00001
}

export interface PatientPersonalData {
  id: PatientId;
  nombre: string;
  edad: number;
  sexo: Sex;
  pesoKg: number;
  estaturaM: number;
  createdAt: Date;
}

export interface ClinicalData {
  id: string; // UUID
  patientId: PatientId;
  antecedentes?: string;
  diagnosticoPrincipal?: string;
  notas?: string;
  createdAt: Date;
}

export interface StudyUID {
  value: string; // DICOM-like UID
}

export type CameraView = 'frontal' | 'sagital' | 'posterior';

export interface CapturedImageMeta {
  id: string;
  patientId: PatientId;
  studyUID: StudyUID;
  view: CameraView;
  capturedAt: Date;
  url: string;
}

export const createPatientId = (counter: number): PatientId => ({
  value: `patient-${counter.toString().padStart(5, '0')}`,
});
