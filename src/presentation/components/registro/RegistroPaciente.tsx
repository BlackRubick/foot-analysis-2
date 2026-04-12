import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '../../hooks/useAppStore';
import { createPatient } from '../../../infrastructure/repositories/patientRepository';
import Swal from 'sweetalert2';

const schema = z.object({
  nombre: z.string().min(3, 'Nombre muy corto'),
  edad: z.coerce.number().int().min(1).max(120),
  sexo: z.enum(['M', 'F', 'Otro']),
  pesoKg: z.coerce.number().min(10).max(300),
  estaturaM: z.coerce.number().min(0.5).max(2.5),
  antecedentes: z.string().optional(),
  diagnosticoPrincipal: z.string().optional(),
  notas: z.string().optional(),
});

export type RegistroPacienteFormValues = z.infer<typeof schema>;

export const RegistroPaciente: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegistroPacienteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sexo: 'M',
    },
  });

  const setPatient = useAppStore((s) => s.setPatient);
  const startStudy = useAppStore((s) => s.startStudy);

  const onSubmit = async (values: RegistroPacienteFormValues) => {
    try {
      const { patient, clinical } = await createPatient(values);
      setPatient(patient, clinical);

      const response = await fetch('/api/studies/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id.value }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'No se pudo iniciar el estudio');
      }

      const data = await response.json();
      startStudy({ value: data.studyUID });

      await Swal.fire({
        icon: 'success',
        title: 'Paciente registrado',
        text: 'El paciente y el estudio se crearon correctamente.',
        confirmButtonColor: '#0ea5e9',
      });

      reset();
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: error?.message ?? 'Ocurrió un error al registrar el paciente.',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  return (
    <div className="clinical-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Registro de paciente</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">Paso 1 de 5 · Datos personales y clínicos básicos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-800 dark:text-slate-300">Nombre completo</label>
          <input className="clinical-input mt-1" {...register('nombre')} />
          {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-800 dark:text-slate-300">Edad</label>
            <input type="number" className="clinical-input mt-1" {...register('edad')} />
            {errors.edad && <p className="mt-1 text-xs text-red-400">{errors.edad.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-800 dark:text-slate-300">Sexo</label>
            <select className="clinical-input mt-1" {...register('sexo')}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
            {errors.sexo && <p className="mt-1 text-xs text-red-400">{errors.sexo.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-800 dark:text-slate-300">Peso (kg)</label>
            <input type="number" step="0.1" className="clinical-input mt-1" {...register('pesoKg')} />
            {errors.pesoKg && <p className="mt-1 text-xs text-red-400">{errors.pesoKg.message}</p>}
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-slate-800 dark:text-slate-300">Estatura (m)</label>
          <input type="number" step="0.01" className="clinical-input mt-1" {...register('estaturaM')} />
          {errors.estaturaM && <p className="mt-1 text-xs text-red-400">{errors.estaturaM.message}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-800 dark:text-slate-300">Antecedentes relevantes</label>
          <textarea rows={2} className="clinical-input mt-1" {...register('antecedentes')} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-800 dark:text-slate-300">Diagnóstico principal</label>
          <textarea rows={2} className="clinical-input mt-1" {...register('diagnosticoPrincipal')} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-800 dark:text-slate-300">Notas clínicas adicionales</label>
          <textarea rows={2} className="clinical-input mt-1" {...register('notas')} />
        </div>

        <div className="md:col-span-2 flex justify-end pt-2">
          <button type="submit" className="clinical-button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
};
