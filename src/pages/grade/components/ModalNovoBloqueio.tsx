import React, { useState, useEffect } from 'react';
import { BloqueioAgenda } from '@/types/availability';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { X, Calendar, Repeat } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { DaySelector } from './DaySelector';
import { ColorTokenPicker } from '@/components/ColorTokenPicker';
import { normalizeColorId } from '@/lib/colors';

interface Props {
  onClose: () => void;
  bloqueioToEdit?: BloqueioAgenda;
}

export function ModalNovoBloqueio({ onClose, bloqueioToEdit }: Props) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Partial<BloqueioAgenda>>({
    titulo: '',
    tipo: 'bloqueio',
    categoria: 'pessoal',
    dias_semana: [1],
    hora_inicio: '12:00',
    hora_fim: '13:00',
    recorrente: true,
    data_especifica: '',
    cor: 'grafite',
    ativo: true,
  });

  useEffect(() => {
    if (bloqueioToEdit) {
      setForm({
        ...bloqueioToEdit,
        dias_semana: (bloqueioToEdit as any).dia_semana !== undefined ? [(bloqueioToEdit as any).dia_semana] : (bloqueioToEdit.dias_semana || []),
      });
    }
  }, [bloqueioToEdit]);

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const isRotina = e.target.value === 'rotina';
    setForm({
      ...form, 
      tipo: e.target.value as any,
      cor: isRotina ? 'verde' : 'grafite'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.titulo || !form.hora_inicio || !form.hora_fim) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (form.recorrente && (!form.dias_semana || form.dias_semana.length === 0)) {
      toast.error('Selecione pelo menos um dia da semana');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...form,
        cor: normalizeColorId(form.cor),
        user_id: user.uid,
        titulo: form.titulo!,
        tipo: form.tipo || 'bloqueio',
        categoria: form.categoria!,
        hora_inicio: form.hora_inicio!,
        hora_fim: form.hora_fim!,
        recorrente: form.recorrente ?? true,
        ativo: form.ativo ?? true,
        dias_semana: form.recorrente ? form.dias_semana : [],
      };

      if (!payload.recorrente) {
          payload.data_especifica = form.data_especifica;
      } else {
          delete payload.data_especifica;
      }

      // Clean up legacy field if present
      delete payload.dia_semana;

      // Remove any undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (bloqueioToEdit?.id) {
        await availabilityService.updateBloqueio(bloqueioToEdit.id, payload);
        toast.success(`Salvando ${form.tipo === 'rotina' ? 'rotina' : 'bloqueio'}...`);
      } else {
        await availabilityService.createBloqueio(payload as Omit<BloqueioAgenda, 'id' | 'created_at'>);
        toast.success(`${form.tipo === 'rotina' ? 'Rotina' : 'Bloqueio'} cadastrado!`);
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar no banco de dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-container rounded-3xl border border-outline/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-outline/5">
          <h2 className="text-xl font-bold text-on-surface">
            {bloqueioToEdit ? 'Editar Bloqueio' : 'Novo Bloqueio de Agenda'}
          </h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="bloqueio-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex bg-background border border-outline/10 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleTipoChange({ target: { value: 'bloqueio' } } as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                    form.tipo === 'bloqueio' ? 'bg-primary text-on-primary shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  BLOQUEIO
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoChange({ target: { value: 'rotina' } } as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                    form.tipo === 'rotina' ? 'bg-primary text-on-primary shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  ROTINA
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  placeholder="Ex: Academia, Trabalho, Deslocamento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Categoria *
                  </label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm({...form, categoria: e.target.value})}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="trabalho">Trabalho</option>
                    <option value="academia">Academia</option>
                    <option value="pessoal">Compromisso Pessoal</option>
                    <option value="saude">Saúde</option>
                    <option value="descanso">Descanso</option>
                    <option value="deslocamento">Deslocamento</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cor (Paleta do Revisa+)</label>
                  <div className="bg-background border border-outline/20 rounded-xl p-3">
                    <ColorTokenPicker 
                      value={form.cor || ''} 
                      onChange={(cor) => setForm({...form, cor})} 
                      allowEmpty={false}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between p-3 border border-outline/20 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.recorrente}
                      onChange={e => setForm({...form, recorrente: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Repete semanalmente?</p>
                      <p className="text-xs text-on-surface-variant">Sempre nos mesmos dias e horários</p>
                    </div>
                  </div>
                </label>
              </div>

              {form.recorrente ? (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Dias da Semana *
                  </label>
                  <DaySelector 
                    selectedDays={form.dias_semana || []} 
                    onChange={days => setForm({...form, dias_semana: days})} 
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Data Específica *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.data_especifica || ''}
                    onChange={e => setForm({...form, data_especifica: e.target.value})}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Início *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_inicio}
                    onChange={e => setForm({...form, hora_inicio: e.target.value})}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fim *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_fim}
                    onChange={e => setForm({...form, hora_fim: e.target.value})}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-outline/5 flex justify-between gap-3 bg-surface-container-low rounded-b-3xl">
          {bloqueioToEdit?.id ? (
            <button
              type="button"
              onClick={() => {
                const tipo = form.tipo === 'rotina' ? 'rotina' : 'bloqueio';
                requestConfirm({
                  title: 'Excluir ' + (tipo === 'rotina' ? 'Rotina' : 'Bloqueio'),
                  message: `Deseja realmente excluir esta ${tipo}? Esse slot de tempo voltará a ficar disponível.`,
                  onConfirm: async () => {
                    setLoading(true);
                    console.log(`[Excluir ${tipo}] Iniciando exclusão...`, { id: bloqueioToEdit.id });
                    try {
                      if (!bloqueioToEdit.id) throw new Error(`ID do(a) ${tipo} não encontrado`);
                      await availabilityService.deleteBloqueio(bloqueioToEdit.id);
                      toast.success(`${tipo === 'rotina' ? 'Rotina' : 'Bloqueio'} excluído(a) com sucesso`);
                      onClose();
                    } catch (e: any) {
                      console.error(`[Excluir ${tipo}] Erro na exclusão:`, e);
                      const errorMsg = e instanceof Error ? e.message : String(e);
                      toast.error(`Erro ao excluir: ${errorMsg}`);
                    } finally {
                      setLoading(false);
                    }
                  }
                });
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-error bg-error/10 hover:bg-error/20 transition-colors"
            >
              Excluir
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3 relative">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              form="bloqueio-form"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Bloqueio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
