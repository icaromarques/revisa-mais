import { BloqueioAgenda } from '@/types/availability';
import { CalendarX2, Clock, Tag } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { availabilityService } from '@/services/availabilityService';
import { toast } from '@/lib/toast';
import React from 'react';

interface Props {
  bloqueios: BloqueioAgenda[];
  onEdit: (item: BloqueioAgenda) => void;
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function BloqueiosLista({ bloqueios, onEdit }: Props) {
  const { requestConfirm } = useConfirm();

  const sorted = [...bloqueios].sort((a, b) => {
    if (a.recorrente !== b.recorrente) return a.recorrente ? -1 : 1;
    const dayA = a.dias_semana?.[0] ?? a.dia_semana ?? 0;
    const dayB = b.dias_semana?.[0] ?? b.dia_semana ?? 0;
    if (dayA !== dayB) return dayA - dayB;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: 'Excluir Bloqueio',
      message: 'Deseja excluir este bloqueio? Esse horário voltará a ficar disponível.',
      onConfirm: async () => {
        try {
          await availabilityService.deleteBloqueio(id);
          toast.success("Bloqueio excluído!");
        } catch (error) {
          toast.error("Erro ao excluir bloqueio.");
        }
      }
    });
  };

  const handleToggleActive = async (item: BloqueioAgenda, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if(!item.id) return;
      await availabilityService.updateBloqueio(item.id, { ativo: !item.ativo });
      toast.success(item.ativo ? "Bloqueio inativado" : "Bloqueio ativado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  if (bloqueios.length === 0) {
    return (
      <div className="text-center py-20 bg-surface-container-low rounded-3xl border border-outline/10">
        <CalendarX2 className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <p className="text-on-surface-variant font-medium">Nenhum bloqueio pessoal cadastrado</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map(item => (
        <div 
          key={item.id}
          onClick={() => onEdit(item)}
          className={`p-5 rounded-3xl border border-outline/10 cursor-pointer transition-all hover:scale-[1.02] ${!item.ativo ? 'opacity-60 grayscale' : 'bg-surface-container'}`}
          style={{ borderTopWidth: '4px', borderTopColor: item.cor || '#6B7280' }}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-wrap gap-1">
               {item.recorrente && (item.dias_semana || (item as any).dia_semana !== undefined) ? (
                  (item.dias_semana || [(item as any).dia_semana]).map(d => (
                    <span key={d} className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant bg-on-surface-variant/10 px-2 py-0.5 rounded-full">
                      {DIAS[d]}
                    </span>
                  ))
               ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant bg-on-surface-variant/10 px-2 py-0.5 rounded-full">
                    Data: {item.data_especifica}
                  </span>
               )}
            </div>
            <div className="flex gap-2">
               <button onClick={(e) => handleToggleActive(item, e)} className="text-[10px] uppercase font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded">
                 {item.ativo ? 'Desativar' : 'Ativar'}
               </button>
            </div>
          </div>
          
          <h3 className="font-bold text-lg text-on-surface leading-tight mb-3">{item.titulo}</h3>
          
          <div className="space-y-1.5 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{item.hora_inicio} - {item.hora_fim}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" />
              <span className="capitalize">{item.categoria}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-outline/5 flex justify-between items-center">
            <span className="text-[10px] text-on-surface-variant opacity-70">
              {item.recorrente ? 'Recorrente' : 'Específico'}
            </span>
            <button onClick={(e) => handleDelete(item.id!, e)} className="text-error hover:text-error/80 text-xs font-bold px-2 py-1 bg-error/10 rounded-lg">
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
