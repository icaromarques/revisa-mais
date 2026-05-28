import { Clock, BrainCircuit, TrendingUp, PenTool } from 'lucide-react';
import { PerformanceClass } from '@/lib/performanceUtils';
import { cn, formatDuration } from '@/lib/utils';
import { TimeRange } from '@/lib/dashboard/dateFilters';

interface Props {
  stats: {
    totalMinutos: number;
    totalSessoes: number;
    aproveitamento: number;
    totalQuestoes: number;
    performance: PerformanceClass;
  };
  previousStats?: {
    totalMinutos: number;
    totalSessoes: number;
    aproveitamento: number;
    totalQuestoes: number;
  };
  timeRange?: TimeRange;
}

export function DashboardStatsRow({ stats, previousStats, timeRange }: Props) {
  
  const getDiffText = (current: number, previous: number, suffix: string, prefix = '') => {
    if (!previousStats) return null;
    const diff = current - previous;
    if (diff === 0) return <span className="text-outline">Igual ao ant.</span>;
    const isPositive = diff > 0;
    return (
      <span className={isPositive ? 'text-success' : 'text-error'}>
        {isPositive ? '+' : ''}{diff}{prefix} {suffix}
      </span>
    );
  };

  const getDiffTextDuration = (current: number, previous: number) => {
    if (!previousStats) return null;
    const diff = current - previous;
    if (diff === 0) return <span className="text-outline">Igual ao ant.</span>;
    const isPositive = diff > 0;
    const absDiff = Math.abs(diff);
    return (
      <span className={isPositive ? 'text-success' : 'text-error'}>
        {isPositive ? '+' : '-'} {formatDuration(absDiff * 60)} vs ant.
      </span>
    );
  };

  const getDiffTextPerformance = (current: number, previous: number) => {
    if (!previousStats) return null;
    const diff = current - previous;
    if (diff === 0) return <span className="text-outline">Manteve %</span>;
    const isPositive = diff > 0;
    return (
      <span className={isPositive ? 'text-success' : 'text-error'}>
        {isPositive ? '+' : ''}{Math.round(diff)}% vs ant.
      </span>
    );
  };

  // 'Amanhã' shouldn't show comparisons for stats that haven't happened yet, 
  // but it's okay because stats will be 0 vs 0 generally, or we just hide them
  const showComparisons = timeRange !== 'amanha';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between border-l-4 border-l-primary shadow-sm hover:translate-y-[-2px] transition-transform">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Tempo de estudo</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-on-surface leading-none">{formatDuration((stats.totalMinutos || 0) * 60)}</span>
          </div>
          {showComparisons && previousStats && (
            <div className="text-[9px] font-bold mt-1.5 opacity-80">
              {getDiffTextDuration(stats.totalMinutos, previousStats.totalMinutos)}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex flex-col items-center justify-center text-primary">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between border-l-4 border-l-tertiary shadow-sm hover:translate-y-[-2px] transition-transform">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Sessões de estudo</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-on-surface leading-none">{stats.totalSessoes}</span>
            <span className="text-[10px] font-bold text-outline">sessões</span>
          </div>
          {showComparisons && previousStats && (
            <div className="text-[9px] font-bold mt-1.5 opacity-80">
              {getDiffText(stats.totalSessoes, previousStats.totalSessoes, 'vs ant.')}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-tertiary/10 flex flex-col items-center justify-center text-tertiary">
          <BrainCircuit className="w-4 h-4" />
        </div>
      </div>

      <div className={cn(
        "bg-surface-container rounded-xl p-4 flex flex-col justify-center border-l-4 shadow-sm hover:translate-y-[-2px] transition-transform",
        stats.performance.level === 'fraco' ? 'border-l-error' : 
        stats.performance.level === 'mediano' ? 'border-l-warning-600' : 
        stats.performance.level === 'bom' ? 'border-l-primary' : 
        stats.performance.level === 'excelente' ? 'border-l-success' : 'border-l-outline'
      )}>
        <div className="flex items-start justify-between w-full">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Desempenho</span>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-on-surface leading-none">{Math.round(stats.aproveitamento)}</span>
                <span className="text-[10px] font-bold text-outline">%</span>
              </div>
            </div>
          </div>
          <div className={cn("w-8 h-8 rounded-full flex shrink-0 flex-col items-center justify-center", stats.performance.bg, stats.performance.color)}>
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-[9px] font-black uppercase", stats.performance.color)}>
             {stats.performance.label}
          </span>
          {showComparisons && previousStats && (
            <span className="text-[9px] font-bold opacity-80">
              • {getDiffTextPerformance(stats.aproveitamento, previousStats.aproveitamento)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between border-l-4 border-l-secondary shadow-sm hover:translate-y-[-2px] transition-transform">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">Questões</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-on-surface leading-none">{stats.totalQuestoes}</span>
            <span className="text-[10px] font-bold text-outline">resolvidas</span>
          </div>
          {showComparisons && previousStats && (
            <div className="text-[9px] font-bold mt-1.5 opacity-80">
              {getDiffText(stats.totalQuestoes, previousStats.totalQuestoes, 'vs ant.')}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary/10 flex flex-col items-center justify-center text-secondary">
          <PenTool className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
