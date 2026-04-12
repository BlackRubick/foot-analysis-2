import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { decrypt } from '../../services/crypto';

interface CountRow extends RowDataPacket {
  total: number;
}

export async function getDashboardStatsController(_req: Request, res: Response) {
  try {
    const [[patientsCount]] = await pool.query<CountRow[]>(
      'SELECT COUNT(*) AS total FROM patients'
    );

    const [[analysesCount]] = await pool.query<CountRow[]>(
      'SELECT COUNT(*) AS total FROM analyses'
    );

    const [[analysesRecent]] = await pool.query<CountRow[]>(
      'SELECT COUNT(*) AS total FROM analyses WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    const [lastPatientRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre_encrypted, edad, sexo, pesoKg, estaturaM, createdAt FROM patients ORDER BY createdAt DESC LIMIT 1'
    );

    let lastPatient: any = null;
    if (lastPatientRows.length) {
      const row = lastPatientRows[0] as RowDataPacket & {
        id: string;
        nombre_encrypted: string;
        edad: number;
        sexo: 'M' | 'F' | 'Otro';
        pesoKg: number;
        estaturaM: number;
        createdAt: Date;
      };
      lastPatient = {
        id: { value: row.id },
        nombre: decrypt(row.nombre_encrypted),
        edad: row.edad,
        sexo: row.sexo,
        pesoKg: row.pesoKg,
        estaturaM: row.estaturaM,
        createdAt: row.createdAt,
      };
    }

    return res.json({
      totalPatients: patientsCount?.total ?? 0,
      totalAnalyses: analysesCount?.total ?? 0,
      analysesLast7Days: analysesRecent?.total ?? 0,
      lastPatient,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ message: 'Error al obtener estadísticas de dashboard' });
  }
}
