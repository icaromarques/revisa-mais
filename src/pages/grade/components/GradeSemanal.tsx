import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { getMateriaColor } from '@/lib/colors';

interface Props {
  grade: GradeFaculdade[];
  bloqueios: BloqueioAgenda[];
  materias?: any[];
  onEdit: (item: GradeFaculdade) => void;
  onEditBloqueio: (item: BloqueioAgenda) => void;
}

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + (m || 0);
};

const PIXELS_PER_MINUTE = 1;

const getBlockTop = (startMins: number, gridStartMins: number) => {
  return (startMins - gridStartMins) * PIXELS_PER_MINUTE;
};

const getBlockHeight = (startMins: number, endMins: number) => {
  return Math.max(24, (endMins - startMins) * PIXELS_PER_MINUTE);
};

export function GradeSemanal({ grade, bloqueios, materias = [], onEdit, onEditBloqueio }: Props) {
  // Map index: 0 = Mon, ..., 6 = Sun
  const gradeAtiva = grade.filter(g => g.ativo && g.recorrente !== false);
  const bloqueiosRecorrentes = bloqueios.filter(b => b.ativo && b.recorrente);

  const hours = useMemo(() => {
    let minH = 7;
    let maxH = 22;
    
    gradeAtiva.forEach(g => {
       const [h] = g.hora_inicio.split(':').map(Number);
       const [endH, endM] = (g.hora_fim || '00:00').split(':').map(Number);
       if (h < minH) minH = h;
       if (endH > maxH || (endH === maxH && endM > 0)) {
         maxH = endH + (endM > 0 ? 1 : 0);
       }
    });

    bloqueiosRecorrentes.forEach(b => {
      const [h] = b.hora_inicio.split(':').map(Number);
      const [endH, endM] = (b.hora_fim || '00:00').split(':').map(Number);
      if (h < minH) minH = h;
      if (endH > maxH || (endH === maxH && endM > 0)) {
        maxH = endH + (endM > 0 ? 1 : 0);
      }
    });

    // Add safe margins
    minH = Math.max(0, minH - 1);
    maxH = Math.min(23, maxH + 1);

    return Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  }, [gradeAtiva, bloqueiosRecorrentes]);

  const minHour = hours[0];
  const maxHour = hours[hours.length - 1];
  
  const gridStartMins = minHour * 60;
  const gridEndMins = (maxHour + 1) * 60;
  const bodyHeight = (gridEndMins - gridStartMins) * PIXELS_PER_MINUTE;

  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline/10 p-6 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-4 mb-4">
          <div className="text-right pr-4 text-on-surface-variant text-xs font-bold uppercase tracking-widest">Hora</div>
          {DIAS.map(d => (
            <div key={d} className="text-center text-on-surface-variant text-xs font-bold uppercase tracking-widest">{d}</div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-4 relative">
          
          {/* Timeline background rows */}
          <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] gap-4 pointer-events-none" style={{ height: `${bodyHeight}px` }}>
             <div className="col-start-2 col-end-9 relative">
               {hours.map(h => (
                 <div key={h} style={{ top: `${(h * 60 - gridStartMins) * PIXELS_PER_MINUTE}px` }} className="absolute w-full border-t border-outline/10">
                   {/* Linha de Meia Hora */}
                   <div className="absolute w-full border-t border-dashed border-outline/5" style={{ top: `${30 * PIXELS_PER_MINUTE}px` }} />
                 </div>
               ))}
               {/* Last border */}
               <div className="absolute w-full border-t border-outline/10" style={{ top: `${bodyHeight}px` }} />
             </div>
          </div>

          {/* Time Labels */}
          <div className="relative z-20" style={{ height: `${bodyHeight}px` }}>
            {hours.map(h => (
              <div key={h}>
                <span className="absolute text-right pr-4 w-full text-[10px] font-black text-on-surface-variant/60 tracking-tighter" style={{ top: `${(h * 60 - gridStartMins) * PIXELS_PER_MINUTE}px`, transform: 'translateY(-50%)' }}>
                  {String(h).padStart(2, '0')}:00
                </span>
                <span className="absolute text-right pr-4 w-full text-[9px] font-medium text-on-surface-variant/30 tracking-tighter" style={{ top: `${(h * 60 + 30 - gridStartMins) * PIXELS_PER_MINUTE}px`, transform: 'translateY(-50%)' }}>
                  {String(h).padStart(2, '0')}:30
                </span>
              </div>
            ))}
          </div>

          {/* Daily Columns */}
          {DIAS.map((_, dayIndex) => {
            const dbDay = dayIndex === 6 ? 0 : dayIndex + 1;
            
            // Items for this day
            const dayGrade = gradeAtiva.filter(g => g.dias_semana ? g.dias_semana.includes(dbDay) : g.dia_semana === dbDay).map(g => ({ ...g, isGrade: true }));
            const dayBlocks = bloqueiosRecorrentes.filter(b => b.dias_semana ? b.dias_semana.includes(dbDay) : b.dia_semana === dbDay).map(b => ({ ...b, isGrade: false }));
            
            const allItems = [...dayGrade, ...dayBlocks].map(item => {
              const start = timeToMinutes(item.hora_inicio);
              const end = timeToMinutes(item.hora_fim || '00:00');
              return { ...item, _start: start, _end: end };
            }).sort((a, b) => a._start - b._start);

            // Compute columns to prevent overlap
            const columns: any[][] = [];
            for (const item of allItems) {
               let placed = false;
               for (const col of columns) {
                  const lastItem = col[col.length - 1];
                  if (item._start >= lastItem._end) {
                     col.push(item);
                     placed = true;
                     break;
                  }
               }
               if (!placed) {
                  columns.push([item]);
               }
            }

            const enrichItem = (item: any) => {
               const colIndex = columns.findIndex(col => col.some(i => i.id === item.id));
               const colCount = columns.length;
               
               const top = getBlockTop(item._start, gridStartMins);
               const height = getBlockHeight(item._start, item._end);
               
               // Calculate width and left if overlapping
               const leftPercent = colCount > 0 ? (colIndex * 100 / colCount) : 0;
               const widthPercent = colCount > 0 ? (100 / colCount) : 100;
               
               return { ...item, top, height, leftPercent, widthPercent };
            };

            const processedItems = allItems.map(enrichItem);
            
            const dayGradeItems = processedItems.filter(i => i.isGrade);
            const dayBlockItems = processedItems.filter(i => !i.isGrade);

            return (
              <div key={dayIndex} className="relative h-full" style={{ height: `${bodyHeight}px` }}>
                
                {dayGradeItems.map(item => {
                  const top = item.top;
                  const height = item.height;
                  const left = `calc(${item.leftPercent}% + 2px)`;
                  const width = `calc(${item.widthPercent}% - 4px)`;
                  
                  const mat = materias.find(m => m.id === item.materia_id);
                  const resolvedColorObj = getMateriaColor(item.cor || mat?.cor);
                  const corBloco = resolvedColorObj.color || resolvedColorObj.corDefault;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => onEdit(item)}
                      className={cn(
                        "absolute z-10 rounded-xl p-2 text-xs cursor-pointer transition-all hover:z-20 hover:scale-[1.02] hover:shadow-xl overflow-hidden flex flex-col",
                        "border-l-4 group"
                      )}
                      style={{ 
                        top: `${top}px`,
                        height: `${height}px`,
                        left,
                        width,
                        backgroundColor: `color-mix(in srgb, ${corBloco} 10%, var(--color-surface-container))`,
                        borderLeftColor: corBloco,
                        boxShadow: `0 4px 12px -2px color-mix(in srgb, ${corBloco} 20%, transparent)`
                      }}
                    >
                       <div className="flex justify-between items-start gap-1">
                          <p className="font-black text-on-surface leading-[1.1] text-[11px] uppercase tracking-tight group-hover:text-primary transition-colors">
                            {item.titulo}
                          </p>
                       </div>
                       
                       {height >= 45 && (
                         <div className="mt-auto flex flex-col gap-0.5">
                            <p className="font-bold text-[9px] text-on-surface/60 flex items-center gap-1">
                               <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                               {item.hora_inicio} - {item.hora_fim}
                            </p>
                            {height >= 65 && (
                              <p className="text-[8px] font-medium text-on-surface/40 uppercase tracking-widest px-1.5 py-0.5 bg-on-surface/5 rounded-md w-fit">
                                Grade Faculdade
                              </p>
                            )}
                         </div>
                       )}
                    </div>
                  );
                })}

                {dayBlockItems.map(item => {
                  const top = item.top;
                  const height = item.height;
                  const left = `calc(${item.leftPercent}% + 2px)`;
                  const width = `calc(${item.widthPercent}% - 4px)`;
                  const isRotina = item.tipo === 'rotina';
                  
                  const resolvedColorObj = getMateriaColor(item.cor || (isRotina ? 'verde' : 'grafite'));
                  const corBloco = resolvedColorObj.color || resolvedColorObj.corDefault;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => onEditBloqueio(item)}
                      className={cn(
                        "absolute z-10 rounded-xl p-2 text-[10px] cursor-pointer transition-all hover:z-20 hover:scale-[1.02] hover:shadow-xl overflow-hidden flex flex-col items-start text-left group border-l-4"
                      )}
                      style={{ 
                        top: `${top}px`,
                        height: `${height}px`,
                        left,
                        width,
                        backgroundColor: `color-mix(in srgb, ${corBloco} 10%, var(--color-surface-container))`,
                        borderLeftColor: corBloco,
                        boxShadow: `0 4px 12px -2px color-mix(in srgb, ${corBloco} 20%, transparent)`
                      }}
                    >
                       <p className="font-black leading-[1.1] text-[10px] uppercase tracking-tight text-on-surface group-hover:opacity-80 transition-opacity">
                         {item.titulo}
                       </p>
                       
                       {height >= 40 && (
                         <div className="mt-auto flex flex-col gap-0.5">
                            <p className="font-bold text-[8px] text-on-surface/60 flex items-center gap-1">
                               <span className="w-1 h-1 rounded-full bg-current opacity-50" style={{ backgroundColor: corBloco }} />
                               {item.hora_inicio} - {item.hora_fim}
                            </p>
                            {height >= 60 && (
                              <p className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md w-fit text-on-surface/80" style={{ backgroundColor: `color-mix(in srgb, ${corBloco} 20%, transparent)` }}>
                                {isRotina ? 'Rotina' : 'Bloqueio'}
                              </p>
                            )}
                         </div>
                       )}
                    </div>
                  );
                })}

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
