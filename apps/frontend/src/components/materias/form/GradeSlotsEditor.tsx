import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import type { GradeSlotFormData } from '@/types/materiaComGradeForm';
import { createEmptyGradeSlot } from '@/utils/materiaComGrade/formDefaults';
import { GradeSlotRow } from './GradeSlotRow';

interface GradeSlotsEditorProps {
  slots: GradeSlotFormData[];
  onChange: (slots: GradeSlotFormData[]) => void;
  errors?: Record<number, string[]>;
}

export function GradeSlotsEditor({ slots, onChange, errors }: GradeSlotsEditorProps) {
  const updateSlot = (index: number, next: GradeSlotFormData) => {
    const copy = [...slots];
    copy[index] = next;
    onChange(copy);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    onChange([...slots, createEmptyGradeSlot()]);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 border-b border-outline/50 pb-2">
        <CalendarIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Grade da Matéria</h3>
      </div>

      <p className="text-xs text-on-surface-variant">
        Cada linha representa um horário recorrente. Três aulas diferentes na mesma terça devem ser três linhas
        separadas.
      </p>

      {slots.length === 0 ? (
        <div className="p-4 border border-dashed border-outline/30 rounded-2xl text-sm text-on-surface-variant text-center">
          Nenhum horário adicionado. A matéria pode ser criada sem grade.
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={slot.clientId}>
              <GradeSlotRow
                slot={slot}
                index={index}
                onChange={(next) => updateSlot(index, next)}
                onRemove={() => removeSlot(index)}
                errors={errors?.[index]}
                canRemove
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addSlot}
        className="w-full py-2.5 border border-dashed border-primary/40 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-3 h-3" />
        Adicionar horário
      </button>
    </section>
  );
}
