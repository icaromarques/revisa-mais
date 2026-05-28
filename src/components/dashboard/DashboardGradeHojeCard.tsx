import { useMemo } from 'react';
import { getDay } from 'date-fns';
import { DashboardEmptyState } from './DashboardEmptyState';
import { LayoutGrid } from 'lucide-react';

interface Props {
  gradeDocs: any[];
  blockDocs: any[];
}

export function DashboardGradeHojeCard({ gradeDocs, blockDocs }: Props) {
  const items = useMemo(() => {
    const today = new Date();
    const dayOfWeek = getDay(today);
    
    const grades = gradeDocs.filter(g => g.ativo && g.dia_semana === dayOfWeek).map(g => ({
       title: g.titulo, time: g.hora_inicio, type: 'aula', color: g.cor || '#4F46E5'
    }));
    
    const blocks = blockDocs.filter(b => b.ativo && b.recorrente && b.dia_semana === dayOfWeek).map(b => ({
       title: b.titulo, time: b.hora_inicio, type: 'bloqueio', color: b.cor || '#6B7280'
    }));

    return [...grades, ...blocks].sort((a,b) => a.time.localeCompare(b.time));
  }, [gradeDocs, blockDocs]);


  if (items.length === 0) {
    return <DashboardEmptyState icon={LayoutGrid} description="Nenhum horário fixo na grade" compact />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline/5 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: it.color }}></div>
          <span className="font-mono text-on-surface-variant opacity-70">{it.time}</span>
          <span className={`font-bold ${it.type === 'bloqueio' ? 'text-on-surface-variant line-through decoration-on-surface-variant/50' : 'text-on-surface'}`}>{it.title}</span>
        </div>
      ))}
    </div>
  );
}
