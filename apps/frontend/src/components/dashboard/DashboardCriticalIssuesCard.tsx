import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface Props {
  criticalSubject: any | null;
  onActionClick: () => void;
}

const positivePhrases = [
  "Tudo nos eixos",
  "Ritmo sob controle",
  "Sem pendências críticas",
  "Seu dia está organizado",
  "Fluxo de estudo estável"
];

export function DashboardCriticalIssuesCard({ criticalSubject, onActionClick }: Props) {
  const dynamicPhrase = useMemo(() => {
    return positivePhrases[Math.floor(Math.random() * positivePhrases.length)];
  }, []);

  if (!criticalSubject) {
    return (
      <div className="h-full flex flex-col justify-center border border-success/20 bg-success/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <CheckCircle className="w-24 h-24 text-success" />
        </div>
        <div className="relative z-10 flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <h3 className="text-sm font-bold text-success uppercase tracking-widest">{dynamicPhrase}</h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed relative z-10">Nenhuma pendência grave ou revisão atrasada detectada no momento.</p>
      </div>
    );
  }

  const perf = criticalSubject.performance;

  return (
    <div className={cn(
      "h-full rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group border",
      perf.level === 'fraco' ? "bg-error/5 border-error/20" : 
      perf.level === 'mediano' ? "bg-orange-500/5 border-orange-500/20" : 
      "bg-surface-container-low border-outline/10"
    )}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <AlertTriangle className={cn("w-32 h-32", perf.color)} />
      </div>
      <div className="relative z-10">
        <div className={cn("text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2", perf.color)}>
          <AlertTriangle className="w-3.5 h-3.5" /> Atenção Necessária
        </div>
        <h3 className="text-lg font-black mb-1 truncate leading-tight">{criticalSubject.nome}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {criticalSubject.type === 'faltas' 
            ? perf.message 
            : criticalSubject.reviews > 0 
              ? `Você possui ${criticalSubject.reviews} revisões pendentes.` 
              : perf.message}
        </p>
      </div>
      <button 
         onClick={onActionClick} 
         className={cn(
           "mt-6 flex items-center justify-between relative z-10 w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg",
           perf.level === 'fraco' ? "bg-error text-on-error shadow-error/20" : "bg-primary text-on-primary shadow-primary/20",
           "hover:scale-[1.02] active:scale-95"
         )}
      >
        <span>Resolver Agora</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
