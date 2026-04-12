import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db';

export async function generateStudyReportPdf(studyUID: string, res: Response) {
  const [rows] = await pool.query<any[]>(
    `SELECT s.studyUID, s.createdAt, p.id as patientId, p.nombre_encrypted, p.edad, p.sexo, p.pesoKg, p.estaturaM,
            a.tibiofemoralAngleDeg, a.tibiofemoralClassification,
            a.chainFlexionPct, a.chainExtensionPct, a.chainAperturaPct
       FROM studies s
       JOIN patients p ON p.id = s.patientId
       LEFT JOIN analyses a ON a.studyUID = s.studyUID
      WHERE s.studyUID = ?
      LIMIT 1`,
    [studyUID]
  );

  if (!rows.length) {
    res.status(404).json({ message: 'Estudio no encontrado' });
    return;
  }

  const row = rows[0];

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');

  doc.pipe(res);

  doc
    .fontSize(16)
    .fillColor('#0f172a')
    .text('Informe de análisis biomecánico de miembros inferiores', { align: 'left' })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#334155')
    .text(`Study UID: ${row.studyUID}`)
    .text(`Fecha: ${new Date(row.createdAt).toLocaleString('es-ES')}`)
    .moveDown();

  doc.fontSize(12).fillColor('#0f172a').text('Datos del paciente', { underline: true }).moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#020617')
    .text(`ID: ${row.patientId}`)
    .text(`Edad: ${row.edad} años`)
    .text(`Sexo: ${row.sexo}`)
    .text(`Peso: ${row.pesoKg} kg`)
    .text(`Estatura: ${row.estaturaM} m`)
    .moveDown();

  doc.fontSize(12).fillColor('#0f172a').text('Resultados angulares', { underline: true }).moveDown(0.5);

  if (row.tibiofemoralAngleDeg != null) {
    doc
      .fontSize(10)
      .fillColor('#020617')
      .text(
        `Ángulo tibiofemoral: ${row.tibiofemoralAngleDeg.toFixed(1)}° (${row.tibiofemoralClassification ?? 'sin clasificar'})`
      );
  } else {
    doc.fontSize(10).fillColor('#64748b').text('Ángulo tibiofemoral: no disponible');
  }

  doc.moveDown();
  doc.fontSize(12).fillColor('#0f172a').text('Cadenas musculares (porcentajes)', { underline: true }).moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor('#020617')
    .text(`Cadena de flexión: ${row.chainFlexionPct ?? '-'}%`)
    .text(`Cadena de extensión: ${row.chainExtensionPct ?? '-'}%`)
    .text(`Cadena de apertura: ${row.chainAperturaPct ?? '-'}%`);

  doc.end();
}
