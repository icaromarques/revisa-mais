import { Header } from '@/components/Header';
import { Settings, Shield, Bell, Calendar as CalendarIcon, Clock, Zap, Monitor, Lock, LogOut, ChevronRight, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { googleCalendarService, GCalDiagnosticResult } from '@/services/googleCalendar';
import { GoogleCalendarsList } from '@/components/calendar/GoogleCalendarsList';
import { UserGoogleCalendar } from '@/types/googleCalendar';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { DataManagement } from '@/components/settings/DataManagement';
import { IntelligentPreferences } from '@/components/settings/IntelligentPreferences';
import { userPreferencesService } from '@/services/userPreferencesService';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';
import { settingsPresetService, FullConfiguration } from '@/services/settingsPresetService';
import { notificationService } from '@/services/notificationService';

function GoogleCalendarSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>({});
  const [googleCalendars, setGoogleCalendars] = useState<UserGoogleCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Call the newly implemented user endpoint
    apiClient.get('/usuarios/me').then(({ data }) => {
       setUserData(data);
    }).catch(console.error);
    
    userPreferencesService.getPreferences(user.id).then(p => {
       setPrefs(p?.googleCalendar || {
         syncReviewsByDefault: true,
         syncManualEventsByDefault: true,
         syncPlannerEventsByDefault: true,
         autoImportExternalEvents: true
       });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    googleCalendarService.getConnectionStatus(user.id).then(st => {
      setIsConnected(st.canSync);
      setLoading(false);
    });
  }, [user, userData]);

  useEffect(() => {
    if (!user || !isConnected) {
      setGoogleCalendars([]);
      return;
    }
    setLoadingCalendars(true);
    googleCalendarService
      .fetchCalendars()
      .then(setGoogleCalendars)
      .catch(() => setGoogleCalendars([]))
      .finally(() => setLoadingCalendars(false));
  }, [user, isConnected, userData?.gcal_last_sync]);

  const [diagnosticResult, setDiagnosticResult] = useState<GCalDiagnosticResult | null>(null);

  const handleConnect = async () => {
    if (!user) return;
    setLoading(true);
    setDiagnosticResult(null);
    try {
      const needsReconnect = userData?.gcal_needs_reconnect || userData?.gcal_token_status === 'expired' || userData?.gcal_token_status === 'missing_access_token' || userData?.gcal_token_status === 'error' || userData?.gcal_token_status === 'forbidden';
      
      if (isConnected && !needsReconnect) {
        const confirmDisconnect = window.confirm('Deseja realmente desconectar do Google Calendar?');
        if (!confirmDisconnect) {
            setLoading(false);
            return;
        }
        
        await googleCalendarService.disconnect(user.id);
        setIsConnected(false);
        toast.success("Desconectado do Google Calendar.");
      } else {
        if (userData?.gcal_token_status === 'connecting') {
           toast.info('Autorização já em andamento. Aguarde ou recarregue a página.');
           setLoading(false);
           return;
        }
        toast.info("Abrindo autorização do Google...", { duration: 3000 });
        const result = await googleCalendarService.diagnosticConnect(user.id);
        
        if (result.ok) {
           setIsConnected(true);
           toast.success("Google Calendar conectado com sucesso.");
           if (prefs.autoImportExternalEvents !== false) {
              await handleSyncNow();
           }
        } else {
           setDiagnosticResult(result);
           toast.error(result.message);
        }
      }
    } catch (e: any) {
      console.error("Connection flow error:", e);
      toast.error(e.message || 'Erro ao conectar com Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setSyncing(true);
    try {
       const status = await googleCalendarService.getConnectionStatus(user.id);
       if (!status.canSync) {
         toast.info(status.message || "Reconecte o Google Calendar para sincronizar.");
         return;
       }
       
       const timeMin = new Date();
       timeMin.setDate(1); // Start of month approx
       const timeMax = new Date();
       timeMax.setMonth(timeMax.getMonth() + 2); // Next 2 months
       
       const { calendarService } = await import('@/services/calendarService');
       await calendarService.syncGoogleRange(user.id, timeMin, timeMax);
       toast.success('Agenda sincronizada com sucesso!');
    } catch(e: any) {
       console.error("Sync error:", e);
       toast.error(e.message?.includes('expirou') ? 'Sua conexão com o Google Calendar expirou. Reconecte nas configurações.' : 'Ocorreu um erro ao buscar os eventos da agenda externa.');
    } finally {
       setSyncing(false);
    }
  };

  const handleTogglePref = async (key: string, value: boolean) => {
     try {
       const newPrefs = { ...prefs, [key]: value };
       setPrefs(newPrefs);
       await userPreferencesService.updatePreferences(user!.uid, 'googleCalendar', newPrefs);
     } catch (e) {
       console.error(e);
       toast.error("Erro ao salvar preferência");
     }
  };

  if (loading) return <div className="text-sm opacity-50 py-4">Verificando Integração...</div>;

  const needsReconnect = userData?.gcal_needs_reconnect || userData?.gcal_token_status === 'expired';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-surface-container-low/30 rounded-2xl border border-outline/30 gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
             <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight">Google Calendar</h4>
            <p className="text-[11px] text-on-surface-variant font-medium">Sincronize prazos e revisões automaticamente</p>
            {isConnected && !needsReconnect && (
               <p className="text-[9px] mt-1 text-primary/70 font-semibold">
                 {userData?.gcal_last_sync 
                   ? `Sincronizado há ${Math.floor((new Date().getTime() - new Date(userData.gcal_last_sync).getTime()) / 60000)} min`
                   : 'Sincronização pendente'}
               </p>
            )}
            {isConnected && needsReconnect && (
               <p className="text-[11px] mt-1 text-error font-semibold flex items-center gap-1">
                 <AlertTriangle className="w-3 h-3" />
                 Conexão Expirada. Por favor, reconecte.
               </p>
            )}
            {!isConnected && userData?.gcal_token_status === 'connecting' && (
               <p className="text-[11px] mt-1 text-primary animate-pulse font-semibold flex items-center gap-1">
                 Autorização em andamento...
               </p>
            )}
           </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button 
            onClick={handleConnect}
            disabled={loading || syncing || userData?.gcal_token_status === 'connecting'}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isConnected && !needsReconnect
                ? 'bg-error/10 text-error hover:bg-error/20' 
                : 'bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20'
            }`}
          >
            {isConnected && !needsReconnect ? 'Desconectar' : 'Reconectar Agora'}
          </button>
          
          {isConnected && (
            <button 
              onClick={handleSyncNow}
              disabled={syncing || needsReconnect || userData?.gcal_token_status === 'connecting'}
              className="px-5 py-2 rounded-xl text-[10px] font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline/10 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Sincronizando...' : 'Forçar Sincronização'}
            </button>
          )}
        </div>
      </div>

      {diagnosticResult && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-error/5 border border-error/20 flex flex-col gap-2 mt-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <h4 className="text-xs font-bold text-error">Diagnóstico da conexão</h4>
          </div>
          <div className="space-y-1 text-[11px] text-on-surface-variant">
            <p><strong>Etapa:</strong> {diagnosticResult.step}</p>
            <p><strong>Mensagem:</strong> {diagnosticResult.message}</p>
            {diagnosticResult.technical?.googleStatus && (
              <p><strong>Status Google:</strong> {diagnosticResult.technical.googleStatus} {diagnosticResult.technical.googleStatusText}</p>
            )}
            {diagnosticResult.technical?.googleError && (
              <p className="font-mono text-[9px] bg-black/5 p-1 rounded mt-1 overflow-x-auto">
                  {typeof diagnosticResult.technical.googleError === 'object' 
                     ? diagnosticResult.technical.googleError.error?.message || JSON.stringify(diagnosticResult.technical.googleError)
                     : diagnosticResult.technical.googleError}
              </p>
            )}
            <div className="mt-2 text-primary/80 font-medium">
               <strong>Sugestão:</strong>{' '}
               {diagnosticResult.step === 'calendar_probe_403' && "Ative Google Calendar API no Google Cloud e revise OAuth Consent Screen/Test users."}
               {diagnosticResult.step === 'missing_access_token' && "O popup não retornou token Calendar. Revise scopes e fluxo Firebase."}
               {diagnosticResult.step === 'calendar_probe_401' && "Token recusado/expirado. Reconecte."}
               {diagnosticResult.step === 'unknown_error' && "Verifique o console do navegador para mais detalhes."}
            </div>
          </div>
        </motion.div>
      )}

      {isConnected && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-surface-container-lowest rounded-2xl border border-outline/20 space-y-4"
        >
          <GoogleCalendarsList
            calendars={googleCalendars}
            loading={loadingCalendars}
            onToggle={async (googleCalendarId, selected) => {
              const prev = googleCalendars;
              setGoogleCalendars((list) =>
                list.map((c) =>
                  c.google_calendar_id === googleCalendarId ? { ...c, selected } : c
                )
              );
              try {
                await googleCalendarService.setCalendarSelected(googleCalendarId, selected);
                if (selected && user) {
                  const { calendarService } = await import('@/services/calendarService');
                  const timeMin = new Date();
                  timeMin.setDate(1);
                  const timeMax = new Date();
                  timeMax.setMonth(timeMax.getMonth() + 2);
                  await calendarService.syncGoogleRange(user.id, timeMin, timeMax);
                }
              } catch {
                setGoogleCalendars(prev);
                toast.error('Erro ao atualizar agenda.');
              }
            }}
            onRefresh={async () => {
              try {
                const data = await googleCalendarService.refreshCalendars();
                setGoogleCalendars(data);
                toast.success('Agendas atualizadas do Google.');
              } catch {
                toast.error('Erro ao buscar agendas.');
              }
            }}
          />

          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                 type="checkbox" 
                 checked={prefs.syncReviewsByDefault !== false}
                 onChange={(e) => handleTogglePref('syncReviewsByDefault', e.target.checked)}
                 className="peer w-5 h-5 rounded border-outline/30 text-primary bg-surface-container-lowest focus:ring-offset-0 focus:ring-0 transition-all" 
              />
              <div className="absolute inset-0 bg-primary/20 scale-0 peer-checked:scale-150 rounded-full blur-lg transition-transform"></div>
            </div>
            <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">Enviar Revisões Automáticas para GCal</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                 type="checkbox" 
                 checked={prefs.syncManualEventsByDefault !== false}
                 onChange={(e) => handleTogglePref('syncManualEventsByDefault', e.target.checked)}
                 className="peer w-5 h-5 rounded border-outline/30 text-primary bg-surface-container-lowest focus:ring-offset-0 focus:ring-0 transition-all" 
              />
              <div className="absolute inset-0 bg-primary/20 scale-0 peer-checked:scale-150 rounded-full blur-lg transition-transform"></div>
            </div>
            <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">Sincronizar Eventos Manuais por padrão</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                 type="checkbox" 
                 checked={prefs.syncPlannerEventsByDefault !== false}
                 onChange={(e) => handleTogglePref('syncPlannerEventsByDefault', e.target.checked)}
                 className="peer w-5 h-5 rounded border-outline/30 text-primary bg-surface-container-lowest focus:ring-offset-0 focus:ring-0 transition-all" 
              />
              <div className="absolute inset-0 bg-primary/20 scale-0 peer-checked:scale-150 rounded-full blur-lg transition-transform"></div>
            </div>
            <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">Sincronizar Tarefas do Planner</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                 type="checkbox" 
                 checked={prefs.autoImportExternalEvents !== false}
                 onChange={(e) => handleTogglePref('autoImportExternalEvents', e.target.checked)}
                 className="peer w-5 h-5 rounded border-outline/30 text-primary bg-surface-container-lowest focus:ring-offset-0 focus:ring-0 transition-all" 
              />
              <div className="absolute inset-0 bg-primary/20 scale-0 peer-checked:scale-150 rounded-full blur-lg transition-transform"></div>
            </div>
            <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">Importar Eventos do Google para o Revisa+</span>
          </label>
        </motion.div>
      )}
    </div>
  );
}

export function Configuracoes() {
  const { user, logout } = useAuth();
  const { openSettings: openPomodoroSettings } = useStudyTimer();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'preferences' | 'notifications' | 'agenda' | 'study' | 'appearance' | 'account' | 'data'>('preferences');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const patchProfileSettings = async (updates: Record<string, unknown>) => {
    await apiClient.patch('/usuarios/perfil/settings', updates);
    setUserData((prev: any) => ({
      ...prev,
      settings: { ...(prev?.settings || {}), ...updates }
    }));
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch preferences first as they are needed for analysis
    userPreferencesService.getPreferences(user.id).then(prefs => {
      setPreferences(prefs);
    });

    apiClient.get('/usuarios/me').then(({ data }) => {
      setUserData(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build Executive Summary
  let summary = null;
  if (userData && preferences) {
    const config: FullConfiguration = { preferences, settings: userData.settings || {} };
    summary = settingsPresetService.getConfigurationSummary(config);
  }

  if (loading || !preferences) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  const sections = [
    { id: 'preferences', label: 'Estratégia e Presets', icon: Settings, desc: 'Motor de Decisão e Perfil' },
    { id: 'study', label: 'Estudo e Revisões', icon: Clock, desc: 'Durações e Sensibilidade' },
    { id: 'agenda', label: 'Agenda e Rotina', icon: CalendarIcon, desc: 'Conflitos e Horários' },
    { id: 'notifications', label: 'Notificações', icon: Bell, desc: 'Frequência e Alertas' },
    { id: 'appearance', label: 'Aparência', icon: Monitor, desc: 'Visual do sistema' },
    { id: 'account', label: 'Conta e Segurança', icon: Lock, desc: 'Acesso e privacidade' },
    { id: 'data', label: 'Gerenciamento de Dados', icon: Database, desc: 'Limpeza e backups' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface">
      <Header title="Configurações do Sistema" />

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Executive Summary */}
        {summary && (
          <div className="p-6 bg-surface-container rounded-[2rem] border border-outline/10 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
             
             <div className="w-16 h-16 shrink-0 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center relative z-10">
                <Settings className="w-8 h-8 text-primary" />
             </div>
             <div className="flex-1 relative z-10 space-y-1 text-center md:text-left">
                <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">Análise do Sistema</h2>
                <p className="text-xs font-semibold text-on-surface-variant flex items-center justify-center md:justify-start gap-2">
                   O seu Revisa+ está configurado no modelo <strong className="text-primary uppercase tracking-widest">{summary.presetName}</strong>
                </p>
             </div>
             
             <div className="grid grid-cols-3 gap-4 w-full md:w-auto relative z-10">
                <div className="text-center bg-surface-container-highest/50 p-3 rounded-xl border border-outline/5">
                   <p className="text-[9px] uppercase tracking-widest font-black text-on-surface-variant mb-1">Revisões</p>
                   <p className="text-xs font-bold text-on-surface">{summary.reviews}</p>
                </div>
                <div className="text-center bg-surface-container-highest/50 p-3 rounded-xl border border-outline/5">
                   <p className="text-[9px] uppercase tracking-widest font-black text-on-surface-variant mb-1">Automação</p>
                   <p className="text-xs font-bold text-on-surface">{summary.automation}</p>
                </div>
                <div className="text-center bg-surface-container-highest/50 p-3 rounded-xl border border-outline/5">
                   <p className="text-[9px] uppercase tracking-widest font-black text-on-surface-variant mb-1">Alertas</p>
                   <p className="text-xs font-bold text-on-surface">{summary.alerts}</p>
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  activeSection === section.id 
                    ? 'bg-primary text-on-primary shadow-xl shadow-primary/20' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${
                  activeSection === section.id ? 'bg-on-primary/10' : 'bg-surface-container-highest group-hover:bg-surface-variant'
                }`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase tracking-tight leading-none mb-1">{section.label}</p>
                  <p className={`text-[10px] font-medium opacity-70 ${activeSection === section.id ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    {section.desc}
                  </p>
                </div>
              </button>
            ))}

            <div className="pt-8 px-4">
               <button 
                onClick={handleLogout}
                className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-error/60 hover:text-error transition-colors"
               >
                 <LogOut className="w-4 h-4" /> Sair da conta
               </button>
            </div>
          </aside>

          {/* Content Area */}
          <section className="lg:col-span-8 glass-panel rounded-[32px] overflow-hidden border border-outline/20">
            <div className="p-8 space-y-8 min-h-[500px]">
              
              {activeSection === 'preferences' && (
                <IntelligentPreferences 
                  preferences={preferences} 
                  onChangePreferences={setPreferences} 
                  settings={userData?.settings || {}} 
                />
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="header">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Central de Notificações</h3>
                    <p className="text-sm text-on-surface-variant">Gerencie como você recebe atualizações do Revisa+</p>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        {
                          key: 'revisoes_automaticas' as const,
                          title: 'Revisões Automáticas',
                          desc: 'Avisar quando houver revisões agendadas para o dia',
                          icon: Zap
                        },
                        {
                          key: 'lembretes_estudo' as const,
                          title: 'Lembretes de Estudo',
                          desc: 'Notificar início de sessões e horários de grade',
                          icon: Clock
                        },
                        {
                          key: 'avaliacoes_provas' as const,
                          title: 'Avaliações e Provas',
                          desc: 'Alertas para compromissos acadêmicos fixos',
                          icon: CalendarIcon
                        },
                        {
                          key: 'metas_streaks' as const,
                          title: 'Metas e Streaks',
                          desc: 'Avisos sobre progresso e conquistas diárias',
                          icon: Monitor
                        }
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-5 bg-surface-container-low/30 rounded-2xl border border-outline/30 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-tight">{item.title}</h4>
                            <p className="text-[10px] text-on-surface-variant font-medium">{item.desc}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notifications[item.key] ?? true}
                            onChange={async (e) => {
                              const checked = e.target.checked;
                              const next = {
                                ...preferences,
                                notifications: {
                                  ...preferences.notifications,
                                  [item.key]: checked
                                }
                              };
                              setPreferences(next);
                              try {
                                await userPreferencesService.updatePreferences(
                                  user!.id,
                                  'notifications',
                                  { [item.key]: checked }
                                );
                                await notificationService.syncNotificationsFromModules(user!.id);
                                toast.success('Preferências de notificação atualizadas.');
                              } catch {
                                setPreferences(preferences);
                                toast.error('Não foi possível salvar a preferência.');
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'agenda' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="header">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Agenda e Sincronização</h3>
                    <p className="text-sm text-on-surface-variant">Conecte sua vida acadêmica com ferramentas externas</p>
                  </div>
                  
                  <GoogleCalendarSettings />

                  {/* Rest Window Settings */}
                  <div className="p-8 bg-surface-container-low/30 rounded-3xl border border-outline/30 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
                           <Clock className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight">Horários protegidos / Janela de descanso</h4>
                          <p className="text-[11px] text-on-surface-variant font-medium">O sistema não agendará automaticamente revisões, estudos ou blocos nesse período.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={userData?.settings?.restWindow?.active ?? true}
                          onChange={(e) => {
                            patchProfileSettings({
                              restWindow: { ...(userData?.settings?.restWindow || {}), active: e.target.checked }
                            });
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    <div className={cn(
                      "grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-outline/10 transition-all",
                      !(userData?.settings?.restWindow?.active ?? true) && "opacity-40 pointer-events-none grayscale"
                    )}>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest">Hora inicial</label>
                          <input 
                            type="time" 
                            value={userData?.settings?.restWindow?.start ?? '00:00'}
                            onChange={(e) => {
                              patchProfileSettings({
                                restWindow: { ...(userData?.settings?.restWindow || {}), start: e.target.value }
                              });
                            }}
                            className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-sm font-black outline-none focus:border-primary transition-colors"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest">Hora final</label>
                          <input 
                            type="time" 
                            value={userData?.settings?.restWindow?.end ?? '07:00'}
                            onChange={(e) => {
                              patchProfileSettings({
                                restWindow: { ...(userData?.settings?.restWindow || {}), end: e.target.value }
                              });
                            }}
                            className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-sm font-black outline-none focus:border-primary transition-colors"
                          />
                       </div>
                       
                       <div className="sm:col-span-2 flex items-center justify-between p-4 bg-surface-container/50 rounded-xl border border-outline/10">
                          <div>
                            <h5 className="text-[11px] font-bold">Permitir Criação Manual</h5>
                            <p className="text-[9px] text-on-surface-variant">Apenas avisa que está na janela de descanso ao criar manualmente.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={userData?.settings?.restWindow?.allowManual ?? true}
                              onChange={(e) => {
                                patchProfileSettings({
                                  restWindow: { ...(userData?.settings?.restWindow || {}), allowManual: e.target.checked }
                                });
                              }}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                          </label>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <Zap className="w-3.5 h-3.5" /> Encaixe Inteligente
                    </h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">
                      Suas revisões são agendadas automaticamente em seus horários livres. 
                      O sistema evitará horários ocupados de rotina e a janela de descanso.
                    </p>
                    <button 
                      onClick={() => navigate('/grade')}
                      className="text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      Ajustar minha Grade Horária Fixa →
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'study' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="header">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Comportamento de Estudo</h3>
                    <p className="text-sm text-on-surface-variant">Configure o funcionamento do Pomodoro e fluxos de estudo</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={openPomodoroSettings}
                      className="p-6 bg-surface-container-low/30 rounded-2xl border border-outline/30 hover:border-primary/20 transition-all text-left group"
                    >
                      <Clock className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                      <h4 className="text-sm font-black uppercase tracking-tight">Intervalos Pomodoro</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1">Configurar tempos de foco e pausa</p>
                    </button>
                    <div className="p-6 bg-surface-container-low/30 rounded-2xl border border-outline/30 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight leading-tight">Sugestão de Revisão</h4>
                        <p className="text-[10px] text-on-surface-variant mt-1">Sugerir revisões ao final de cada sessão concluída</p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={userData?.settings?.showRevisionSuggestion ?? true}
                            onChange={(e) => {
                              patchProfileSettings({ showRevisionSuggestion: e.target.checked });
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Revisões Inteligentes */}
                  <div className="p-8 bg-surface-container-low/30 rounded-3xl border border-outline/30 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/20">
                           <Zap className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight">Revisões Inteligentes</h4>
                          <p className="text-[11px] text-on-surface-variant font-medium">Lógica adaptativa baseada no desempenho real</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={userData?.settings?.intelligentRevision?.active ?? true}
                          onChange={(e) => {
                            patchProfileSettings({
                              intelligentRevision: { ...(userData?.settings?.intelligentRevision || {}), active: e.target.checked }
                            });
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary shadow-inner"></div>
                      </label>
                    </div>

                    <div className={cn(
                      "grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-outline/10 transition-all",
                      !(userData?.settings?.intelligentRevision?.active ?? true) && "opacity-40 pointer-events-none grayscale"
                    )}>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest">Modo de Aplicação</label>
                          <div className="flex flex-col gap-2">
                             {[
                               { id: 'suggestion', label: 'Apenas Sugestão', desc: 'Sistema mostra aviso sem pré-marcar' },
                               { id: 'auto', label: 'Base Automática', desc: 'Já abre o modal com marcos sugeridos' }
                             ].map(mode => (
                               <button
                                 key={mode.id}
                                 onClick={() => {
                                   patchProfileSettings({
                                     intelligentRevision: { ...(userData?.settings?.intelligentRevision || {}), mode: mode.id }
                                   });
                                 }}
                                 className={cn(
                                   "p-4 rounded-xl border text-left transition-all",
                                   (userData?.settings?.intelligentRevision?.mode ?? 'suggestion') === mode.id
                                     ? "border-secondary bg-secondary/5"
                                     : "border-outline/20 hover:border-outline/50"
                                 )}
                               >
                                  <p className="text-xs font-black uppercase tracking-tight">{mode.label}</p>
                                  <p className="text-[10px] text-on-surface-variant">{mode.desc}</p>
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest">Sensibilidade</label>
                          <div className="flex flex-col gap-2">
                             {[
                               { id: 'conservative', label: 'Conservadora', desc: 'Espaça mais as revisões' },
                               { id: 'balanced', label: 'Equilibrada', desc: 'Equilíbrio padrão Revisa+' },
                               { id: 'intensive', label: 'Intensiva', desc: 'Aproxima revisões por precaução' }
                             ].map(sense => (
                               <button
                                 key={sense.id}
                                 onClick={() => {
                                   patchProfileSettings({
                                     intelligentRevision: { ...(userData?.settings?.intelligentRevision || {}), sensitivity: sense.id }
                                   });
                                 }}
                                 className={cn(
                                   "p-4 rounded-xl border text-left transition-all",
                                   (userData?.settings?.intelligentRevision?.sensitivity ?? 'balanced') === sense.id
                                     ? "border-secondary bg-secondary/5"
                                     : "border-outline/20 hover:border-outline/50"
                                 )}
                               >
                                  <p className="text-xs font-black uppercase tracking-tight">{sense.label}</p>
                                  <p className="text-[10px] text-on-surface-variant">{sense.desc}</p>
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="header">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Layout e Temas</h3>
                    <p className="text-sm text-on-surface-variant">Personalize a aparência visual do Revisa+</p>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-outline tracking-widest">Tema Visual</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <button className="relative p-5 rounded-3xl border-2 border-primary bg-primary/5 flex flex-col items-center gap-3 group ring-4 ring-primary/5">
                          <div className="w-16 h-10 bg-[#0b0b0f] rounded-xl border border-outline shadow-2xl"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Dark Premium</span>
                        </button>
                        <button className="p-5 rounded-3xl border border-outline/20 bg-surface-container-low/20 flex flex-col items-center gap-3 opacity-40 cursor-not-allowed">
                          <div className="w-16 h-10 bg-white rounded-xl border border-outline"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Light (EM BREVE)</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-[#0f1117] rounded-3xl border border-outline/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <div>
                            <h4 className="text-xs font-black uppercase tracking-tight">Densidade do Dashboard</h4>
                            <p className="text-[10px] text-on-surface-variant">Ocultar cards menos usados</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={false} className="sr-only peer" />
                          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'account' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="header">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Conta e Segurança</h3>
                    <p className="text-sm text-on-surface-variant">Proteja seus dados acadêmicos e gerencie seu acesso</p>
                  </div>

                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 bg-surface-container-low/30 rounded-2xl border border-outline/30 hover:bg-surface-container-low transition-all group">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                           <Shield className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
                         </div>
                         <div className="text-left">
                           <h4 className="text-sm font-black uppercase tracking-tight">Alterar Senha de Acesso</h4>
                           <p className="text-[10px] text-on-surface-variant">Link de redefinição via e-mail</p>
                         </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-outline" />
                    </button>

                    <div className="p-8 border border-error/20 bg-error/5 rounded-3xl space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-error flex items-center gap-2">
                         <Shield className="w-3.5 h-3.5" /> Zona Crítica
                       </h4>
                       <p className="text-[10px] text-on-surface-variant leading-relaxed">
                         A exclusão da conta é permanente. Todos os seus dados de matérias, flashcards, revisões e histórico serão apagados dos nossos servidores instantaneamente.
                       </p>
                       <button className="text-[10px] font-black text-error/60 uppercase tracking-widest hover:text-error transition-colors px-4 py-2 bg-error/10 rounded-xl">
                         Deletar Conta Permanentemente
                       </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'data' && (
                <DataManagement />
              )}

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
