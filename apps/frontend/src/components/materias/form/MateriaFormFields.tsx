import { Clock, Target, Zap } from 'lucide-react';
import { ColorTokenPicker } from '@/components/ColorTokenPicker';
import type { MateriaFormData, MateriaStatus } from '@/types/materiaComGradeForm';

interface MateriaFormFieldsProps {
  value: MateriaFormData;
  onChange: (value: MateriaFormData) => void;
  errors?: Partial<Record<keyof MateriaFormData, string>>;
}

const STATUS_OPTIONS: Array<{ id: MateriaStatus; label: string }> = [
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'concluida', label: 'Concluída' },
  { id: 'aprovada', label: 'Aprovada' },
  { id: 'reprovada', label: 'Reprovada' },
  { id: 'trancada', label: 'Trancada' }
];

export function MateriaFormFields({ value, onChange, errors }: MateriaFormFieldsProps) {
  const update = <K extends keyof MateriaFormData>(key: K, next: MateriaFormData[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Informações Básicas</h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Nome da matéria <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={value.nome}
            onChange={(e) => update('nome', e.target.value)}
            className={`w-full bg-surface-container-lowest border ${errors?.nome ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
            placeholder="Ex.: Direito Constitucional"
          />
          {errors?.nome && <p className="text-xs text-error mt-2">{errors.nome}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Descrição (Opcional)
            </label>
            <span className="text-[10px] text-on-surface-variant">{value.descricao.length}/120</span>
          </div>
          <textarea
            value={value.descricao}
            onChange={(e) => update('descricao', e.target.value.substring(0, 120))}
            className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            placeholder="Breve descrição da matéria..."
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Professor / Docente
          </label>
          <input
            type="text"
            value={value.professor}
            onChange={(e) => update('professor', e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Nome do professor"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Situação Acadêmica
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => update('status', s.id)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all ${
                  value.status === s.id
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Configuração da Matéria</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Prioridade
            </label>
            <div className="flex flex-wrap gap-2">
              {['Baixa', 'Média', 'Alta'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('prioridade', p)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
                    value.prioridade === p
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Peso / Importância
            </label>
            <div className="flex flex-wrap gap-2">
              {['Baixo', 'Médio', 'Alto'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('peso_importancia', p)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
                    value.peso_importancia === p
                      ? 'bg-secondary/20 border-secondary text-on-surface'
                      : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              Cor da Matéria
            </label>
            <div className="bg-surface-container-lowest border border-outline rounded-xl p-3">
              <ColorTokenPicker value={value.cor} onChange={(cor) => update('cor', cor)} allowEmpty={false} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Limite de Faltas (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={value.limite_faltas_percentual}
                onChange={(e) =>
                  update('limite_faltas_percentual', e.target.value ? Number(e.target.value) : '')
                }
                className={`w-full bg-surface-container-lowest border ${errors?.limite_faltas_percentual ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                placeholder="Ex.: 25"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">%</span>
            </div>
            {errors?.limite_faltas_percentual && (
              <p className="text-xs text-error mt-2">{errors.limite_faltas_percentual}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Meta semanal (horas)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.5}
                value={value.meta_semanal_horas}
                onChange={(e) => update('meta_semanal_horas', e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Ex.: 4"
              />
              <Clock className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Automação e Integração</h3>
        </div>

        <ToggleRow
          title="Ativar revisões automáticas"
          description="Lógica de repetição espaçada (1, 3, 7, 15, 30 dias)"
          checked={value.revisao_automatica_ativa}
          onChange={(checked) => update('revisao_automatica_ativa', checked)}
        />
        <ToggleRow
          title="Exibir no Calendário"
          description="Vincular aulas e eventos desta matéria"
          checked={value.exibir_no_calendario}
          onChange={(checked) => update('exibir_no_calendario', checked)}
        />
        <ToggleRow
          title="IA Tools"
          description="Permitir geração de resumos e questões com IA"
          checked={value.ia_habilitada}
          onChange={(checked) => update('ia_habilitada', checked)}
          highlight
        />
      </section>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  highlight = false
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border ${
        highlight ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-lowest border-outline'
      }`}
    >
      <div className="pr-4">
        <p className={`text-sm font-bold ${highlight ? 'text-primary flex items-center gap-1' : 'text-on-surface'}`}>
          {highlight && <Zap className="w-3 h-3" />}
          {title}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-primary' : 'bg-surface-variant'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
