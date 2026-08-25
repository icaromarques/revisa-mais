import type {
  MateriaComGradeFormState,
  MateriaComGradeFormValidationResult
} from '@/types/materiaComGradeForm';
import {
  findDuplicateSlotIndexes,
  findOverlappingSlotPairs,
  validateGradeSlot
} from './gradeSlotRules';

function validatePeriodoWhenGradePresent(
  periodo: MateriaComGradeFormState['periodo'],
  hasGrade: boolean
): Partial<Record<keyof MateriaComGradeFormState['periodo'], string>> {
  const errors: Partial<Record<keyof MateriaComGradeFormState['periodo'], string>> = {};
  if (!hasGrade) return errors;

  const { periodo_inicio, periodo_fim } = periodo;

  if (!periodo_inicio && !periodo_fim) {
    errors.periodo_inicio = 'Período letivo é obrigatório quando há horários na grade';
    errors.periodo_fim = 'Período letivo é obrigatório quando há horários na grade';
  } else if (periodo_inicio && !periodo_fim) {
    errors.periodo_fim = 'Informe a data final do período letivo';
  } else if (!periodo_inicio && periodo_fim) {
    errors.periodo_inicio = 'Informe a data inicial do período letivo';
  } else if (periodo_inicio && periodo_fim && periodo_inicio > periodo_fim) {
    errors.periodo_fim = 'A data final não pode ser anterior à data inicial';
  }

  return errors;
}

export function validateMateriaComGradeForm(form: MateriaComGradeFormState): MateriaComGradeFormValidationResult {
  const errors: MateriaComGradeFormValidationResult['errors'] = {};
  const formErrors: string[] = [];

  if (!form.materia.nome.trim()) {
    errors.materia = { ...errors.materia, nome: 'Nome da matéria é obrigatório' };
  }

  if (form.materia.limite_faltas_percentual !== '') {
    const limite = Number(form.materia.limite_faltas_percentual);
    if (!Number.isFinite(limite) || limite <= 0 || limite > 100) {
      errors.materia = {
        ...errors.materia,
        limite_faltas_percentual: 'Informe um percentual entre 1 e 100'
      };
    }
  }

  const periodoErrors = validatePeriodoWhenGradePresent(form.periodo, form.grade.length > 0);
  if (Object.keys(periodoErrors).length > 0) {
    errors.periodo = periodoErrors;
  }

  const gradeErrors: Record<number, string[]> = {};
  form.grade.forEach((slot, index) => {
    const slotErrors = validateGradeSlot(slot, index);
    if (slotErrors.length > 0) gradeErrors[index] = slotErrors;
  });

  const duplicateIndexes = findDuplicateSlotIndexes(form.grade);
  for (const index of duplicateIndexes) {
    gradeErrors[index] = [
      ...(gradeErrors[index] ?? []),
      'Horário duplicado no formulário'
    ];
  }

  const overlapPairs = findOverlappingSlotPairs(form.grade);
  for (const [i, j] of overlapPairs) {
    const message = 'Sobreposição de horários no mesmo dia';
    gradeErrors[i] = [...(gradeErrors[i] ?? []), message];
    gradeErrors[j] = [...(gradeErrors[j] ?? []), message];
  }

  if (Object.keys(gradeErrors).length > 0) {
    errors.grade = gradeErrors;
  }

  const valid =
    !errors.materia &&
    !errors.periodo &&
    !errors.grade &&
    formErrors.length === 0;

  if (formErrors.length > 0) {
    errors.form = formErrors;
  }

  return { valid, errors };
}
