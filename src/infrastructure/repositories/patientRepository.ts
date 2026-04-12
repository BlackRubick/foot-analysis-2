import { httpClient } from '../httpClient';
import type { PatientPersonalData, ClinicalData, PatientId } from '../../domain/patient';

export interface CreatePatientPayload {
  nombre: string;
  edad: number;
  sexo: string;
  pesoKg: number;
  estaturaM: number;
  antecedentes?: string;
  diagnosticoPrincipal?: string;
  notas?: string;
}

export async function createPatient(payload: CreatePatientPayload): Promise<{
  patient: PatientPersonalData;
  clinical?: ClinicalData;
}> {
  const { data } = await httpClient.post('/patients', payload);
  return data;
}

export async function getPatientById(patientId: PatientId['value']): Promise<PatientPersonalData | null> {
  const { data } = await httpClient.get(`/patients/${patientId}`);
  return data ?? null;
}

export async function listPatients(limit = 50): Promise<PatientPersonalData[]> {
  const { data } = await httpClient.get<PatientPersonalData[]>(`/patients`, {
    params: { limit },
  });
  return data ?? [];
}

export interface UpdatePatientPayload {
  nombre: string;
  edad: number;
  sexo: string;
  pesoKg: number;
  estaturaM: number;
}

export async function updatePatient(patientId: PatientId['value'], payload: UpdatePatientPayload): Promise<PatientPersonalData> {
  const { data } = await httpClient.put<PatientPersonalData>(`/patients/${patientId}`, payload);
  return data;
}

export async function deletePatient(patientId: PatientId['value']): Promise<void> {
  await httpClient.delete(`/patients/${patientId}`);
}
