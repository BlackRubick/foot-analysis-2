import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { deletePatient, listPatients, updatePatient } from '../../infrastructure/repositories/patientRepository';
import type { PatientPersonalData } from '../../domain/patient';
import { useAppStore } from '../hooks/useAppStore';

export const PatientsListPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientPersonalData[]>([]);
  const [selected, setSelected] = useState<PatientPersonalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editEdad, setEditEdad] = useState('');
  const [editSexo, setEditSexo] = useState<'M' | 'F' | 'Otro'>('M');
  const [editPesoKg, setEditPesoKg] = useState('');
  const [editEstaturaM, setEditEstaturaM] = useState('');
  const navigate = useNavigate();

  const setPatient = useAppStore((s) => s.setPatient);
  const setConsentUploaded = useAppStore((s) => s.setConsentUploaded);
  const startStudy = useAppStore((s) => s.startStudy);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await listPatients(100);
        if (mounted) setPatients(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const beginEditSelected = () => {
    if (!selected) return;
    setEditNombre(selected.nombre ?? '');
    setEditEdad(String(selected.edad ?? ''));
    setEditSexo((selected.sexo as 'M' | 'F' | 'Otro') ?? 'M');
    setEditPesoKg(String(selected.pesoKg ?? ''));
    setEditEstaturaM(String(selected.estaturaM ?? ''));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updatePatient(selected.id.value, {
        nombre: editNombre,
        edad: Number(editEdad),
        sexo: editSexo,
        pesoKg: Number(editPesoKg),
        estaturaM: Number(editEstaturaM),
      });

      setPatients((prev) => prev.map((p) => (p.id.value === updated.id.value ? updated : p)));
      setSelected(updated);
      setPatient(updated);

      await Swal.fire({
        icon: 'success',
        title: 'Paciente actualizado',
        text: 'Los datos del paciente se actualizaron correctamente.',
        confirmButtonColor: '#0ea5e9',
      });

      setEditing(false);
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: error?.message ?? 'Ocurrió un error al actualizar el paciente.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selected) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar paciente?',
      text: `Esta acción eliminará al paciente ${selected.nombre} y sus estudios asociados.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      await deletePatient(selected.id.value);

      setPatients((prev) => prev.filter((p) => p.id.value !== selected.id.value));
      setSelected(null);
      setEditing(false);

      await Swal.fire({
        icon: 'success',
        title: 'Paciente eliminado',
        text: 'El paciente se eliminó correctamente.',
        confirmButtonColor: '#0ea5e9',
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: error?.message ?? 'Ocurrió un error al eliminar el paciente.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleSelectAndMaybeStartStudy = async (patient: PatientPersonalData) => {
    setSelected(patient);

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Iniciar análisis con este paciente?',
      text: `Se creará un nuevo estudio para ${patient.nombre}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0ea5e9',
    });

    if (!result.isConfirmed) return;

    setPatient(patient);
    setConsentUploaded(false);

    try {
      const response = await fetch('/api/studies/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id.value }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409 && data.message?.includes('No existe consentimiento informado')) {
          const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Falta consentimiento informado',
            text: 'Este paciente no tiene consentimiento cargado. ¿Desea ir a la pantalla para adjuntarlo ahora?',
            showCancelButton: true,
            confirmButtonText: 'Sí, ir a consentimiento',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
          });

          if (confirm.isConfirmed) {
            navigate('/patients/new');
          }

          return;
        }

        throw new Error(data.message ?? 'No se pudo iniciar el estudio');
      }

      startStudy({ value: data.studyUID });

      await Swal.fire({
        icon: 'success',
        title: 'Estudio iniciado',
        text: 'Se ha iniciado un nuevo estudio para este paciente.',
        confirmButtonColor: '#0ea5e9',
      });

      navigate('/capture');
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al iniciar estudio',
        text: error?.message ?? 'Ocurrió un error al iniciar el estudio.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="clinical-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Listado de pacientes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Seleccione un paciente para ver su ficha básica.</p>
        </div>
        {loading && <p className="text-xs text-slate-600 dark:text-slate-500">Cargando pacientes…</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 clinical-card p-4">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="py-2">ID</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Edad</th>
                <th className="py-2">Sexo</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id.value}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer dark:border-slate-900 dark:hover:bg-slate-900/60 ${
                    selected?.id.value === p.id.value ? 'bg-slate-100 dark:bg-slate-900/80' : ''
                  }`}
                  onClick={() => void handleSelectAndMaybeStartStudy(p)}
                >
                  <td className="py-1 pr-2 text-[11px] text-slate-500 dark:text-slate-400">{p.id.value}</td>
                  <td className="py-1 pr-2">{p.nombre}</td>
                  <td className="py-1 pr-2">{p.edad}</td>
                  <td className="py-1 pr-2">{p.sexo}</td>
                </tr>
              ))}
              {!patients.length && !loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-600 dark:text-slate-500">
                    No hay pacientes registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="clinical-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Ficha del paciente</h3>
          {!selected ? (
            <p className="text-xs text-slate-600 dark:text-slate-500">Seleccione un paciente en la tabla para ver sus datos.</p>
          ) : (
            <div className="space-y-3 text-xs text-slate-800 dark:text-slate-200">
              {!editing ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Identificación</p>
                    <p className="font-medium">{selected.nombre}</p>
                    <p className="text-slate-600 dark:text-slate-300">{selected.id.value}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="mt-1 text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Datos básicos</p>
                    <p>
                      {selected.edad} años · {selected.sexo}
                    </p>
                    <p>
                      {selected.pesoKg} kg · {selected.estaturaM} m
                    </p>
                  </div>

                  {selected.createdAt && (
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">
                      Registrado el {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="clinical-button-primary text-[11px] px-3 py-1"
                      onClick={beginEditSelected}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-red-500/70 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={handleDeleteSelected}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Nombre</p>
                      <input
                        className="clinical-input mt-1 text-xs"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Edad</p>
                        <input
                          type="number"
                          className="clinical-input mt-1 text-xs"
                          value={editEdad}
                          onChange={(e) => setEditEdad(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Sexo</p>
                        <select
                          className="clinical-input mt-1 text-xs"
                          value={editSexo}
                          onChange={(e) => setEditSexo(e.target.value as 'M' | 'F' | 'Otro')}
                        >
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Peso (kg)</p>
                        <input
                          type="number"
                          className="clinical-input mt-1 text-xs"
                          value={editPesoKg}
                          onChange={(e) => setEditPesoKg(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">Estatura (m)</p>
                      <input
                        type="number"
                        className="clinical-input mt-1 text-xs"
                        value={editEstaturaM}
                        onChange={(e) => setEditEstaturaM(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="clinical-button-primary text-[11px] px-3 py-1"
                      onClick={() => void handleSaveEdit()}
                      disabled={saving}
                    >
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
