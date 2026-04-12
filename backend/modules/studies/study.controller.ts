import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from '../../config/db';

export async function startStudyController(req: Request, res: Response) {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ message: 'Falta patientId' });

  const id = uuid();
  const studyUID = `1.2.826.0.1.3680043.2.1125.${Date.now()}`;
  const now = new Date();

  await pool.query('INSERT INTO studies (id, patientId, studyUID, createdAt) VALUES (?, ?, ?, ?)', [
    id,
    patientId,
    studyUID,
    now,
  ]);

  res.status(201).json({ id, patientId, studyUID, createdAt: now });
}

export async function uploadStudyImageController(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  const { patientId, studyUID, view } = req.body;
  if (!file || !patientId || !studyUID || !view) {
    return res.status(400).json({ message: 'Faltan parámetros para la imagen del estudio' });
  }

  const id = uuid();
  const now = new Date();

  await pool.query(
    'INSERT INTO study_images (id, studyUID, patientId, view, filePath, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, studyUID, patientId, view, file.path, now]
  );

  res.status(201).json({ id, patientId, studyUID, view, url: `/api/static/${id}`, capturedAt: now });
}
