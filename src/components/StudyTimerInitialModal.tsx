import React, { useState } from 'react';
import { useStudyTimer, StudyMode } from '@/contexts/StudyTimerContext';
import { X, Timer, Clock, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function StudyTimerInitialModal() {
  const { isInitialModalOpen, closeInitialModal, startSession, lastUsedMode, openSettings } = useStudyTimer();
  const [selectedMode, setSelectedMode] = useState<StudyMode | undefined>(lastUsedMode || 'pomodoro');

  if (!isInitialModalOpen) return null;

  return (
    <AnimatePresence>
      {isInitialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeInitialModal}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-surface-container-lowest border border-outline/10 rounded-3xl shadow-2xl overflow-hidden p-8"
          >
            <button 
              onClick={closeInitialModal}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-on-surface mb-2">Como você quer estudar agora?</h2>
              <p className="text-on-surface-variant text-sm">Escolha entre Pomodoro e cronômetro livre.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => setSelectedMode('pomodoro')}
                className={`group relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-center text-center gap-4 ${selectedMode === 'pomodoro' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-surface-container hover:border-primary/30 hover:bg-surface-container-high'}`}
              >
                {lastUsedMode === 'pomodoro' && (
                  <div className="absolute top-0 right-0 translate-x-2 -translate-y-2 bg-surface-container-highest border border-outline/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface">Último usado</span>
                  </div>
                )}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${selectedMode === 'pomodoro' ? 'bg-primary/20 text-primary scale-110' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  <Timer className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg mb-1 ${selectedMode === 'pomodoro' ? 'text-primary' : 'text-on-surface'}`}>Pomodoro</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">Estude em ciclos com pausas automáticas. Ideal para manter foco e ritmo.</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedMode('cronometro_livre')}
                className={`group relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-center text-center gap-4 ${selectedMode === 'cronometro_livre' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-surface-container hover:border-primary/30 hover:bg-surface-container-high'}`}
              >
                {lastUsedMode === 'cronometro_livre' && (
                  <div className="absolute top-0 right-0 translate-x-2 -translate-y-2 bg-surface-container-highest border border-outline/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface">Último usado</span>
                  </div>
                )}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${selectedMode === 'cronometro_livre' ? 'bg-primary/20 text-primary scale-110' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg mb-1 ${selectedMode === 'cronometro_livre' ? 'text-primary' : 'text-on-surface'}`}>Cronômetro Livre</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">Conte o tempo do seu estudo sem ciclos fixos. Ideal para sessões mais flexíveis.</p>
                </div>
              </button>
            </div>
            
            {selectedMode === 'pomodoro' && (
               <div className="flex justify-center mb-6">
                 <button onClick={() => { closeInitialModal(); openSettings(); }} className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">
                   <Settings className="w-4 h-4" /> Ajustar Pomodoro
                 </button>
               </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={closeInitialModal}
                className="flex-1 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (selectedMode) {
                    startSession(selectedMode);
                  }
                }}
                disabled={!selectedMode}
                className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
