import { pool } from '../../config/db';
import type { PatientEntity, ClinicalDataEntity } from '../../entities/patient';
import { encrypt, decrypt } from '../../services/crypto';
import { v4 as uuid } from 'uuid';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export async function createPatientRepo(payload: {
  nombre: string;
  edad: number;
  sexo: string;
  pesoKg: number;
  estaturaM: number;
  antecedentes?: string;
  diagnosticoPrincipal?: string;
  notas?: string;
}): Promise<{ patient: PatientEntity; clinical?: ClinicalDataEntity }> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const random = Math.floor(Math.random() * 99999);
    const patientId = `patient-${String(random).padStart(5, '0')}`;

    const now = new Date();

    await conn.query(
      'INSERT INTO patients (id, nombre_encrypted, edad, sexo, pesoKg, estaturaM, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patientId, encrypt(payload.nombre), payload.edad, payload.sexo, payload.pesoKg, payload.estaturaM, now]
    );

    let clinical: ClinicalDataEntity | undefined;
    if (payload.antecedentes || payload.diagnosticoPrincipal || payload.notas) {
      const clinicalId = uuid();
      await conn.query(
        'INSERT INTO clinical_data (id, patientId, antecedentes, diagnosticoPrincipal_encrypted, notas, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [
          clinicalId,
          patientId,
          payload.antecedentes ?? null,
          payload.diagnosticoPrincipal ? encrypt(payload.diagnosticoPrincipal) : null,
          payload.notas ?? null,
          now,
        ]
      );
      clinical = {
        id: clinicalId,
        patientId,
        antecedentes: payload.antecedentes ?? null,
        diagnosticoPrincipal_encrypted: payload.diagnosticoPrincipal
          ? encrypt(payload.diagnosticoPrincipal)
          : null,
        notas: payload.notas ?? null,
        createdAt: now,
      };
    }

    await conn.commit();

    const patient: PatientEntity = {
      id: patientId,
      nombre_encrypted: encrypt(payload.nombre),
      edad: payload.edad,
      sexo: payload.sexo,
      pesoKg: payload.pesoKg,
      estaturaM: payload.estaturaM,
      createdAt: now,
    };

    return { patient, clinical };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getPatientByIdRepo(patientId: string): Promise<PatientEntity | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM patients WHERE id = ?', [patientId]);
  const typed = rows as PatientEntity[];
  if (!typed.length) return null;
  return typed[0];
}

export function mapPatientEntityToDto(entity: PatientEntity) {
  return {
    id: { value: entity.id },
    nombre: decrypt(entity.nombre_encrypted),
    edad: entity.edad,
    sexo: entity.sexo,
    pesoKg: entity.pesoKg,
    estaturaM: entity.estaturaM,
    createdAt: entity.createdAt,
  };
}

export async function listPatientsRepo(limit = 50): Promise<PatientEntity[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM patients ORDER BY createdAt DESC LIMIT ?',
    [limit]
  );
  return rows as PatientEntity[];
}

export async function updatePatientRepo(payload: {
  id: string;
  nombre: string;
  edad: number;
  sexo: string;
  pesoKg: number;
  estaturaM: number;
}): Promise<PatientEntity | null> {
  const { id, nombre, edad, sexo, pesoKg, estaturaM } = payload;
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE patients SET nombre_encrypted = ?, edad = ?, sexo = ?, pesoKg = ?, estaturaM = ? WHERE id = ?',
    [encrypt(nombre), edad, sexo, pesoKg, estaturaM, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const updated = await getPatientByIdRepo(id);
  return updated;
}

export async function deletePatientRepo(patientId: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM patients WHERE id = ?', [patientId]);
  return result.affectedRows > 0;
}
