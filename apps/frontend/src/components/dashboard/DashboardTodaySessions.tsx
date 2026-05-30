import { Clock, TrendingUp, CheckCircle2, MoreHorizontal, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { parseValidDate, formatDuration } from '@/lib/utils';

interface Props {
  sessoes: any[];
  materiasMap: Record<string, { nome: string; cor: string }>;
}

export function DashboardTodaySessions({ sessoes, materiasMap }: Props) {
  const navigate = useNavigate();
  
  if (sessoes.length === 0) return null;

  const totalMinutos = sessoes.reduce((acc, s) => acc + (s.tempo_estudado_minutos || 0), 0);
  const totalQuestoes = sessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);
  const acertos = sessoes.reduce((acc, s) => acc + (s.acertos || 0), 0);
  const ultimasessao = sessoes[0]; // Assuming they are sorted by created_at desc

  const h = Math.floor(totalMinutos / 60);
  const m = Math.floor(totalMinutos % 60);

  return (
    <section className="glass-panel rounded-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
      <div className="p-5 border-b border-outline/50 bg-primary/5 flex justify-between items-center">
        <h3 className="font-black text-sm text-on-surface uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Sessões de Hoje
        </h3>
        <button onClick={() => navigate('/historico')} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
          DETALHES <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="p-5 bg-surface-container-low grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Quick Summary */}
        <div className="md:col-span-4 space-y-4">
          <div className="p-4 bg-surface-container-highest rounded-2xl border border-outline/10">
            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Total hoje</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary">{formatDuration((totalMinutos || 0) * 60)}</span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-bold mt-1 uppercase tracking-tight">{sessoes.length} sessões concluídas</p>
          </div>
          
          <div className="flex gap-3">
             <div className="flex-1 p-3 bg-success/10 rounded-xl border border-success/20">
                <p className="text-[9px] font-bold text-success uppercase mb-1">Acertos</p>
                <p className="text-lg font-black text-on-surface">{totalQuestoes > 0 ? `${Math.round((acertos/totalQuestoes)*100)}%` : '0%'}</p>
             </div>
             <div className="flex-1 p-3 bg-surface-container-highest rounded-xl border border-outline/10">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-1">Questões</p>
                <p className="text-lg font-black text-on-surface">{totalQuestoes}</p>
             </div>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-8 flex flex-col gap-2">
          {sessoes.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-highest/30 rounded-xl border border-outline/5 hover:border-primary/30 transition-all cursor-pointer group">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: materiasMap[s.materia_id]?.cor || '#6366f1' }}></div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">
                      {s.titulo ? s.titulo : materiasMap[s.materia_id]?.nome || 'Matéria'}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      <Clock className="inline w-2.5 h-2.5 mr-1 text-primary" />
                      {materiasMap[s.materia_id] ? `${materiasMap[s.materia_id].nome} • ` : ''}
                      {s.tempo_estudado_hhmmss || formatDuration((s.tempo_estudado_minutos || 0) * 60)} • {s.tipo?.replace(/_/g, ' ')}
                    </p>
                  </div>
               </div>
               <div className="text-[10px] font-bold text-outline uppercase group-hover:text-primary transition-colors">
                  {(() => {
                    const d = parseValidDate(s.created_at || s.data_registro);
                    return isNaN(d.getTime()) ? '--:--' : format(d, "HH:mm");
                  })()}
               </div>
            </div>
          ))}
          {sessoes.length > 3 && (
            <button onClick={() => navigate('/historico')} className="text-center text-[10px] font-black text-outline hover:text-primary transition-colors mt-2 uppercase tracking-widest">
              + {sessoes.length - 3} outras sessões hoje
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
