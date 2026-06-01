import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Bell, Zap, Flame, Calendar as CalendarIcon, CheckCircle, 
  BrainCircuit, X, Inbox, History, Filter, Check, 
  Trash2, ExternalLink, AlertTriangle, BookOpen, Clock, Archive
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification, NotificationCategory, NotificationAction } from '@/types/notifications';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';

type FilterType = 'all' | 'unread' | 'revisoes' | 'faltas' | 'avaliacoes';

export function Notificacoes() {
  const { 
    notifications, 
    loading, 
    markAsRead, 
    removeNotification, 
    markAllAsRead,
    archiveNotification
  } = useNotifications();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        if (n.status === 'arquivada' || n.status === 'resolvida') return false;
        if (activeFilter === 'unread') return n.status === 'nao_lida';
        if (activeFilter === 'revisoes') return n.category === 'revisao';
        if (activeFilter === 'faltas') return n.category === 'falta' || n.category === 'reposicao';
        if (activeFilter === 'avaliacoes') return n.category === 'avaliacao' || n.category === 'agenda';
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications, activeFilter]);

  const handleAction = (notification: AppNotification, action?: NotificationAction) => {
    if (notification.status === 'nao_lida') {
      markAsRead(notification.id);
    }

    if (!action) {
      if (notification.rota_destino) navigate(notification.rota_destino);
      else if (notification.category === 'revisao') navigate('/revisoes');
      else if (notification.category === 'falta') navigate('/faltas');
      else if (notification.category === 'agenda') navigate('/calendario');
      return;
    }

    switch (action.type) {
      case 'abrir_revisao': navigate('/revisoes'); break;
      case 'abrir_falta': navigate('/faltas'); break;
      case 'abrir_calendario': navigate('/calendario'); break;
      case 'navigate': if (action.payload?.path) navigate(action.payload.path); break;
      case 'arquivar': archiveNotification(notification.id); break;
      default: console.log('Action not handled:', action);
    }
  };

  const getIconForCategory = (category: NotificationCategory, priority: string) => {
    if (priority === 'critica' || priority === 'alta') return <AlertTriangle className="w-6 h-6 text-error" />;
    switch (category) {
      case 'revisao': return <Zap className="w-6 h-6 text-primary" />;
      case 'falta': return <BookOpen className="w-6 h-6 text-error" />;
      case 'reposicao': return <CheckCircle className="w-6 h-6 text-success" />;
      case 'agenda': return <CalendarIcon className="w-6 h-6 text-tertiary" />;
      case 'avaliacao': return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'planner': return <Clock className="w-6 h-6 text-secondary" />;
      default: return <Bell className="w-6 h-6 text-on-surface-variant" />;
    }
  };

  const filters: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'Todas', icon: Inbox },
    { id: 'unread', label: 'Não lidas', icon: Bell },
    { id: 'revisoes', label: 'Revisões', icon: Zap },
    { id: 'faltas', label: 'Faltas', icon: BookOpen },
    { id: 'avaliacoes', label: 'Avaliações', icon: CalendarIcon },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Notificações" subtitle="Central de Alertas e Insights" />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline/10">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                  activeFilter === filter.id 
                    ? 'bg-primary text-on-primary shadow-xl shadow-primary/20 scale-105' 
                    : 'bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant'
                )}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => markAllAsRead()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl transition-all"
          >
            <Check className="w-4 h-4" />
            Limpar tudo
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 glass-panel rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 rounded-[2.5rem] bg-surface-container-low flex items-center justify-center mb-6 border border-outline/10 shadow-inner rotate-12">
                <Inbox className="w-10 h-10 opacity-10 -rotate-12" />
              </div>
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Caixa de entrada limpa</h3>
              <p className="text-sm text-on-surface-variant mt-2 opacity-60">
                Você não tem notificações nesta categoria no momento.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence initial={false} mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative glass-panel rounded-3xl p-6 transition-all border",
                      notification.status === 'nao_lida' 
                        ? 'border-primary/20 bg-surface-container-low/50 shadow-xl' 
                        : 'border-outline/10 opacity-70 grayscale-[0.2]'
                    )}
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-outline/10",
                        notification.prioridade === 'critica' ? 'bg-error/10' : 'bg-surface-container-low'
                      )}>
                        {getIconForCategory(notification.category, notification.prioridade)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg",
                                notification.prioridade === 'critica' ? "bg-error/20 text-error" : "bg-primary/10 text-primary"
                              )}>
                                {notification.category}
                              </span>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <h4 className="text-lg font-black text-on-surface tracking-tight leading-tight pt-1">
                              {notification.titulo}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => archiveNotification(notification.id)}
                              className="p-3 rounded-2xl bg-surface-container text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all shadow-sm"
                              title="Arquivar"
                            >
                              <Archive className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="p-3 rounded-2xl bg-surface-container text-on-surface-variant hover:text-error hover:bg-error/10 transition-all shadow-sm"
                              title="Excluir permanentemente"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-on-surface-variant/80 leading-relaxed max-w-2xl">
                          {notification.mensagem}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                           {notification.actions?.map((action, idx) => (
                             <button
                               key={idx}
                               onClick={() => handleAction(notification, action)}
                               className={cn(
                                 "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                 idx === 0 
                                  ? "bg-primary text-on-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95" 
                                  : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"
                               )}
                             >
                               {action.label}
                               {idx === 0 && <ExternalLink className="w-3 h-3" />}
                             </button>
                           ))}
                           {!notification.actions?.length && (
                             <button
                               onClick={() => handleAction(notification)}
                               className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                             >
                               Ver Detalhes
                               <ExternalLink className="w-3 h-3" />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
