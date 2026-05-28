import { DashboardEmptyState } from './DashboardEmptyState';
import { Target, AlertCircle } from 'lucide-react';
import { isFuture, differenceInDays, format } from 'date-fns';
import { parseValidDate } from '@/lib/utils';

interface Props {
  events: any[];
}

export function DashboardUpcomingDeadlinesCard({ events }: Props) {
  const deadlines = events.filter(e => e.data_inicio && isFuture(parseValidDate(e.data_inicio)) && ['prova', 'trabalho', 'apresentacao'].includes(e.tipo))
                          .sort((a,b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime())
                          .slice(0, 3);

  if (deadlines.length === 0) {
    return (
      <DashboardEmptyState 
        icon={Target} 
        title="Nenhuma entrega iminente"
        description="Você não possui provas ou trabalhos próximos cadastrados." 
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => {
         const d = parseValidDate(deadline.data_inicio);
         const dist = differenceInDays(d, new Date());
         const urgent = dist <= 3;

         return (
            <div key={deadline.id} className="p-3 bg-surface-container rounded-xl border border-outline/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${urgent ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                    {urgent ? <AlertCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                 </div>
                 <div>
                    <h4 className="font-bold text-sm text-on-surface leading-tight">{deadline.titulo}</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">{deadline.tipo}</p>
                 </div>
              </div>
              <div className="text-right">
                 <span className={`text-xs font-black block ${urgent ? 'text-error' : 'text-on-surface'}`}>
                    {dist === 0 ? 'Hoje' : `em ${dist} d`}
                 </span>
                 <span className="text-[9px] text-outline">{format(d, "dd MMM")}</span>
              </div>
            </div>
         );
      })}
    </div>
  );
}
