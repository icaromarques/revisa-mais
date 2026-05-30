import React, { useState } from 'react';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { Play, Pause, X, SkipForward, Maximize2, Minimize2, CheckCircle2, Timer as TimerIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDuration } from '@/lib/utils';

export function StudyTimerWidget() {
  const { 
    timeLeft, 
    timerState, 
    mode, 
    phase,
    currentCycle, 
    settings,
    isWidgetOpen,
    toggleWidget,
    resumeTimer,
    pauseTimer,
    skipPhase,
    endSession,
    abandonSession,
    sessionActive,
    accumulatedStudyTime,
    accumulatedPauseTime,
    viewMode,
    setViewMode
  } = useStudyTimer();

  const [isMinimized, setIsMinimized] = useState(false);

  if (!isWidgetOpen || !sessionActive) return null;

  const isRunning = timerState === 'running';
  const isPomodoro = mode === 'pomodoro';

  const getModeLabel = () => {
    if (!isPomodoro) return 'Cronômetro Livre';
    switch (phase) {
      case 'focus': return 'Foco Intenso';
      case 'shortBreak': return 'Pausa Curta';
      case 'longBreak': return 'Pausa Longa';
    }
  };

  const getModeColor = () => {
    if (!isPomodoro) return 'text-primary';
    switch (phase) {
      case 'focus': return 'text-error';
      case 'shortBreak': return 'text-success';
      case 'longBreak': return 'text-primary';
    }
  };

  const getBgColor = () => {
    if (!isPomodoro) return 'bg-primary';
    switch (phase) {
      case 'focus': return 'bg-error';
      case 'shortBreak': return 'bg-success';
      case 'longBreak': return 'bg-primary';
    }
  };

  let progress = 0;
  if (isPomodoro) {
     const currentTaskTime = phase === 'focus' ? settings.focusTime * 60 : phase === 'shortBreak' ? settings.shortBreak * 60 : settings.longBreak * 60;
     progress = 100 - (timeLeft / currentTaskTime * 100);
  }

  const timerDisplay = isPomodoro ? formatDuration(timeLeft) : formatDuration(accumulatedStudyTime);

  if (viewMode === 'focus') {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
        >
          {/* Top Bar Navigation */}
          <div className="absolute top-8 w-full px-8 flex justify-between items-center max-w-7xl mx-auto">
             <div className="flex items-center gap-4">
                <span className="text-2xl font-extrabold tracking-tighter text-on-surface">Revisa<span className="text-primary">+</span></span>
                <span className="text-on-surface-variant/50">|</span>
                <span className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Modo Imersivo</span>
             </div>
             <button 
                onClick={() => setViewMode('compact')}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container/50 hover:bg-surface-container rounded-full text-on-surface-variant font-bold text-xs uppercase transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Recolher</span>
             </button>
          </div>

          <div className="flex flex-col items-center gap-8 md:gap-12 w-full max-w-3xl border border-outline/10 bg-surface-container-lowest/50 p-8 sm:p-12 md:p-16 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
             
             {/* Dynamic Glow Background */}
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${getBgColor()} opacity-5 blur-[120px] rounded-full pointer-events-none transition-colors duration-1000`}></div>

             {/* Mode Overview */}
             <div className="flex flex-col items-center gap-3 relative z-10">
               <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container uppercase text-[10px] font-black tracking-widest text-on-surface-variant">
                 {isPomodoro ? <TimerIcon className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                 <span>{isPomodoro ? 'Pomodoro' : 'Cronômetro'}</span>
               </div>
               <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter ${getModeColor()} text-center`}>{getModeLabel()}</h2>
             </div>
             
             {/* Main Timer */}
             <div className="relative z-10 w-full flex items-center justify-center px-4 overflow-visible">
                <span 
                  className={`font-black tabular-nums leading-none ${getModeColor()} ${timerState === 'paused' ? 'opacity-50 animate-pulse' : ''}`}
                  style={{ fontSize: 'clamp(3.5rem, 14vw, 9.5rem)', letterSpacing: 'normal' }}
                >
                  {timerDisplay}
                </span>
             </div>

             {/* Stats Row */}
             <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 w-full relative z-10">
               {isPomodoro && (
                 <div className="flex flex-col items-center gap-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ciclo</span>
                   <span className="text-xl font-bold text-on-surface">{currentCycle} <span className="text-on-surface-variant/50 text-sm">/ {settings.cycles}</span></span>
                 </div>
               )}
               <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Estudado</span>
                 <span className="text-xl font-bold text-primary">{formatDuration(accumulatedStudyTime)}</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total em Pausa</span>
                 <span className="text-xl font-bold text-amber-500">{formatDuration(accumulatedPauseTime)}</span>
               </div>
             </div>

             {/* Controls */}
             <div className="flex items-center gap-4 relative z-10 mt-4">
               <button 
                  onClick={abandonSession}
                  className="px-6 py-4 rounded-2xl flex items-center justify-center font-bold text-sm text-error bg-error/10 hover:bg-error/20 transition-all uppercase tracking-widest"
                >
                  <X className="w-5 h-5 mr-2" /> Abandonar
                </button>
               
                <button 
                  onClick={isRunning ? pauseTimer : resumeTimer}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRunning ? 'bg-surface-container-highest text-on-surface hover:bg-surface-variant' : 'bg-primary text-on-primary shadow-xl shadow-primary/30 hover:scale-105'}`}
                >
                  {isRunning ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                </button>

                {isPomodoro && (
                  <button 
                    onClick={skipPhase}
                    title="Pular fase"
                    className="w-16 h-16 rounded-full bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-container-highest transition-all"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                )}
                
                <button 
                  onClick={endSession}
                  className="px-6 py-4 rounded-2xl flex items-center justify-center font-bold text-sm text-primary bg-primary/10 hover:bg-primary/20 transition-all uppercase tracking-widest"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Encerrar
                </button>
             </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Compact View
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`fixed bottom-8 right-8 z-50 glass-panel rounded-3xl shadow-2xl overflow-hidden border border-outline/30 transition-all duration-300 ${isMinimized ? 'w-16 h-16 rounded-full' : 'w-80'}`}
      >
        {isMinimized ? (
          <button 
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center relative group"
          >
            <div className={`absolute inset-0 bg-current opacity-10 ${getModeColor()}`}></div>
            <span className={`text-[10px] tabular-nums tracking-normal font-black z-10 ${getModeColor()}`}>{timerDisplay}</span>
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
            {isPomodoro && (
              <div 
                className="absolute inset-0 border-2 rounded-full transition-all duration-300" 
                style={{ 
                  clipPath: `inset(${100 - progress}% 0 0 0)`,
                  borderColor: phase === 'focus' ? 'var(--color-error)' : phase === 'shortBreak' ? 'var(--color-success)' : 'var(--color-primary)'
                }}
              ></div>
            )}
          </button>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse' : ''} ${getBgColor()}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{getModeLabel()}</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setViewMode('focus')}
                  title="Expandir"
                  className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => toggleWidget(false)}
                  className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center py-2 relative overflow-visible">
              <span className={`text-5xl font-black tabular-nums tracking-normal leading-none ${getModeColor()} ${timerState === 'paused' ? 'opacity-50' : ''}`}>
                {timerDisplay}
              </span>
              <div className="flex items-center gap-2 mt-1">
                {isPomodoro && (
                  <>
                    <span className="text-[10px] font-bold text-on-surface-variant opacity-60">Ciclo {currentCycle}/{settings.cycles}</span>
                    <span className="text-[10px] text-on-surface-variant opacity-30">•</span>
                  </>
                )}
                <span className="text-[10px] font-bold text-primary">Estudado: {formatDuration(accumulatedStudyTime)}</span>
              </div>
            </div>

            {/* Progress Bar (Only for Pomodoro) */}
            {isPomodoro && (
              <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                 <motion.div 
                   className={`h-full ${getBgColor()}`}
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                 />
              </div>
            )}

            {/* Controls */}
            <div className={`grid gap-2 ${isPomodoro ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button 
                onClick={isRunning ? pauseTimer : resumeTimer}
                className={`p-3 rounded-2xl flex items-center justify-center transition-all ${isRunning ? 'bg-surface-container-highest text-on-surface' : 'bg-primary text-on-primary shadow-lg shadow-primary/20'}`}
              >
                {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              
              {isPomodoro && (
                <button 
                  onClick={skipPhase}
                  title="Pular fase"
                  className="p-3 bg-surface-container-low text-on-surface rounded-2xl flex items-center justify-center hover:bg-surface-container-highest transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              )}

              <button 
                onClick={endSession}
                title="Encerrar sessão"
                className="p-3 bg-primary/10 text-primary rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-all border border-primary/20"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-2 border-t border-outline/50">
               <button 
                onClick={abandonSession}
                className="w-full flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors"
               >
                 Abandonar Sessão
               </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
