import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  RotateCcw, 
  Layers, 
  HelpCircle, 
  Calendar, 
  FileText, 
  History, 
  User, 
  Settings, 
  LogOut,
  Plus,
  Clock,
  AlertCircle,
  Timer,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionModal } from '@/contexts/SessionModalContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyTimer } from '@/contexts/StudyTimerContext';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Grade Horária', path: '/grade', icon: Clock },
  { name: 'Matérias', path: '/materias', icon: BookOpen },
  { name: 'Controle de Faltas', path: '/faltas', icon: AlertCircle },
  { name: 'Planner', path: '/planner', icon: CalendarDays },
  { name: 'Revisões', path: '/revisoes', icon: RotateCcw },
  { name: 'Flashcards', path: '/flashcards', icon: Layers },
  { name: 'Questões', path: '/questoes', icon: HelpCircle },
  { name: 'Calendário', path: '/calendario', icon: Calendar },
  { name: 'Resumos', path: '/resumos', icon: FileText },
  { name: 'Histórico', path: '/historico', icon: History },
  { name: 'Perfil', path: '/perfil', icon: User },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openModal } = useSessionModal();
  const { openInitialModal: openTimerModal, sessionActive, isWidgetOpen, toggleWidget } = useStudyTimer();
  const { logout } = useAuth();
  const [isNewSessionMenuOpen, setIsNewSessionMenuOpen] = useState(false);
  const newSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newSessionRef.current && !newSessionRef.current.contains(event.target as Node)) {
        setIsNewSessionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleOpenTimerMenu = () => {
    if (sessionActive) {
       // if active, we just expand the widget or do nothing
       if (!isWidgetOpen) {
          toggleWidget(true);
       }
    } else {
       openTimerModal();
    }
    setIsNewSessionMenuOpen(false);
  };

  const handleOpenManualLog = () => {
    openModal();
    setIsNewSessionMenuOpen(false);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] z-40 bg-sidebar border-r border-outline flex flex-col py-6 px-4 overflow-y-auto hide-scrollbar">
      <div className="mb-8">
        <Link to="/dashboard" className="text-2xl font-extrabold tracking-tight text-on-surface flex items-center gap-2">
          Revisa<span className="text-primary">+</span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200",
                isActive 
                  ? "bg-surface-container-low text-on-surface font-semibold border-l-[3px] border-primary" 
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline pt-5 relative" ref={newSessionRef}>
        {isNewSessionMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-outline/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-1">
              <button onClick={handleOpenTimerMenu} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-on-surface hover:bg-hover-overlay rounded-lg transition-colors text-left group">
                <Timer className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" /> 
                <span className="flex-1">Timer (Pomodoro)</span>
              </button>
              <button onClick={handleOpenTimerMenu} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-on-surface hover:bg-hover-overlay rounded-lg transition-colors text-left group">
                <Clock className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" /> 
                <span className="flex-1">Cronômetro Livre</span>
              </button>
              <div className="h-[1px] bg-divider my-1 mx-2"></div>
              <button onClick={handleOpenManualLog} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-hover-overlay rounded-lg transition-colors text-left group">
                <Edit2 className="w-4 h-4 text-outline group-hover:text-on-surface transition-colors" /> 
                <span className="flex-1">Registro Manual</span>
              </button>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsNewSessionMenuOpen((prev) => !prev)}
          className="w-full bg-primary text-on-primary py-3 px-3 rounded-lg font-bold text-sm mb-3 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors relative"
        >
          <Plus className="w-4 h-4" />
          Nova Sessão
        </button>
        <Link to="/configuracoes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all duration-200">
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-error hover:bg-surface-container-low transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
