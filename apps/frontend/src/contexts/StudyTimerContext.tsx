import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSessionModal } from './SessionModalContext';
import { useConfirm } from './ConfirmContext';

export type StudyMode = 'pomodoro' | 'cronometro_livre';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';
export type TimerState = 'idle' | 'running' | 'paused';
export type ViewMode = 'compact' | 'focus';

interface PomodoroSettings {
  focusTime: number;
  shortBreak: number;
  longBreak: number;
  cycles: number;
}

const defaultSettings: PomodoroSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cycles: 4,
};

interface StudyTimerContextType {
  // Config
  settings: PomodoroSettings;
  updateSettings: (newSettings: PomodoroSettings) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Initial UI Modal
  isInitialModalOpen: boolean;
  openInitialModal: () => void;
  closeInitialModal: () => void;

  // State
  mode: StudyMode;
  lastUsedMode?: StudyMode;
  phase: PomodoroPhase;
  timerState: TimerState;
  
  timeLeft: number; // For pomodoro
  accumulatedStudyTime: number;
  accumulatedPauseTime: number;
  currentCycle: number;
  sessionActive: boolean;

  // View
  isWidgetOpen: boolean;
  toggleWidget: (open: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Context
  selectedMateriaId?: string;
  selectedTopicoId?: string;

  // Actions
  startSession: (mode: StudyMode, materiaId?: string, topicoId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipPhase: () => void;
  endSession: () => void;
  abandonSession: () => void;
}

const StudyTimerContext = createContext<StudyTimerContextType | undefined>(undefined);

export function StudyTimerProvider({ children }: { children: React.ReactNode }) {
  const { openModal } = useSessionModal();
  const { requestConfirm } = useConfirm();

  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem('@revisamais:pomodoro');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);

  // Core State
  const [mode, setMode] = useState<StudyMode>('pomodoro');
  const [lastUsedMode, setLastUsedMode] = useState<StudyMode | undefined>(() => {
    const saved = localStorage.getItem('@revisamais:lastUsedMode');
    return saved ? (saved as StudyMode) : undefined;
  });
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  
  const [timeLeft, setTimeLeft] = useState(settings.focusTime * 60);
  const [accumulatedStudyTime, setAccumulatedStudyTime] = useState(0);
  const [accumulatedPauseTime, setAccumulatedPauseTime] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [sessionActive, setSessionActive] = useState(false);
  
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | undefined>();
  const [selectedTopicoId, setSelectedTopicoId] = useState<string | undefined>();

  // UI State
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  const lastTickRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('@revisamais:study_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionActive) {
          setMode(parsed.mode);
          setPhase(parsed.phase);
          setTimerState('paused'); // Always load as paused to prevent background desync issues
          setTimeLeft(parsed.timeLeft);
          setAccumulatedStudyTime(parsed.accumulatedStudyTime);
          setAccumulatedPauseTime(parsed.accumulatedPauseTime);
          setCurrentCycle(parsed.currentCycle);
          setSessionActive(true);
          setSelectedMateriaId(parsed.selectedMateriaId);
          setSelectedTopicoId(parsed.selectedTopicoId);
          setIsWidgetOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save state to local storage on change
  useEffect(() => {
    if (sessionActive) {
      localStorage.setItem('@revisamais:study_session', JSON.stringify({
        sessionActive,
        mode,
        phase,
        timerState: 'paused', // We save as paused so if they reload, it waits for them to resume. Better UX than silent running out of sync.
        timeLeft,
        accumulatedStudyTime,
        accumulatedPauseTime,
        currentCycle,
        selectedMateriaId,
        selectedTopicoId,
        lastTickAt: Date.now()
      }));
    } else {
      localStorage.removeItem('@revisamais:study_session');
    }
  }, [sessionActive, mode, phase, timerState, timeLeft, accumulatedStudyTime, accumulatedPauseTime, currentCycle, selectedMateriaId, selectedTopicoId]);

  // Timer loop
  useEffect(() => {
    if (timerState !== 'idle') {
       lastTickRef.current = Date.now();
       
       timerRef.current = setInterval(() => {
         const now = Date.now();
         const diff = Math.floor((now - lastTickRef.current) / 1000);
         
         if (diff > 0) {
            lastTickRef.current = now - ((now - lastTickRef.current) % 1000); // keep it aligned
            
            if (timerState === 'running') {
               if (mode === 'cronometro_livre') {
                  setAccumulatedStudyTime(prev => prev + diff);
               } else {
                  // Pomodoro logic
                  setTimeLeft(prev => {
                     const nextTime = Math.max(0, prev - diff);
                     if (nextTime <= 0 && prev > 0) {
                        setTimeout(() => handlePhaseEnd(), 0);
                     }
                     return nextTime;
                  });
                  
                  if (phase === 'focus') {
                      setAccumulatedStudyTime(prev => prev + diff);
                  } else {
                      // Keep track of formal breaks as pause state
                      setAccumulatedPauseTime(prev => prev + diff);
                  }
               }
            } else if (timerState === 'paused') {
               setAccumulatedPauseTime(prev => prev + diff);
            }
         }
       }, 500);
    }
    return () => {
       if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, mode, phase]);

  const handlePhaseEnd = () => {
    if (mode !== 'pomodoro') return;
    setPhase(currPhase => {
      if (currPhase === 'focus') {
        if (currentCycle < settings.cycles) {
          setTimeLeft(settings.shortBreak * 60);
          return 'shortBreak';
        } else {
          setTimeLeft(settings.longBreak * 60);
          return 'longBreak';
        }
      } else {
        if (currPhase === 'longBreak') {
          setCurrentCycle(1);
        } else {
          setCurrentCycle((prev) => prev + 1);
        }
        setTimeLeft(settings.focusTime * 60);
        return 'focus';
      }
    });
  };

  const skipPhase = () => {
     if (mode !== 'pomodoro') return;
     handlePhaseEnd();
  };

  const startSession = (newMode: StudyMode, materiaId?: string, topicoId?: string) => {
    setMode(newMode);
    setLastUsedMode(newMode);
    localStorage.setItem('@revisamais:lastUsedMode', newMode);
    setPhase('focus');
    setTimerState('running');
    setAccumulatedStudyTime(0);
    setAccumulatedPauseTime(0);
    setCurrentCycle(1);
    setSessionActive(true);
    setSelectedMateriaId(materiaId);
    setSelectedTopicoId(topicoId);
    setIsWidgetOpen(true);
    setViewMode('compact');
    setIsInitialModalOpen(false);
    
    if (newMode === 'pomodoro') {
       setTimeLeft(settings.focusTime * 60);
    } else {
       setTimeLeft(0);
    }
    
    lastTickRef.current = Date.now();
  };

  const pauseTimer = () => setTimerState('paused');
  const resumeTimer = () => {
    lastTickRef.current = Date.now();
    setTimerState('running');
  };

  const endSession = () => {
    setTimerState('idle');
    setSessionActive(false);
    setIsWidgetOpen(false);
    setViewMode('compact');
    
    if (accumulatedStudyTime > 0) {
      // Create a clean metadata blob
      const meta = {
        modo: mode,
        tempo_em_pausa_s: accumulatedPauseTime,
        tempo_total_decorrido_s: accumulatedStudyTime + accumulatedPauseTime,
        ciclos_concluidos: phase !== 'focus' ? currentCycle : currentCycle - 1
      };
      
      openModal({
        modo: mode,
        tempoSugeridoS: accumulatedStudyTime,
        materiaId: selectedMateriaId,
        topicoId: selectedTopicoId,
        dataRegistroISO: new Date().toISOString(),
        origem: mode,
        observacaoSugerida: `Meta: ${mode === 'pomodoro' ? 'Sessão Pomodoro' : 'Cronômetro Livre'}\nTempo em pausa: ${Math.floor(accumulatedPauseTime / 60)} min`
      });
    }
    
    resetState();
  };

  const abandonSession = () => {
    requestConfirm({
      title: 'Abandonar Sessão',
      message: 'Deseja realmente abandonar a sessão atual? Todo o progresso será perdido.',
      confirmText: 'Abandonar',
      isDanger: true,
      onConfirm: () => {
        setTimerState('idle');
        setSessionActive(false);
        setIsWidgetOpen(false);
        setViewMode('compact');
        resetState();
      }
    });
  };
  
  const resetState = () => {
     setAccumulatedStudyTime(0);
     setAccumulatedPauseTime(0);
     setTimeLeft(settings.focusTime * 60);
     setCurrentCycle(1);
     setSelectedMateriaId(undefined);
     setSelectedTopicoId(undefined);
  };

  const updateSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem('@revisamais:pomodoro', JSON.stringify(newSettings));
    if (!sessionActive && mode === 'pomodoro') {
      setTimeLeft(newSettings.focusTime * 60);
    }
  };

  return (
    <StudyTimerContext.Provider value={{
      settings, updateSettings, isSettingsOpen, 
      openSettings: () => setIsSettingsOpen(true), closeSettings: () => setIsSettingsOpen(false),
      isInitialModalOpen,
      openInitialModal: () => setIsInitialModalOpen(true),
      closeInitialModal: () => setIsInitialModalOpen(false),
      mode, lastUsedMode, phase, timerState, timeLeft, accumulatedStudyTime, accumulatedPauseTime, currentCycle, sessionActive,
      selectedMateriaId, selectedTopicoId,
      isWidgetOpen, toggleWidget: setIsWidgetOpen,
      viewMode, setViewMode,
      startSession, pauseTimer, resumeTimer, skipPhase, endSession, abandonSession
    }}>
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (context === undefined) {
    throw new Error('useStudyTimer must be used within a StudyTimerProvider');
  }
  return context;
}
