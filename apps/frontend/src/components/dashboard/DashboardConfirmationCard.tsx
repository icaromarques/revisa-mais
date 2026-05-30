import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { OcorrenciaGrade } from '@/types/availability';
import { gradeOccurrenceService } from '@/services/gradeOccurrenceService';
import { toast } from '@/lib/toast';

interface Props {
  ocorrencias: OcorrenciaGrade[];
  materiasMap: Record<string, { nome: string; cor: string }>;
  onConfirmAssistida: (ocorrencia: OcorrenciaGrade) => void;
  onConfirmFalta: (ocorrencia: OcorrenciaGrade) => void;
  onCancel: (ocorrencia: OcorrenciaGrade) => void;
}

export function DashboardConfirmationCard({ ocorrencias, materiasMap, onConfirmAssistida, onConfirmFalta, onCancel }: Props) {
  const pending = ocorrencias.filter(o => o.status === 'pendente_confirmacao');

  if (pending.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-4 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Confirmação de Aulas da Grade</h3>
        </div>
        <span className="bg-primary text-on-primary text-[10px] font-black px-2 py-0.5 rounded-full">
          {pending.length} {pending.length === 1 ? 'pendente' : 'pendentes'}
        </span>
      </div>
      
      <div className="divide-y divide-outline/10">
        {pending.map((oc) => {
          const materia = materiasMap[oc.materia_id];
          return (
            <div key={oc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-high transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="w-1.5 h-10 rounded-full" 
                  style={{ backgroundColor: materia?.cor || '#ccc' }} 
                />
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{materia?.nome || 'Matéria Desconhecida'}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Prevista para {oc.data}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfirmAssistida(oc)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-success/10 text-success rounded-xl text-[11px] font-bold hover:bg-success/20 transition-all"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Assistida
                </button>
                <button
                  onClick={() => onConfirmFalta(oc)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-error/10 text-error rounded-xl text-[11px] font-bold hover:bg-error/20 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Falta
                </button>
                <button
                  onClick={() => onCancel(oc)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors"
                  title="Cancelar/Ignorar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
