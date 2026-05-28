import { useState, useMemo } from 'react';
import { usePreferences } from '@/hooks/usePreferences';
import { 
  Bell, Zap, Flame, Calendar as CalendarIcon, CheckCircle, BrainCircuit, X, 
  ChevronDown, ChevronRight, Inbox, History, ArrowRight, AlertTriangle, 
  BookOpen, Clock, Settings, MoreVertical, Archive, Check, ExternalLink 
} from 'lucide-react';
import { AppNotification, NotificationAction } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  loading: boolean;
  userId: string;
}

export function NotificationsPopover({ 
  isOpen, 
  onClose, 
  notifications, 
  loading,
  userId
}: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const { preferences } = usePreferences();

  const { unread, filtered } = useMemo(() => {
    // Priority weights to filter out lower priorities
    const priorityScore = { critica: 4, alta: 3, media: 2, baixa: 1 };
    const minPriority = preferences?.notifications?.min_priority || 'baixa';
    const minScore = priorityScore[minPriority as keyof typeof priorityScore] || 1;

    const allowedNotifications = notifications.filter(n => {
       const score = priorityScore[n.prioridade] || 1;
       return score >= minScore;
    });

    const unreadList = allowedNotifications.filter(n => n.status === 'nao_lida');
    const displayList = activeTab === 'unread' ? unreadList : allowedNotifications.filter(n => n.status !== 'arquivada' && n.status !== 'resolvida');
    
    return { 
      unread: unreadList, 
      filtered: displayList.sort((a, b) => {
        // Critical/High first, then by date
        const scoreA = (priorityScore[a.prioridade] || 0) * 1000000000000 + new Date(a.created_at).getTime();
        const scoreB = (priorityScore[b.prioridade] || 0) * 1000000000000 + new Date(b.created_at).getTime();
        return scoreB - scoreA;
      })
    };
  }, [notifications, activeTab, preferences]);

  if (!isOpen) return null;

  const handleAction = (notification: AppNotification, action?: NotificationAction) => {
    // Mark as read when interacting
    if (notification.status === 'nao_lida') {
      notificationService.markAsRead(notification.id);
    }

    if (!action) {
      // Default behavior if no specific action clicked
      if (notification.rota_destino) navigate(notification.rota_destino);
      else if (notification.category === 'revisao') navigate('/revisoes');
      else if (notification.category === 'falta') navigate('/faltas');
      else if (notification.category === 'agenda') navigate('/calendario');
      onClose();
      return;
    }

    // Specific action logic
    switch (action.type) {
      case 'abrir_revisao':
        navigate('/revisoes');
        break;
      case 'abrir_falta':
        navigate('/faltas');
        break;
      case 'abrir_calendario':
        navigate('/calendario');
        break;
      case 'navigate':
        if (action.payload?.path) navigate(action.payload.path);
        break;
      case 'arquivar':
        notificationService.archiveNotification(notification.id);
        break;
      default:
        console.log('Action not handled:', action);
    }
    
    onClose();
  };

  const getIconForCategory = (category: AppNotification['category'], priority: string) => {
    if (priority === 'critica' || priority === 'alta') {
      return <AlertTriangle className="w-5 h-5 text-error" />;
    }
    switch (category) {
      case 'revisao': return <Zap className="w-5 h-5 text-primary" />;
      case 'falta': return <BookOpen className="w-5 h-5 text-error" />;
      case 'reposicao': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'agenda': return <CalendarIcon className="w-5 h-5 text-tertiary" />;
      case 'avaliacao': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'planner': return <Clock className="w-5 h-5 text-secondary" />;
      case 'material': return <Inbox className="w-5 h-5 text-primary" />;
      case 'integridade': return <BrainCircuit className="w-5 h-5 text-on-surface-variant" />;
      default: return <Bell className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute right-0 top-12 w-[320px] md:w-[420px] bg-[#0b0b0f] border border-outline shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] origin-top-right"
      >
        {/* Header */}
        <div className="p-4 border-b border-outline/30 bg-surface-container-lowest/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm tracking-wide text-on-surface">Central de Alertas</h4>
              {unread.length > 0 && (
                <span className="bg-primary text-on-primary text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20 animate-pulse">
                  {unread.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
               <button 
                onClick={() => notificationService.markAllAsRead(userId)} 
                className="p-2 hover:bg-surface-variant rounded-lg text-on-surface-variant transition-colors"
                title="Marcar todas como lidas"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-variant rounded-lg text-on-surface-variant transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex p-1 bg-surface-container rounded-xl">
             <button 
              onClick={() => setActiveTab('unread')}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeTab === 'unread' ? "bg-background text-primary shadow-sm" : "text-outline hover:text-on-surface-variant"
              )}
             >
               Não lidas
             </button>
             <button 
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeTab === 'all' ? "bg-background text-primary shadow-sm" : "text-outline hover:text-on-surface-variant"
              )}
             >
               Recentes
             </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 bg-[#0b0b0f]">
          {loading ? (
             <div className="p-4 space-y-4">
               {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 border border-outline/10 rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-highest shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-3 bg-surface-container-highest rounded w-3/4" />
                      <div className="h-2 bg-surface-container-highest rounded w-full" />
                    </div>
                  </div>
               ))}
             </div>
          ) : (
            <div className="flex flex-col">
              <div className="p-3 space-y-2">
                {filtered.length === 0 ? (
                  <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-surface-container-low mb-4 flex items-center justify-center border border-outline/10 shadow-inner">
                      <Inbox className="w-8 h-8 text-on-surface-variant opacity-20" />
                    </div>
                    <p className="text-sm font-bold text-on-surface">Tudo limpo por aqui</p>
                    <p className="text-xs text-on-surface-variant mt-1 opacity-60">Você está em dia com todas as suas metas e avisos.</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {filtered.map((notification) => (
                      <motion.div 
                        key={notification.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className={cn(
                          "relative group rounded-2xl p-4 transition-all border",
                          notification.status === 'nao_lida' 
                            ? "bg-surface-container-low border-outline/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]" 
                            : "bg-background/50 border-outline/10 opacity-70 hover:opacity-100"
                        )}
                      >
                        {notification.status === 'nao_lida' && (
                          <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        )}

                        <div className="flex gap-4 items-start">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-outline/10",
                            notification.prioridade === 'critica' ? "bg-error/10" : "bg-surface-container-low"
                          )}>
                             {getIconForCategory(notification.category, notification.prioridade)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                               <span className={cn(
                                 "text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded",
                                 notification.prioridade === 'critica' ? "text-error bg-error/10" : "text-outline bg-surface-container-highest"
                               )}>
                                 {notification.category}
                               </span>
                               <span className="text-[10px] text-outline font-medium">
                                 {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                               </span>
                            </div>
                            
                            <h5 className="text-xs font-bold text-on-surface leading-snug">
                              {notification.titulo}
                            </h5>
                            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                              {notification.mensagem}
                            </p>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {notification.actions?.slice(0, 2).map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => { e.stopPropagation(); handleAction(notification, action); }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    idx === 0 
                                      ? "bg-primary text-on-primary hover:brightness-110 shadow-lg shadow-primary/20" 
                                      : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"
                                  )}
                                >
                                  {action.label}
                                </button>
                              ))}
                              {!notification.actions?.length && (
                                <button 
                                  onClick={() => handleAction(notification)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-all"
                                >
                                  Ver detalhes <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute bottom-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                           <button 
                            onClick={(e) => { e.stopPropagation(); notificationService.archiveNotification(notification.id); }}
                            className="p-2 hover:bg-surface-variant rounded-xl text-outline transition-colors"
                            title="Arquivar"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline/30 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-outline font-medium">Revisa+ Pulse v2.0</p>
          <button 
            onClick={() => { onClose(); navigate('/notificacoes'); }}
            className="flex items-center gap-2 py-1.5 px-4 rounded-xl hover:bg-primary/10 text-primary transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Ver Histórico</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
