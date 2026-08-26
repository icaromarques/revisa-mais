import type { MateriaComGradeFormState, MateriaComGradeFormValidationResult } from '@/types/materiaComGradeForm';
import { validateMateriaComGradeForm } from '@/utils/materiaComGrade/validateMateriaComGradeForm';
import { GradeSlotsEditor } from './GradeSlotsEditor';
import { MateriaFormFields } from './MateriaFormFields';
import { PeriodoFormFields } from './PeriodoFormFields';

interface MateriaComGradeFormProps {
  value: MateriaComGradeFormState;
  onChange: (value: MateriaComGradeFormState) => void;
  validation?: MateriaComGradeFormValidationResult;
  showValidation?: boolean;
}

/**
 * Formulário composto Matéria + Período + Grade.
 * Usado no modo CRIAÇÃO de Materias (1C.3). Edição permanece no fluxo legado.
 */
export function MateriaComGradeForm({
  value,
  onChange,
  validation,
  showValidation = false
}: MateriaComGradeFormProps) {
  const resolvedValidation = validation ?? (showValidation ? validateMateriaComGradeForm(value) : undefined);
  const periodRequired = value.grade.length > 0;

  return (
    <div className="space-y-8">
      <MateriaFormFields
        value={value.materia}
        onChange={(materia) => onChange({ ...value, materia })}
        errors={resolvedValidation?.errors.materia}
      />
      <PeriodoFormFields
        value={value.periodo}
        onChange={(periodo) => onChange({ ...value, periodo })}
        errors={resolvedValidation?.errors.periodo}
        periodRequired={periodRequired}
      />
      <GradeSlotsEditor
        slots={value.grade}
        onChange={(grade) => onChange({ ...value, grade })}
        errors={resolvedValidation?.errors.grade}
      />
    </div>
  );
}
