import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, MapPin, AlignLeft, Edit2, Copy, ExternalLink, Activity, Info } from 'lucide-react';
import { EventoAcademico } from '@/types/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { resolveCalendarColor } from '@/lib/calendar-utils';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventoAcademico | null;
  onEdit: (event: EventoAcademico) => void;
  onImportAsLocal?: (event: EventoAcademico) => void;
}

export function EventDetailModal({ isOpen, onClose, event, onEdit, onImportAsLocal }: EventDetailModalProps) {
  if (!isOpen || !event) return null;

  const handleCopyLocal = () => {
    onClose();
    if (onImportAsLocal) {
        onImportAsLocal(event);
    }
  };

  const isExternal = event.origem === 'google_external' || event.imported_from_google;

  const getTypeStyle = (tipo: string, cor?: string) => {
    const hex = resolveCalendarColor(cor);
    
    // Add opacity for background
    let r = parseInt(hex.slice(1, 3), 16) || 59;
    let g = parseInt(hex.slice(3, 5), 16) || 130;
    let b = parseInt(hex.slice(5, 7), 16) || 246;
    
    return { bg: `rgba(${r},${g},${b}, 0.15)`, text: hex, border: `rgba(${r},${g},${b}, 0.3)` };
  };

  const style = getTypeStyle(event.tipo, event.cor);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-surface-container rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
        >
          {/* Decorative Top Line */}
          <div className="h-2 w-full" style={{ backgroundColor: style.text }} />

          {/* Header */}
          <div className="flex items-start justify-between p-6">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <div className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                      {event.tipo}
                   </div>
                   {isExternal && (
                      <div className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                         Google
                      </div>
                   )}
                </div>
                <h2 className="text-2xl font-bold mt-2 leading-tight">{event.titulo}</h2>
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 pt-0 space-y-6">
             <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 text-on-surface-variant">
                   <CalendarIcon className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                   <div className="space-y-0.5">
                      <p className="font-semibold text-sm text-on-surface">
                         {event.dia_inteiro ? (
                            <>
                               {format(new Date(event.data_inicio), 'dd MMM yyyy', { locale: ptBR })} (Dia Inteiro)
                            </>
                         ) : (
                            <>
                               {format(new Date(event.data_inicio), 'dd MMMM yyyy - HH:mm', { locale: ptBR })} até {format(new Date(event.data_fim), 'HH:mm')}
                            </>
                         )}
                      </p>
                      {event.sync_status === 'sincronizado' && <p className="text-[10px] flex items-center gap-1 opacity-80"><Activity className="w-3 h-3"/> Sincronizado no GCal</p>}
                      {event.sync_status === 'erro' && <p className="text-[10px] text-error flex items-center gap-1"><Info className="w-3 h-3"/> Erro no GCal</p>}
                   </div>
                </div>

                {event.local && (
                    <div className="flex items-start gap-3 text-on-surface-variant text-sm">
                       <MapPin className="w-5 h-5 shrink-0 text-primary" />
                       <p>{event.local}</p>
                    </div>
                )}

                {event.descricao && (
                    <div className="flex items-start gap-3 text-on-surface-variant text-sm">
                       <AlignLeft className="w-5 h-5 shrink-0 text-primary" />
                       <p className="whitespace-pre-wrap">{event.descricao}</p>
                    </div>
                )}
             </div>
          </div>

           {/* Footer Actions */}
          <div className="p-6 border-t border-outline/10 bg-surface-container-highest flex gap-3 flex-wrap">
             {event.origem === 'grade' || (event.origem === 'sistema' && (event.tipo === 'aula' || event.tipo === 'bloqueio')) ? (
                <div className="w-full flex flex-col items-center gap-2 py-2">
                   <div className="text-sm text-on-surface-variant font-medium text-center">
                      Este é um evento estrutural ({event.origem === 'grade' || event.tipo === 'aula' ? 'Grade de Horários' : 'Bloqueio de Agenda'}).
                   </div>
                   {event.origem === 'grade' || event.tipo === 'aula' ? (
                     <button onClick={() => window.location.href = '/grade'} className="btn-secondary py-2 px-4 shadow-sm">
                        Acessar Grade de Horários
                     </button>
                   ) : (
                     <button onClick={() => window.location.href = '/configuracoes'} className="btn-secondary py-2 px-4 shadow-sm">
                        Acessar Configurações/Agenda
                     </button>
                   )}
                </div>
             ) : isExternal ? (
                <>
                   {event.htmlLink && (
                       <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-max btn-secondary flex items-center justify-center gap-2">
                          <ExternalLink className="w-4 h-4" /> Ver no Calendar
                       </a>
                   )}
                   <button onClick={handleCopyLocal} className="flex-1 min-w-max btn-primary flex items-center justify-center gap-2">
                       <Copy className="w-4 h-4" /> Importar para o Revisa+
                   </button>
                </>
             ) : (
                <>
                   <button onClick={() => { onClose(); onEdit(event); }} className="flex-1 btn-primary flex items-center justify-center gap-2">
                      <Edit2 className="w-4 h-4" /> Editar Evento
                   </button>
                   {event.htmlLink && (
                       <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-surface-variant rounded-xl text-on-surface font-semibold hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 border border-outline/10 text-sm">
                          <ExternalLink className="w-4 h-4" /> Google
                       </a>
                   )}
                </>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
