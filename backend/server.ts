import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createPatientController,
  getPatientByIdController,
  listPatientsController,
  updatePatientController,
  deletePatientController,
} from './modules/patients/patient.controller';
import { uploadConsentController, getConsentFileController } from './modules/consents/consent.controller';
import { startStudyController, uploadStudyImageController } from './modules/studies/study.controller';
import { saveAnalysisController } from './modules/analysis/analysis.controller';
import { getDashboardStatsController } from './modules/stats/dashboard.controller';
import { generateStudyReportPdf } from './services/report';
import { pool } from './config/db';
import type { RowDataPacket } from 'mysql2/promise';

const app = express();

app.use(cors());
app.use(express.json());

const uploadRoot = path.join(process.cwd(), 'uploads');
const consentDir = path.join(uploadRoot, 'consents');
const imagesDir = path.join(uploadRoot, 'images');

[uploadRoot, consentDir, imagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const consentStorage = multer.diskStorage({
  destination: consentDir,
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    cb(null, safeName);
  },
});

const imageStorage = multer.diskStorage({
  destination: imagesDir,
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    cb(null, safeName);
  },
});

const consentUpload = multer({ storage: consentStorage });
const imageUpload = multer({ storage: imageStorage });

// Rutas de pacientes
app.post('/api/patients', createPatientController);
app.get('/api/patients', listPatientsController);
app.get('/api/patients/:patientId', getPatientByIdController);
app.put('/api/patients/:patientId', updatePatientController);
app.delete('/api/patients/:patientId', deletePatientController);

// Consentimiento informado
app.post('/api/consents', consentUpload.single('file'), uploadConsentController);
app.get('/api/consents/:consentId', getConsentFileController);

// Estudios
app.post('/api/studies/start', async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Falta patientId' });

    const [consentRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM consents WHERE patientId = ? ORDER BY createdAt DESC LIMIT 1',
      [patientId]
    );
    const consentTyped = consentRows as { id: string }[];
    if (!consentTyped.length) {
      return res.status(409).json({
        message: 'No existe consentimiento informado registrado para este paciente. Registre uno antes de iniciar un estudio.',
      });
    }

    return startStudyController(req as any, res as any);
  } catch (e) {
    return next(e);
  }
});

app.post('/api/studies/images', imageUpload.single('file'), async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Falta patientId' });

    const [consentRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM consents WHERE patientId = ? ORDER BY createdAt DESC LIMIT 1',
      [patientId]
    );
    const consentTyped = consentRows as { id: string }[];
    if (!consentTyped.length) {
      return res.status(409).json({
        message: 'No existe consentimiento informado registrado para este paciente. Registre uno antes de capturar imágenes.',
      });
    }

    return uploadStudyImageController(req as any, res as any);
  } catch (e) {
    return next(e);
  }
});

// Análisis biomecánico
app.post('/api/analysis', saveAnalysisController);

// Estadísticas para el dashboard
app.get('/api/stats/dashboard', getDashboardStatsController);

// Archivos estáticos de estudios (imágenes)
app.get('/api/static/:imageId', async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT filePath FROM study_images WHERE id = ?',
      [imageId]
    );
    const typed = rows as { filePath: string }[];
    if (!typed.length) return res.status(404).json({ message: 'Imagen no encontrada' });

    const filePath = typed[0].filePath;
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Archivo no disponible' });

    return res.sendFile(path.resolve(filePath));
  } catch (e) {
    return next(e);
  }
});

// Reportes PDF
app.get('/api/reports/:studyUID/pdf', (req, res) => generateStudyReportPdf(req.params.studyUID, res));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend clínico escuchando en puerto ${PORT}`);
});
