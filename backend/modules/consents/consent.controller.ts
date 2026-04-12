import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

export async function uploadConsentController(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  const { patientId } = req.body;
  if (!file || !patientId) return res.status(400).json({ message: 'Falta archivo o patientId' });

  const id = uuid();
  const now = new Date();

  await pool.query(
    'INSERT INTO consents (id, patientId, filePath, mimeType, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, patientId, file.path, file.mimetype, now]
  );

  res.status(201).json({ id, patientId, filePath: file.path, mimeType: file.mimetype, createdAt: now });
}

export async function getConsentFileController(req: Request, res: Response) {
  const { consentId } = req.params;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT filePath, mimeType FROM consents WHERE id = ?',
    [consentId]
  );
  if (!rows.length) return res.status(404).json({ message: 'Consentimiento no encontrado' });
  const row = rows[0] as RowDataPacket & { filePath: string; mimeType: string };
  const { filePath, mimeType } = row;

  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Archivo no disponible' });

  res.setHeader('Content-Type', mimeType);
  fs.createReadStream(path.resolve(filePath)).pipe(res);
}
