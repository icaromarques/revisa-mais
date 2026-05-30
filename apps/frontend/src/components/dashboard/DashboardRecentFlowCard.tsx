import { DashboardEmptyState } from './DashboardEmptyState';
import { PenTool, Clock, Target, CalendarDays, ExternalLink, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { parseValidDate, formatDuration } from '@/lib/utils';

interface Props {
  sessoes: any[];
  materiasMap: Record<string, { nome: string; cor: string }>;
}

export function DashboardRecentFlowCard({ sessoes, materiasMap }: Props) {
  const navigate = useNavigate();

  if (sessoes.length === 0) {
    return (
      <DashboardEmptyState 
        icon={PenTool} 
        title="Nenhuma imersão recente"
        description="Suas últimas sessões de estudo aparecerão aqui." 
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3">
        {sessoes.slice(0, 5).map((sessao) => {
          const materia = materiasMap[sessao.materia_id];
          const date = parseValidDate(sessao.created_at || sessao.data_registro);
          
          return (
            <div 
              key={sessao.id} 
              onClick={() => navigate('/historico')}
              className="group relative flex flex-col p-4 bg-surface-container-low border border-outline/10 rounded-xl hover:bg-surface-container-highest transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Highlight bar with subject color */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: materia?.cor || '#6366f1' }}
              ></div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: materia?.cor || '#6366f1' }}
                    ></span>
                    <h4 className="font-bold text-[13px] text-on-surface truncate tracking-tight">
                      {sessao.titulo ? sessao.titulo : materia?.nome || 'Matéria Desconhecida'}
                    </h4>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                    {sessao.titulo && (
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="text-[11px] font-medium">{materia?.nome}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-medium">
                        {sessao.tempo_estudado_hhmmss || formatDuration((sessao.tempo_estudado_minutos || 0) * 60)}
                      </span>
                    </div>
                    
                    {sessao.total_questoes > 0 && (
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Target className="w-3 h-3 text-success" />
                        <span className="text-[11px] font-medium text-success/90">
                          {sessao.acertos}/{sessao.total_questoes} acertos
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-container-highest border border-outline/5 transition-colors uppercase tracking-tighter text-[9px]">
                        {sessao.tipo || 'Sessão'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">
                    {isNaN(date.getTime()) ? '-' : format(date, "HH:mm")}
                  </div>
                  <div className="text-[9px] text-on-surface-variant font-medium">
                    {isNaN(date.getTime()) ? '-' : format(date, "dd MMM", { locale: ptBR })}
                  </div>
                </div>
              </div>
              
              <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-4 h-4 text-primary" />
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => navigate('/historico')}
        className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl border border-primary/20 transition-all group"
      >
        Ver histórico completo
        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}
