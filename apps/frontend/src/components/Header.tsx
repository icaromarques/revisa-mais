import React, { useState } from 'react';
import { Timer, Bell, Search, User as UserIcon, Settings, LogOut, ChevronDown, Play, Pause, SkipForward, Maximize2, Menu } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate, Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { formatDuration } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user, logout } = useAuth();
  const { 
    timerState, 
    sessionActive,
    pauseTimer,
    resumeTimer,
    openInitialModal,
    toggleWidget,
    isWidgetOpen,
    openSettings,
    timeLeft,
    phase,
    skipPhase,
    mode,
    lastUsedMode,
    startSession
  } = useStudyTimer();

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const { toggleSidebar } = useSidebar();

  const handleMainTimerClick = () => {
    if (!sessionActive) {
      openInitialModal();
    } else {
      if (!isWidgetOpen) {
         toggleWidget(true);
      }
    }
  };

  const handlePlayButtonClick = () => {
    if (!sessionActive) {
      if (lastUsedMode) {
        startSession(lastUsedMode);
      } else {
        openInitialModal();
      }
    } else {
      if (timerState === 'running') {
        pauseTimer();
      } else {
        resumeTimer();
      }
      if (!isWidgetOpen) {
         toggleWidget(true);
      }
    }
  };
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const avatarUrl = user?.fotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Felix'}&backgroundColor=c0aede`;

  const getModeColor = () => {
    // Parado / Pronto para iniciar
    if (!sessionActive) return 'bg-surface-container-lowest text-rose-400/70 border-outline/20 hover:border-rose-500/30 hover:bg-surface-container-low hover:text-rose-400 transition-colors shadow-sm';
    
    // Pausado
    if (timerState !== 'running') return 'bg-surface-container-low text-rose-300 border-rose-500/40 border-dashed hover:border-rose-500/60 transition-colors shadow-sm'; 
    
    if (mode === 'cronometro_livre') {
       return 'bg-primary/10 text-primary border-primary/50 shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-primary/30';
    }

    switch (phase) {
      case 'focus': 
        // Em andamento (Foco) - vinho/vermelho rubi
        return 'bg-rose-500/10 text-rose-500 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30';
      case 'shortBreak': 
      case 'longBreak': 
        // Descanso - lilás/primary
        return 'bg-primary/10 text-primary border-primary/50 shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-primary/30';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-[45] isolate pointer-events-auto h-[70px] px-4 lg:px-8 border-b border-outline backdrop-blur-[15px] bg-background flex justify-between items-center transition-all">
      <div className="flex items-center gap-3 lg:gap-8 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg text-on-surface hover:bg-hover-overlay lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
          <div className="hidden lg:block min-w-[200px] max-w-[400px]">
          <h2 className="text-xl font-bold text-on-surface tracking-tight line-clamp-2 leading-tight mb-1" title={title}>{title}</h2>
          {subtitle && <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider truncate" title={subtitle}>{subtitle}</p>}
        </div>
        
        <div className="hidden md:block relative max-w-md w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar matérias, tópicos, resumos..."
            className="w-full h-10 bg-surface-container-lowest border border-outline rounded-full pl-11 pr-4 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
        {children}
      </div>
      
      {/* Mobile Timer Action */}
      <button 
        onClick={handleMainTimerClick}
        className="md:hidden flex items-center justify-center p-2 rounded-full border border-outline hover:bg-surface-container-low transition-colors text-primary"
      >
        <Timer className="w-5 h-5" />
      </button>

      <div className="flex items-center justify-end gap-3 flex-1 w-full lg:w-auto">
        {/* Pomodoro Timer Premium */}
        <div className={`hidden md:flex items-center gap-2 md:gap-4 p-1.5 md:p-2 pl-3 md:pl-5 pr-2 md:pr-3 rounded-2xl border-2 transition-all duration-300 min-w-[auto] md:min-w-[240px] ${getModeColor()}`}>
          <button 
            onClick={handleMainTimerClick}
            className="flex flex-col justify-center flex-1 text-left hover:opacity-80 transition-opacity min-w-[70px]"
            title="Como você quer estudar agora?"
          >
            <span className="hidden md:block text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">
              {sessionActive ? (timerState !== 'running' ? 'PAUSADO' : (mode === 'cronometro_livre' ? 'CRONÔMETRO LIVRE' : phase === 'focus' ? 'Em Foco' : 'Em Descanso')) : 'Iniciar sessão'}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="tabular-nums font-black text-xl md:text-2xl tracking-tighter leading-none mt-0.5">
                {formatDuration(timeLeft)}
              </span>
            </div>
          </button>
          
          <button onClick={openSettings} className="hidden md:flex shrink-0 p-1.5 rounded-full hover:bg-black/10 transition-colors" title="Configurações">
            <Settings className="w-4 h-4 opacity-70" />
          </button>
          
          <div className="hidden md:block w-[1px] h-10 bg-current/20 mx-1"></div>
          
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
            <button 
              onClick={handlePlayButtonClick}
              className="p-2 md:p-2.5 rounded-xl hover:bg-black/15 transition-colors bg-black/5"
              title={timerState === 'running' ? "Pausar" : "Iniciar"}
            >
              {timerState === 'running' ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />}
            </button>
            <button 
              onClick={skipPhase}
              disabled={!sessionActive || mode === 'cronometro_livre'}
              className={`hidden md:flex p-2.5 rounded-xl hover:bg-black/15 transition-colors ${(!sessionActive || mode === 'cronometro_livre') ? 'opacity-30 cursor-not-allowed' : 'bg-black/5'}`}
              title="Pular Fase"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            {sessionActive && (
              <button 
                onClick={() => toggleWidget(true)}
                className="hidden md:flex p-2.5 rounded-xl hover:bg-black/15 transition-colors bg-black/5"
                title="Mostrar Widget"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isNotificationsOpen ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-background flex items-center justify-center text-[8px] font-black text-white">
              </div>
            )}
          </button>
          
          <NotificationsPopover 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
            notifications={notifications}
            loading={loading}
            userId={user?.uid || ''}
          />
        </div>
        
        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-outline hover:bg-surface-container-low transition-all group"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 overflow-hidden ring-offset-2 ring-offset-background group-hover:ring-2 ring-primary/20 transition-all">
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isUserMenuOpen && (
            <>
              {/* Overlay invisível para fechamento */}
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsUserMenuOpen(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-popover border border-outline/30 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-5 border-b border-outline/20 bg-surface-container-low/20">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden">
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate text-on-surface">{user?.displayName || 'Estudante'}</p>
                      <p className="text-[10px] text-on-surface-variant truncate font-medium">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2.5">
                  <Link 
                    to="/perfil" 
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-hover-overlay rounded-xl transition-all group"
                  >
                    <UserIcon className="w-4 h-4 text-outline group-hover:text-primary transition-colors" /> Perfil
                  </Link>
                  <Link 
                    to="/configuracoes" 
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-hover-overlay rounded-xl transition-all group"
                  >
                    <Settings className="w-4 h-4 text-outline group-hover:text-primary transition-colors" /> Configurações
                  </Link>
                  <Link 
                    to="/notificacoes" 
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-hover-overlay rounded-xl transition-all group"
                  >
                    <Bell className="w-4 h-4 text-outline group-hover:text-primary transition-colors" /> Notificações
                  </Link>
                  
                  <div className="h-[1px] bg-divider my-2 mx-3"></div>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-error/80 hover:text-error hover:bg-error/5 rounded-xl transition-all group"
                  >
                    <LogOut className="w-4 h-4 text-error/50 group-hover:text-error transition-colors" /> Sair da conta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}