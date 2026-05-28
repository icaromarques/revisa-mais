import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userPreferencesService } from '@/services/userPreferencesService';
import { UserPreferences } from '@/types/preferences';
import { toast } from '@/lib/toast';
import { Clock, Zap, ShieldAlert, Target, Info, CheckCircle2, AlertTriangle, Settings, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { settingsPresetService, FullConfiguration, PresetId, UserSettingsDoc } from '@/services/settingsPresetService';

interface IntelligentPreferencesProps {
  preferences: UserPreferences;
  settings: UserSettingsDoc;
  onChangePreferences: (prefs: UserPreferences) => void;
}

export function IntelligentPreferences({ preferences, settings, onChangePreferences }: IntelligentPreferencesProps) {
  const { user } = useAuth();
  const [applying, setApplying] = useState(false);

  const updateSection = async <K extends keyof Omit<UserPreferences, 'user_id' | 'created_at'>>(section: K, data: Partial<UserPreferences[K]>) => {
    if (!user) return;
    
    const secData = preferences[section] as object;
    const updated = {
      ...preferences,
      [section]: {
        ...secData,
        ...data
      }
    };
    onChangePreferences(updated as UserPreferences);

    try {
      await userPreferencesService.updatePreferences(user.uid, section, data);
    } catch(e) {
      toast.error('Erro ao salvar preferência.');
    }
  };

  const currentConfig: FullConfiguration = { preferences, settings };
  const analysis = settingsPresetService.analyzeCustomConfiguration(currentConfig);
  const currentPresetId = settingsPresetService.getCurrentPreset(currentConfig);
  const presets = settingsPresetService.getAvailablePresets();

  const handleApplyPreset = async (presetId: PresetId) => {
    if (!user) return;
    setApplying(true);
    try {
      await settingsPresetService.applyPreset(user.uid, presetId);
      const newPrefs = await userPreferencesService.getPreferences(user.uid);
      onChangePreferences(newPrefs);
      toast.success('Preset aplicado com sucesso!');
    } catch(e) {
      toast.error('Erro ao aplicar preset.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="header space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Estratégia e Presets</h3>
        <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
          Defina o comportamento principal do Revisa+. Escolha um perfil validado de estudos ou personalize os detalhes mais profundos.
        </p>
      </div>

      {/* Analysis Block */}
      <div className="p-6 bg-surface-container rounded-[2rem] border border-outline/10 space-y-4 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl"></div>
         
         <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
               <h4 className="text-sm font-black uppercase tracking-tight mb-1">Diagnóstico do seu Perfil</h4>
               <p className="text-xs text-on-surface-variant">Classificamos sua configuração atual como: <strong className="text-primary">{analysis.type}</strong></p>
            </div>
         </div>

         {(analysis.strengths.length > 0 || analysis.warnings.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-outline/10 relative z-10">
               {analysis.strengths.length > 0 && (
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
                    </p>
                    {analysis.strengths.map((str, i) => (
                      <p key={i} className="text-[11px] text-on-surface-variant leading-relaxed font-medium bg-success/5 p-2 rounded-lg border border-success/10">{str}</p>
                    ))}
                 </div>
               )}
               {analysis.warnings.length > 0 && (
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-error flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Atenção
                    </p>
                    {analysis.warnings.map((warn, i) => (
                      <p key={i} className="text-[11px] text-on-surface-variant leading-relaxed font-medium bg-error/5 p-2 rounded-lg border border-error/10">{warn}</p>
                    ))}
                 </div>
               )}
            </div>
         )}
      </div>

      {/* Presets Grid */}
      <div className="space-y-4">
         <h4 className="text-xs font-black uppercase tracking-widest text-outline">Perfis Prontos (Presets)</h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {presets.map(preset => {
              const isActive = currentPresetId === preset.id;
              return (
                <div 
                  key={preset.id}
                  className={cn(
                    "p-6 rounded-[2rem] border transition-all text-left flex flex-col justify-between group relative overflow-hidden",
                    isActive 
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/5 ring-4 ring-primary/10" 
                      : "border-outline/20 bg-surface hover:border-primary/30 cursor-pointer hover:shadow-lg"
                  )}
                  onClick={() => !isActive && handleApplyPreset(preset.id)}
                >
                  <div className="space-y-2 relative z-10">
                     <div className="flex items-start justify-between">
                       <h5 className="text-sm font-black uppercase tracking-tight">{preset.name}</h5>
                       {isActive && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                     </div>
                     <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">{preset.description}</p>
                  </div>
                  
                  {!isActive && (
                    <button 
                      disabled={applying}
                      className="mt-6 text-[10px] font-black tracking-widest uppercase text-primary/80 group-hover:text-primary relative z-10 flex items-center gap-2"
                    >
                      Aplicar este perfil 
                      <span className="w-6 h-1 bg-primary/20 rounded-full overflow-hidden group-hover:w-8 transition-all">
                         <div className="h-full bg-primary w-0 group-hover:w-full transition-all duration-500"></div>
                      </span>
                    </button>
                  )}
                  {isActive && (
                     <div className="mt-6">
                        <span className="inline-flex px-3 py-1 bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest rounded-full">
                           Ativo
                        </span>
                     </div>
                  )}
                </div>
              );
            })}
         </div>
         {currentPresetId === 'personalizado' && (
           <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                 <Settings className="w-5 h-5 text-secondary" />
                 <div>
                    <h5 className="text-xs font-black uppercase tracking-tight text-secondary">Modo Personalizado Ativo</h5>
                    <p className="text-[10px] text-on-surface-variant">Sua configuração atual não encaixa perfeitamente em nenhum preset.</p>
                 </div>
              </div>
           </div>
         )}
      </div>

      <div className="h-[1px] bg-outline/10"></div>

      <div className="space-y-2">
         <h3 className="text-sm font-black uppercase tracking-tighter">Ajustes Manuais</h3>
         <p className="text-[11px] text-on-surface-variant font-medium pb-2">
           Ajustar os valores abaixo muda o sistema para o modo <strong className="text-on-surface">Personalizado</strong>. 
           Ao recriar os valores de um preset, o sistema o reconhecerá automaticamente.
         </p>
      </div>

      {/* HORÁRIOS E DURAÇÕES */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
               <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
               <h4 className="text-xs font-black text-primary uppercase tracking-widest">Duração Padrão</h4>
               <p className="text-[10px] text-on-surface-variant font-medium">Tempo sugerido para cada tipo de bloco gerado.</p>
            </div>
         </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline/10">
            <label className="text-[10px] font-black uppercase text-outline tracking-widest">Revisão (min)</label>
            <input 
              type="number" 
              value={preferences.durations.default_review_minutes}
              onChange={(e) => updateSection('durations', { default_review_minutes: Number(e.target.value) })}
              className="mt-2 w-full bg-surface-container border border-outline/20 p-3 rounded-xl text-sm font-black outline-none focus:border-primary transition-colors hover:border-primary/50"
            />
          </div>
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline/10">
            <label className="text-[10px] font-black uppercase text-outline tracking-widest">Sessão Livre (min)</label>
            <input 
              type="number" 
              value={preferences.durations.default_session_minutes}
              onChange={(e) => updateSection('durations', { default_session_minutes: Number(e.target.value) })}
              className="mt-2 w-full bg-surface-container border border-outline/20 p-3 rounded-xl text-sm font-black outline-none focus:border-primary transition-colors hover:border-primary/50"
            />
          </div>
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline/10">
            <label className="text-[10px] font-black uppercase text-outline tracking-widest">Reposição (min)</label>
            <input 
              type="number" 
              value={preferences.durations.default_recovery_minutes}
              onChange={(e) => updateSection('durations', { default_recovery_minutes: Number(e.target.value) })}
              className="mt-2 w-full bg-surface-container border border-outline/20 p-3 rounded-xl text-sm font-black outline-none focus:border-primary transition-colors hover:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* REVISÕES */}
      <div className="space-y-4">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
               <Zap className="w-4 h-4 text-secondary" />
            </div>
            <div>
               <h4 className="text-xs font-black text-secondary uppercase tracking-widest">Agendamento de Revisões</h4>
               <p className="text-[10px] text-on-surface-variant font-medium">Controle como as revisões ganham datas e horários.</p>
            </div>
         </div>
        
        <div className="p-6 bg-surface-container-low rounded-3xl border border-outline/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h5 className="text-sm font-black uppercase tracking-tight">Agendamento Automático</h5>
              <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                 Quando ativo, assim que você termina uma revisão ou simulado, o sistema já reserva um horário na sua agenda para o próximo contato com essa matéria baseado no seu algoritmo de espaçamento. Se desativado, elas ficarão num banco de sugestões para alocação manual.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input 
                type="checkbox" 
                checked={preferences.reviews.auto_schedule}
                onChange={(e) => updateSection('reviews', { auto_schedule: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* REPOSIÇÕES & FALTAS */}
      <div className="space-y-4">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
               <ShieldAlert className="w-4 h-4 text-error" />
            </div>
            <div>
               <h4 className="text-xs font-black text-error uppercase tracking-widest">Estratégia de Faltas</h4>
               <p className="text-[10px] text-on-surface-variant font-medium">Como o sistema reage quando você não cumpre uma sessão programada.</p>
            </div>
         </div>
         
         <div className="p-6 bg-surface-container-low rounded-3xl border border-outline/10 space-y-6">
           <div className="space-y-3">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
               {[
                 { id: 'proximo_disponivel', label: 'Próx. Livre', desc: 'Encaixa na 1ª brecha', expl: "Tenta espremer a revisão assim que houver tempo." },
                 { id: 'amanha', label: 'Amanhã', desc: 'Dia seguinte', expl: "Mantém a rotina estável deixando pro dia seguinte." },
                 { id: 'fim_de_semana', label: 'Fim de Semana', desc: 'Acumula p/ sáb/dom', expl: "Limpa a semana gerando pico de estudo de fim de semana." },
                 { id: 'manual', label: 'Perguntar', desc: 'Abre modal', expl: "Obriga você a escolher manualmente o destino." }
               ].map(opt => {
                 const isActive = preferences.recovery.default_strategy === opt.id;
                 return (
                 <button
                   key={opt.id}
                   onClick={() => updateSection('recovery', { default_strategy: opt.id as any })}
                   className={cn(
                     "p-3 rounded-2xl border text-left transition-all",
                     isActive
                       ? "border-error bg-error/5 ring-2 ring-error/20"
                       : "border-outline/20 bg-surface hover:border-outline/50"
                   )}
                 >
                   <p className={cn("text-xs font-black uppercase tracking-tight", isActive ? "text-error" : "text-on-surface")}>{opt.label}</p>
                   <p className="text-[10px] text-on-surface-variant font-medium mt-1">{opt.desc}</p>
                 </button>
               )})}
             </div>
             
             {/* Explication Context */}
             <div className="bg-surface p-3 rounded-xl border border-outline/5 flex items-start gap-2 mt-2">
                <Info className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                   <strong>Como o sistema decide:</strong> {
                     preferences.recovery.default_strategy === 'proximo_disponivel' ? "O motor de agendamento varrerá a partir de agora na sua grade buscando o menor slot que caiba o tempo da revisão." :
                     preferences.recovery.default_strategy === 'amanha' ? "O motor ignorará o dia de hoje e buscará um horário vago compatível apenas amanhã, protegendo o seu humor de hoje." :
                     preferences.recovery.default_strategy === 'fim_de_semana' ? "Todas as falhas serão lançadas no próximo Sábado ou Domingo livre. Cuidado com o acúmulo excessivo." :
                     "Nenhuma automação invisível será feita. Você verá o card de pendência até engajar com ele."
                   }
                </p>
             </div>
           </div>
           
           <div className="pt-4 border-t border-outline/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div>
               <h5 className="text-xs font-black uppercase tracking-tight">Compensar Faltas com Estudo Direto</h5>
               <p className="text-[10px] text-on-surface-variant">Ao ativar, você poderá "Pagar" uma revisão perdida fazendo uma sessão cronometrada tradicional da mesma matéria.</p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer shrink-0">
               <input 
                 type="checkbox" 
                 checked={preferences.recovery.allow_recovery_by_study}
                 onChange={(e) => updateSection('recovery', { allow_recovery_by_study: e.target.checked })}
                 className="sr-only peer" 
               />
               <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error shadow-inner"></div>
             </label>
           </div>
         </div>
      </div>

       {/* SESSÕES E NOTIFICAÇÕES */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-6 bg-surface-container-low rounded-3xl border border-outline/10 h-full flex flex-col justify-between space-y-4">
             <div>
                <h4 className="text-xs font-black text-tertiary uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" /> Sessões Livres
                </h4>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">Permitir que o sistema preencha o título como "Sessão de Estudo" automaticamente ao iniciar um timer livre, acelerando a inicialização.</p>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface uppercase tracking-tighter">Auto-Título</span>
                <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={preferences.sessions.auto_title}
                   onChange={(e) => updateSection('sessions', { auto_title: e.target.checked })}
                   className="sr-only peer" 
                 />
                 <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
               </label>
             </div>
         </div>
         <div className="p-6 bg-surface-container-low rounded-3xl border border-outline/10 h-full flex flex-col justify-between space-y-4">
             <div>
                <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4" /> Alertas do Sistema
                </h4>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">Nível mínimo de prioridade de alertas no ambiente de estudo para evitar interrupções.</p>
             </div>
             <div className="relative">
                 <select 
                   value={preferences.notifications.min_priority}
                   onChange={(e) => updateSection('notifications', { min_priority: e.target.value as any })}
                   className="w-full bg-surface-container border border-outline/20 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-primary transition-colors text-on-surface appearance-none"
                 >
                   <option value="baixa">Baixa (Tudo)</option>
                   <option value="media">Média (Avisos)</option>
                   <option value="alta">Alta (Importantes)</option>
                   <option value="critica">Crítica (Emergência)</option>
                 </select>
             </div>
         </div>
       </div>

    </div>
  );
}

