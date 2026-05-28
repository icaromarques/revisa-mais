import { Clock, CheckCircle2, Zap } from 'lucide-react';
import { DashboardEmptyState } from './DashboardEmptyState';
import { format } from 'date-fns';
import { TimeSlot } from '@/services/smartScheduleService';

interface Props {
  nextSlot: TimeSlot | null;
}

export function DashboardJanelasLivresCard({ nextSlot }: Props) {
  if (!nextSlot) {
    return (
      <DashboardEmptyState 
        icon={Clock} 
        description="Sua agenda está totalmente ocupada hoje." 
        compact 
      />
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <Zap className="w-24 h-24 text-primary" />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 relative z-10">
        <Clock className="w-4 h-4 text-primary" />
      </div>
      <div className="relative z-10 flex-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Próxima Janela Livre</h4>
        <p className="text-sm font-bold text-on-surface">
          {format(nextSlot.start, 'HH:mm')} às {format(nextSlot.end, 'HH:mm')}
        </p>
        <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed max-w-[200px]">Tempo ideal para encaixar uma revisão atrasada ou adiantar matéria.</p>
      </div>
      <div className="relative z-10">
        <button className="text-[10px] font-bold uppercase tracking-widest text-on-primary bg-primary hover:bg-primary-container px-3 py-2 rounded-lg transition-colors">
          Encaixar
        </button>
      </div>
    </div>
  );
}
