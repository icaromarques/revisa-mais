import React, { useState, useEffect } from 'react';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { X, Settings, Save } from 'lucide-react';

export function PomodoroSettingsModal() {
  const { isSettingsOpen, closeSettings, settings, updateSettings } = useStudyTimer();
  
  const [focusTime, setFocusTime] = useState(settings.focusTime);
  const [shortBreak, setShortBreak] = useState(settings.shortBreak);
  const [longBreak, setLongBreak] = useState(settings.longBreak);
  const [cycles, setCycles] = useState(settings.cycles);

  useEffect(() => {
    if (isSettingsOpen) {
      setFocusTime(settings.focusTime);
      setShortBreak(settings.shortBreak);
      setLongBreak(settings.longBreak);
      setCycles(settings.cycles);
    }
  }, [isSettingsOpen, settings]);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    updateSettings({
      focusTime,
      shortBreak,
      longBreak,
      cycles
    });
    closeSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden flex flex-col glass-panel rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">Configurações do Pomodoro</h2>
            </div>
          </div>
          <button onClick={closeSettings} className="p-2 hover:bg-surface-container-low rounded-full transition-colors group">
            <X className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Foco (minutos)</label>
              <input 
                type="number" 
                value={focusTime}
                onChange={(e) => setFocusTime(Number(e.target.value))}
                className="w-20 bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-primary transition-colors"
                min="1"
                max="120"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Pausa Curta (minutos)</label>
              <input 
                type="number" 
                value={shortBreak}
                onChange={(e) => setShortBreak(Number(e.target.value))}
                className="w-20 bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-primary transition-colors"
                min="1"
                max="30"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Pausa Longa (minutos)</label>
              <input 
                type="number" 
                value={longBreak}
                onChange={(e) => setLongBreak(Number(e.target.value))}
                className="w-20 bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-primary transition-colors"
                min="1"
                max="60"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Ciclos até Pausa Longa</label>
              <input 
                type="number" 
                value={cycles}
                onChange={(e) => setCycles(Number(e.target.value))}
                className="w-20 bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-primary transition-colors"
                min="1"
                max="10"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-background/50 backdrop-blur-md border-t border-outline flex items-center justify-end gap-3">
          <button 
            onClick={closeSettings} 
            className="px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-on-primary rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Save className="w-4 h-4 fill-current" />
            Salvar
          </button>
        </div>

      </div>
    </div>
  );
}
