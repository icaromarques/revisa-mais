import { Lightbulb, ArrowRight, BookOpen, Clock, BrainCircuit } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  revisoesPendentes: any[];
  nextSlot?: any;
  onActionClick: () => void;
}

export function DashboardRecommendedActionCard({ revisoesPendentes, nextSlot, onActionClick }: Props) {
  
  const recommendation = useMemo(() => {
     if (revisoesPendentes.length > 0) {
        return {
           title: 'Quitar Revisões',
           description: 'Há revisões pendentes se acumulando na sua fila.',
           icon: BrainCircuit,
           color: 'text-tertiary',
           bg: 'bg-tertiary',
           border: 'border-tertiary/20'
        };
     }
     
     if (nextSlot) {
        return {
           title: 'Aproveitar Janela Livre',
           description: 'Você tem um tempo livre em breve. Que tal adiantar uma matéria?',
           icon: Clock,
           color: 'text-success',
           bg: 'bg-success',
           border: 'border-success/20'
        };
     }

     return {
        title: 'Explorar Resumos',
        description: 'Tudo em dia! Que tal criar ou ler um novo resumo para fixação?',
        icon: BookOpen,
        color: 'text-primary',
        bg: 'bg-primary',
        border: 'border-primary/20'
     };
  }, [revisoesPendentes, nextSlot]);

  return (
    <div className={`p-4 rounded-xl border ${recommendation.border} bg-surface-container flex items-center justify-between gap-4 group`}>
       <div className="flex items-center gap-4">
         <div className={`w-10 h-10 rounded-full ${recommendation.bg}/10 flex items-center justify-center shrink-0`}>
           <recommendation.icon className={`w-5 h-5 ${recommendation.color}`} />
         </div>
         <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-outline flex items-center gap-1.5 mb-0.5">
               <Lightbulb className="w-3 h-3" /> Ideia do Sistema
            </div>
            <h4 className="text-sm font-bold text-on-surface">{recommendation.title}</h4>
            <p className="text-[10px] text-on-surface-variant max-w-[220px] leading-tight mt-0.5">{recommendation.description}</p>
         </div>
       </div>
       <button 
          onClick={onActionClick}
          className={`shrink-0 w-8 h-8 rounded-full ${recommendation.bg} text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform`}
       >
          <ArrowRight className="w-4 h-4" />
       </button>
    </div>
  );
}
