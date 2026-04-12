import type { Request, Response } from 'express';
import {
  createPatientRepo,
  getPatientByIdRepo,
  listPatientsRepo,
  mapPatientEntityToDto,
  updatePatientRepo,
  deletePatientRepo,
} from './patient.repository';

export async function createPatientController(req: Request, res: Response) {
  try {
    const { nombre, edad, sexo, pesoKg, estaturaM, antecedentes, diagnosticoPrincipal, notas } = req.body;
    const { patient, clinical } = await createPatientRepo({
      nombre,
      edad: Number(edad),
      sexo,
      pesoKg: Number(pesoKg),
      estaturaM: Number(estaturaM),
      antecedentes,
      diagnosticoPrincipal,
      notas,
    });

    res.status(201).json({
      patient: mapPatientEntityToDto(patient),
      clinical,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Error al crear paciente' });
  }
}

export async function getPatientByIdController(req: Request, res: Response) {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    const patient = await getPatientByIdRepo(patientId);
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json(mapPatientEntityToDto(patient));
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener paciente' });
  }
}

export async function listPatientsController(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit ?? 50);
    const entities = await listPatientsRepo(Number.isFinite(limit) && limit > 0 ? limit : 50);
    const patients = entities.map((p) => mapPatientEntityToDto(p));
    res.json(patients);
  } catch (e) {
    res.status(500).json({ message: 'Error al listar pacientes' });
  }
}

export async function updatePatientController(req: Request, res: Response) {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    const { nombre, edad, sexo, pesoKg, estaturaM } = req.body;

    const updated = await updatePatientRepo({
      id: patientId,
      nombre,
      edad: Number(edad),
      sexo,
      pesoKg: Number(pesoKg),
      estaturaM: Number(estaturaM),
    });

    if (!updated) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    res.json(mapPatientEntityToDto(updated));
  } catch (e) {
    res.status(500).json({ message: 'Error al actualizar paciente' });
  }
}

export async function deletePatientController(req: Request, res: Response) {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    const deleted = await deletePatientRepo(patientId);
    if (!deleted) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (e) {
    res.status(500).json({ message: 'Error al eliminar paciente' });
  }
}
