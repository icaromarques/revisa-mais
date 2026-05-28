import { AgendaItem } from '@/lib/dashboard/agenda';
import { DashboardEmptyState } from './DashboardEmptyState';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { isPast, isFuture, isSameHour } from 'date-fns';

interface Props {
  agenda: AgendaItem[];
  compact?: boolean;
  onItemClick?: (item: AgendaItem) => void;
}

export function DashboardAgendaDiaCard({ agenda, compact = false, onItemClick }: Props) {
  if (agenda.length === 0) {
    return (
      <DashboardEmptyState 
        icon={CalendarIcon} 
        description="Nenhum compromisso marcado para hoje." 
        compact 
      />
    );
  }

  const limit = compact ? 5 : agenda.length;
  const displayItems = agenda.slice(0, limit);
  const hasMore = agenda.length > limit;

  return (
    <div className="relative pl-3">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-outline/20"></div>
      
      <div className="space-y-4">
        {displayItems.map((item, idx) => {
          const past = isPast(item.dateObj) && !isSameHour(item.dateObj, new Date());
          const current = isSameHour(item.dateObj, new Date());
          
          return (
            <div key={item.id + idx} className={`relative flex gap-4 ${past ? 'opacity-50' : ''}`}>
              <div className="mt-1 relative z-10 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center`} style={{ backgroundColor: item.color }}></div>
              </div>
              
              <div 
                onClick={() => onItemClick && onItemClick(item)}
                className={`flex-1 p-3 rounded-xl border border-outline/5 transition-all text-left ${onItemClick ? 'cursor-pointer hover:border-primary/30' : ''} ${current ? 'bg-primary/5 border-primary/20 scale-[1.02]' : 'bg-surface-container-low hover:bg-surface-container'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-sm leading-tight flex items-center gap-2 ${item.type === 'bloqueio' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                    {item.title}
                    {item.rawData?.origem === 'automatica' && (
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase bg-primary/10 text-primary" title="Horário sugerido automaticamente">Auto</span>
                    )}
                  </h4>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-on-surface-variant bg-on-surface-variant/10 px-1.5 py-0.5 rounded">{item.timeStart}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-outline">{item.type}</span>
                  {current && <span className="text-[9px] font-black uppercase tracking-wider text-primary animate-pulse">Agora</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {hasMore && (
        <div className="mt-4 text-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-outline">+{agenda.length - limit} compromissos</span>
        </div>
      )}
    </div>
  );
}
