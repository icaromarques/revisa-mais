import { AgendaItem } from '@/lib/dashboard/agenda';
import { DashboardEmptyState } from './DashboardEmptyState';
import { BookOpen, Clock, MapPin } from 'lucide-react';

interface Props {
  agenda: AgendaItem[];
  materiasMap: Record<string, { nome: string; cor: string }>;
}

export function DashboardAulasDoDiaCard({ agenda, materiasMap }: Props) {
  const aulasHoje = agenda.filter(item => item.type === 'aula');

  if (aulasHoje.length === 0) {
    return (
      <DashboardEmptyState 
        icon={BookOpen} 
        description="Nenhuma aula programada para hoje." 
        compact 
      />
    );
  }

  return (
    <div className="space-y-3">
      {aulasHoje.map(aula => (
        <div key={aula.id} className="p-3 bg-surface-container rounded-xl border border-outline/5 hover:border-primary/20 transition-colors" style={{ borderLeftWidth: '3px', borderLeftColor: aula.color }}>
          <div className="flex justify-between items-start">
            <div>
               <h4 className="font-bold text-sm text-on-surface leading-tight">{aula.title}</h4>
               {aula.materia && (
                 <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">{materiasMap[aula.materia]?.nome}</p>
               )}
            </div>
            <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold">
               <Clock className="w-3 h-3" />
               {aula.timeStart}{aula.timeEnd ? ` - ${aula.timeEnd}` : ''}
            </div>
          </div>
          {aula.rawData?.local && (
             <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant text-[11px]">
               <MapPin className="w-3 h-3" />
               {aula.rawData.local}
             </div>
          )}
        </div>
      ))}
    </div>
  );
}
