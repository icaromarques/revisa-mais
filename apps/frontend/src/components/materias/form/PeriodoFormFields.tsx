import { Calendar as CalendarIcon } from 'lucide-react';
import { DateInputMasked } from '@/components/ui/DateInputMasked';
import type { PeriodoFormData } from '@/types/materiaComGradeForm';

interface PeriodoFormFieldsProps {
  value: PeriodoFormData;
  onChange: (value: PeriodoFormData) => void;
  errors?: Partial<Record<keyof PeriodoFormData, string>>;
  /** Quando true, início e fim passam a ser obrigatórios (ex.: há slots de grade). */
  periodRequired?: boolean;
}

export function PeriodoFormFields({
  value,
  onChange,
  errors,
  periodRequired = false
}: PeriodoFormFieldsProps) {
  const update = <K extends keyof PeriodoFormData>(key: K, next: PeriodoFormData[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
        <CalendarIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
          Período Letivo {periodRequired ? '' : '(Opcional)'}
        </h3>
      </div>

      {periodRequired && (
        <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          Como há horários na grade, informe o início e o fim do período letivo. Isso é necessário para calcular
          aulas previstas e controle de faltas.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Início do Período {periodRequired && <span className="text-error">*</span>}
          </label>
          <DateInputMasked
            value={value.periodo_inicio}
            onValueChange={(val) => update('periodo_inicio', val)}
            className={`w-full bg-surface-container-lowest border ${errors?.periodo_inicio ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]`}
          />
          {errors?.periodo_inicio && <p className="text-xs text-error mt-2">{errors.periodo_inicio}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Fim do Período {periodRequired && <span className="text-error">*</span>}
          </label>
          <DateInputMasked
            value={value.periodo_fim}
            onValueChange={(val) => update('periodo_fim', val)}
            className={`w-full bg-surface-container-lowest border ${errors?.periodo_fim ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]`}
          />
          {errors?.periodo_fim && <p className="text-xs text-error mt-2">{errors.periodo_fim}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Tipo de Período
          </label>
          <select
            value={value.tipo_periodo}
            onChange={(e) => update('tipo_periodo', e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
          >
            <option value="bimestre">Bimestre</option>
            <option value="trimestre">Trimestre</option>
            <option value="semestre">Semestre</option>
            <option value="modulo">Módulo</option>
            <option value="ano">Ano</option>
            <option value="outro">Outro (Livre)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Número do Período
          </label>
          <input
            type="number"
            value={value.numero_periodo}
            onChange={(e) => update('numero_periodo', e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
            placeholder="Ex.: 2"
            min={1}
            max={20}
          />
        </div>
      </div>
    </section>
  );
}
