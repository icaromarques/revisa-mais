import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { EventoAcademico } from '@/types/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getCalendarRenderKey, resolveCalendarColor } from '@/lib/calendar-utils';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: EventoAcademico[];
  onEventClick: (event: EventoAcademico) => void;
  onNewEvent: (date: Date) => void;
}

export function DayDetailModal({ isOpen, onClose, date, events, onEventClick, onNewEvent }: DayDetailModalProps) {
  if (!isOpen) return null;

  const validEvents = events.filter(e => e.data_inicio);
  const sortedEvents = validEvents.sort((a, b) => {
     if (a.dia_inteiro && !b.dia_inteiro) return -1;
     if (!a.dia_inteiro && b.dia_inteiro) return 1;
     return new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface-container rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pl-8 border-b border-outline/10 bg-surface-container-low">
            <div>
               <h2 className="text-xl font-bold flex items-center gap-2">
                 {format(date, "dd 'de' MMMM", { locale: ptBR })}
               </h2>
               <p className="text-sm text-on-surface-variant capitalize">{format(date, 'EEEE', { locale: ptBR })}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
             {sortedEvents.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant flex flex-col items-center">
                   <CalendarIcon className="w-8 h-8 mb-4 opacity-50" />
                   <p>Nenhum evento neste dia.</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {sortedEvents.map((event, idx) => (
                      <div 
                         key={getCalendarRenderKey(event, 'daymodal', idx)}
                         onClick={() => { onClose(); onEventClick(event); }}
                         className="p-4 rounded-xl border border-outline/10 bg-surface-container-highest hover:bg-surface-variant transition-colors cursor-pointer flex gap-4 overflow-hidden relative"
                      >
                         <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: resolveCalendarColor(event.cor) }}></div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-on-surface truncate">{event.titulo}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-1 uppercase tracking-wider">{event.tipo.replace('_', ' ')}</p>
                         </div>
                         <div className="text-sm font-bold opacity-80 shrink-0">
                            {event.dia_inteiro ? 'Dia Inteiro' : format(new Date(event.data_inicio), 'HH:mm')}
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>

          <div className="p-6 border-t border-outline/10 bg-surface-container-highest">
             <button onClick={() => { onClose(); onNewEvent(date); }} className="w-full btn-primary flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Novo evento neste dia
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
