import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from '../../config/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function saveAnalysisController(req: Request, res: Response) {
  const { studyUID, tibiofemoralAngleDeg, tibiofemoralClassification, chainScores } = req.body;
  if (!studyUID) return res.status(400).json({ message: 'Falta studyUID' });

  const [studyRows] = await pool.query<RowDataPacket[]>(
    'SELECT patientId FROM studies WHERE studyUID = ? LIMIT 1',
    [studyUID]
  );
  const studyTyped = studyRows as { patientId: string }[];
  if (!studyTyped.length) return res.status(400).json({ message: 'Estudio no válido' });

  const patientId = studyTyped[0].patientId;
  const [consentRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM consents WHERE patientId = ? ORDER BY createdAt DESC LIMIT 1',
    [patientId]
  );
  const consentTyped = consentRows as { id: string }[];
  if (!consentTyped.length) {
    return res.status(409).json({
      message: 'No existe consentimiento informado registrado para este paciente. No se puede guardar el análisis.',
    });
  }

  const id = uuid();
  const now = new Date();

  const chainFlexionPct = chainScores?.find((c: any) => c.chain === 'flexion')?.percentage ?? null;
  const chainExtensionPct = chainScores?.find((c: any) => c.chain === 'extension')?.percentage ?? null;
  const chainAperturaPct = chainScores?.find((c: any) => c.chain === 'apertura')?.percentage ?? null;

  await pool.query(
    'INSERT INTO analyses (id, studyUID, tibiofemoralAngleDeg, tibiofemoralClassification, chainFlexionPct, chainExtensionPct, chainAperturaPct, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      studyUID,
      tibiofemoralAngleDeg ?? null,
      tibiofemoralClassification ?? null,
      chainFlexionPct,
      chainExtensionPct,
      chainAperturaPct,
      now,
    ]
  );

  res.status(201).json({ id, studyUID, createdAt: now });
}
