import { Trash2 } from 'lucide-react';
import { DaySelector } from '@/components/common/DaySelector';
import { TimeInputMasked } from '@/components/ui/TimeInputMasked';
import type { GradeSlotFormData } from '@/types/materiaComGradeForm';

interface GradeSlotRowProps {
  slot: GradeSlotFormData;
  index: number;
  onChange: (slot: GradeSlotFormData) => void;
  onRemove: () => void;
  errors?: string[];
  canRemove: boolean;
}

export function GradeSlotRow({
  slot,
  index,
  onChange,
  onRemove,
  errors = [],
  canRemove
}: GradeSlotRowProps) {
  const update = <K extends keyof GradeSlotFormData>(key: K, value: GradeSlotFormData[K]) => {
    onChange({ ...slot, [key]: value });
  };

  return (
    <div
      className={`p-4 rounded-2xl border bg-surface-container-lowest space-y-4 ${
        errors.length > 0 ? 'border-error/40' : 'border-outline/20'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Horário {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-error font-bold flex items-center gap-1 hover:underline"
          >
            <Trash2 className="w-3 h-3" />
            Excluir
          </button>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
          Dias da semana
        </label>
        <DaySelector
          selectedDays={slot.dias_semana}
          onChange={(days) => update('dias_semana', days)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Início
          </label>
          <TimeInputMasked
            value={slot.hora_inicio}
            onValueChange={(val) => update('hora_inicio', val)}
            className="[&_input]:bg-background [&_input]:border-outline/20 [&_input]:rounded-xl [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm"
          />
        </div>
        <span className="hidden sm:block text-on-surface-variant font-bold pb-2">–</span>
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Fim
          </label>
          <TimeInputMasked
            value={slot.hora_fim}
            onValueChange={(val) => update('hora_fim', val)}
            className="[&_input]:bg-background [&_input]:border-outline/20 [&_input]:rounded-xl [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Local/Sala
          </label>
          <input
            type="text"
            value={slot.local ?? ''}
            onChange={(e) => update('local', e.target.value)}
            placeholder="Opcional"
            className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
          Observações (opcional)
        </label>
        <input
          type="text"
          value={slot.observacoes ?? ''}
          onChange={(e) => update('observacoes', e.target.value)}
          placeholder="Ex.: Laboratório nas semanas de prática"
          className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((error) => (
            <li key={error} className="text-xs text-error">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
