export interface PatientEntity {
  id: string; // patient-XXXXX
  nombre_encrypted: string;
  edad: number;
  sexo: string;
  pesoKg: number;
  estaturaM: number;
  createdAt: Date;
}

export interface ClinicalDataEntity {
  id: string; // UUID
  patientId: string;
  antecedentes?: string | null;
  diagnosticoPrincipal_encrypted?: string | null;
  notas?: string | null;
  createdAt: Date;
}

export interface ConsentEntity {
  id: string;
  patientId: string;
  filePath: string;
  mimeType: string;
  createdAt: Date;
}

export interface StudyEntity {
  id: string; // UUID
  patientId: string;
  studyUID: string;
  createdAt: Date;
}

export interface CapturedImageEntity {
  id: string;
  studyUID: string;
  patientId: string;
  view: 'frontal' | 'sagital' | 'posterior';
  filePath: string;
  createdAt: Date;
}

export interface AnalysisEntity {
  id: string;
  studyUID: string;
  tibiofemoralAngleDeg?: number | null;
  tibiofemoralClassification?: string | null;
  chainFlexionPct?: number | null;
  chainExtensionPct?: number | null;
  chainAperturaPct?: number | null;
  createdAt: Date;
}
