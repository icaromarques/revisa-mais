import type {
  MateriaComGradeApiPayload,
  MateriaComGradeCreateResponse,
  MateriaComGradeFormState,
  MateriaComGradeFormValidationResult
} from '@/types/materiaComGradeForm';
import { buildMateriaComGradePayload } from './buildMateriaComGradePayload';
import { validateMateriaComGradeForm } from './validateMateriaComGradeForm';
import {
  createRetroFaltasOcorrencias,
  type RetroFaltasCreateResult,
  type RetroFaltasPlan,
  type RetroOcorrenciaPayload
} from './retroFaltas';

export type CreateMateriaWithGradeFlowResult =
  | { status: 'validation_error'; validation: MateriaComGradeFormValidationResult }
  | { status: 'duplicate_name'; message: string }
  | { status: 'create_error'; error: unknown }
  | {
      status: 'success';
      response: MateriaComGradeCreateResponse;
      payload: MateriaComGradeApiPayload;
      retroFaltas: RetroFaltasCreateResult;
      retroFaltasPartialFailure: boolean;
    };

export interface CreateMateriaWithGradeFlowDeps {
  form: MateriaComGradeFormState;
  existingNames: string[];
  createMateriaWithGrade: (payload: MateriaComGradeApiPayload) => Promise<MateriaComGradeCreateResponse>;
  createOcorrencia: (body: RetroOcorrenciaPayload) => Promise<unknown>;
  retroFaltas: RetroFaltasPlan;
}

/**
 * Orquestra criação estrutural via POST /materias/com-grade e, em seguida,
 * faltas retroativas opcionais. Nunca recria a matéria se as faltas falharem.
 */
export async function executeCreateMateriaWithGradeFlow(
  deps: CreateMateriaWithGradeFlowDeps
): Promise<CreateMateriaWithGradeFlowResult> {
  const validation = validateMateriaComGradeForm(deps.form);
  if (!validation.valid) {
    return { status: 'validation_error', validation };
  }

  const nome = deps.form.materia.nome.trim().toLowerCase();
  const duplicate = deps.existingNames.some((n) => n.trim().toLowerCase() === nome);
  if (duplicate) {
    return {
      status: 'duplicate_name',
      message: 'Você já tem uma matéria cadastrada com este nome.'
    };
  }

  const payload = buildMateriaComGradePayload(deps.form);

  let response: MateriaComGradeCreateResponse;
  try {
    response = await deps.createMateriaWithGrade(payload);
  } catch (error) {
    return { status: 'create_error', error };
  }

  const materiaId = response.materia.id;
  const retroFaltas = await createRetroFaltasOcorrencias(
    materiaId,
    deps.retroFaltas,
    deps.createOcorrencia
  );

  return {
    status: 'success',
    response,
    payload,
    retroFaltas,
    retroFaltasPartialFailure: retroFaltas.failed > 0
  };
}
