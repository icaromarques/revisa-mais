import { Header } from '@/components/Header';
import { User as UserIcon, Camera, Save, Mail, Briefcase, GraduationCap, Clock, Flame, BookOpen, CheckCircle2, TrendingUp, X, Target, Plus, UploadCloud, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useRef } from 'react';
import { userProfileService, UserProfileSchema, StudyGoal, GoalCategory, TrackingMode, PeriodType } from '@/services/userProfileService';
import { profileAnalyticsService, ProfileAnalytics } from '@/services/profileAnalyticsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { toast } from '@/lib/toast';

export function Perfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileSchema | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit States for Profile
  const [editNome, setEditNome] = useState('');
  const [editInstituicao, setEditInstituicao] = useState('');
  const [editCurso, setEditCurso] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Photo states
  const [fotoDraftUrl, setFotoDraftUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Goals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<{
    title: string;
    category: GoalCategory;
    tracking_mode: TrackingMode;
    target_value?: number;
    period_type: PeriodType;
  }>({
    title: '',
    category: 'horas_estudo',
    tracking_mode: 'automatic',
    target_value: 10,
    period_type: 'semanal',
  });

  useEffect(() => {
    if (!user) return;

    const unsub = userProfileService.subscribe(user.id, (data) => {
      setProfile(data);
      if (data) {
        setEditNome(data.nome || '');
        setEditInstituicao(data.instituicao || '');
        setEditCurso(data.curso || '');
        setEditBio(data.bio || '');
        setFotoDraftUrl(data.foto_url || '');
      }
      setLoading(false);
    });

    profileAnalyticsService.compute(user.id).then(stats => {
      setAnalytics(stats);
    });

    return () => unsub();
  }, [user]);

  const handleUpdateIdentity = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await userProfileService.updateProfile(user.id, {
        nome: editNome,
        instituicao: editInstituicao,
        curso: editCurso,
        bio: editBio,
        foto_url: fotoDraftUrl
      });
      setIsEditModalOpen(false);
      toast.success('Identidade acadêmica atualizada');
    } catch (e) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       toast.error('Por favor, selecione uma imagem válida.');
       return;
    }

    if (file.size > 2 * 1024 * 1024) {
       toast.error('Imagem muito grande. Máximo 2MB.');
       return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
       const img = new Image();
       img.onload = () => {
          // Resize
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
             setFotoDraftUrl(dataUrl);
          }
          setUploadingImage(false);
       };
       if (event.target?.result) {
          img.src = event.target.result as string;
       }
    };
    reader.readAsDataURL(file);
  };

  const getDifficultyPrediction = () => {
    if (!analytics) return "Ainda não há histórico suficiente para estimar a dificuldade desta meta.";
    if (newGoal.tracking_mode === 'manual' || !newGoal.target_value) return "Acompanhamento manual. Depende da sua dedicação constante.";

    const { category, target_value, period_type } = newGoal;
    
    // Normalize target to Weekly equivalent
    let weeklyTarget = target_value;
    if (period_type === 'quinzenal') weeklyTarget /= 2;
    if (period_type === 'mensal') weeklyTarget /= 4;

    const currentWeeklyHours = (analytics.totalMinutos || 0) / 60; // Assuming analytics returns lifetime or last 30 days... let's just make a simple mock-level estimation using existing data
    
    if (category === 'horas_estudo') {
       if (weeklyTarget > 40) return "Desafiadora. Mais de 40h/semana exige dedicação quase exclusiva.";
       if (weeklyTarget > currentWeeklyHours * 1.5 && currentWeeklyHours > 0) return "Intensa. Muito acima da sua média atual.";
       return "Equilibrada e factível com bom planejamento.";
    }

    if (category === 'revisoes') {
       if (weeklyTarget > 50) return "Desafiadora. Exigirá várias sessões curtas todo dia.";
       return "Equilibrada. Foque na técnica Pomodoro.";
    }

    if (category === 'questoes') {
       if (weeklyTarget > 300) return "Intensa. Prepare-se para dias de simulados.";
       return "Equilibrada. Fazer questões diárias ajuda na retenção.";
    }

    if (category === 'constancia') {
       if (weeklyTarget > 5) return "Desafiadora. Cuidado com o esgotamento estudando todos os dias.";
       return "Equilibrada. Manter o ritmo é o segredo.";
    }

    return "Acompanhe seu avanço para validar o ritmo.";
  };

  const handleSaveGoal = async () => {
     if (!user || !newGoal.title.trim()) {
        toast.error('Preencha o nome da meta.');
        return;
     }
     
     if (newGoal.tracking_mode === 'automatic' && newGoal.category !== 'personalizada' && (!newGoal.target_value || newGoal.target_value <= 0)) {
        toast.error('Por favor, defina um alvo válido para sua meta automática.');
        return;
     }

     try {
       await userProfileService.addGoal(user.id, {
          title: newGoal.title.trim(),
          category: newGoal.category,
          tracking_mode: newGoal.tracking_mode,
          target_value: newGoal.target_value,
          period_type: newGoal.period_type,
          current_value: 0
       });
       setNewGoal({
          title: '',
          category: 'horas_estudo',
          tracking_mode: 'automatic',
          target_value: 10,
          period_type: 'semanal',
       });
       setIsGoalModalOpen(false);
       toast.success('Meta adicionada');
     } catch(e) {
       toast.error('Erro ao salvar meta');
     }
  };

  const handleDeleteGoal = async (id: string) => {
     if (!user) return;
     try {
       await userProfileService.deleteGoal(user.id, id);
       toast.success('Meta removida');
     } catch(e) {
       toast.error('Erro ao remover');
     }
  };

  const handleToggleGoalStatus = async (id: string, currentStatus: string) => {
     if (!user) return;
     try {
       const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
       await userProfileService.updateGoal(user.id, id, { status: newStatus });
       toast.success(newStatus === 'completed' ? 'Parabéns! Meta concluída.' : 'Meta reativada.');
     } catch(e) {
       toast.error('Erro ao atualizar meta');
     }
  };

  const avatarUrl = profile?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Felix'}&backgroundColor=c0aede`;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <Header title="Perfil do Estudante" />

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Banner / Card Principal */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/5 rounded-[40px] blur-3xl opacity-50"></div>
          <div className="relative bg-elevated border border-outline/20 rounded-[32px] md:rounded-[40px] p-6 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-10 overflow-hidden">
             
             <div className="relative shrink-0 group/avatar cursor-pointer" onClick={() => { setFotoDraftUrl(avatarUrl); setIsEditModalOpen(true);}}>
               <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-surface-container-highest shadow-2xl transition-transform duration-500 ring-4 ring-primary/10 relative">
                 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                   <Camera className="w-8 h-8 mb-2" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
                 </div>
               </div>
             </div>

             <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-1">
                  <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface">{profile?.nome || 'Estudante'}</h2>
                    <span className="px-4 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/20 shadow-sm">
                      Membro {profile?.plano || 'Free'}
                    </span>
                  </div>
                  <p className="text-on-surface-variant font-bold flex items-center justify-center md:justify-start gap-2 opacity-80 pt-1">
                    <Mail className="w-4 h-4 text-primary" /> {user?.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                   <div className="flex items-center gap-2">
                     <GraduationCap className="w-4 h-4 text-outline" />
                     <span className="text-[11px] font-black uppercase tracking-widest text-on-surface">
                       {profile?.curso || 'Sem curso informado'}
                     </span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Briefcase className="w-4 h-4 text-outline" />
                     <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                       {profile?.instituicao || 'Sem instituição informada'}
                     </span>
                   </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
                   <button 
                    onClick={() => {
                        setEditNome(profile?.nome || '');
                        setEditInstituicao(profile?.instituicao || '');
                        setEditCurso(profile?.curso || '');
                        setEditBio(profile?.bio || '');
                        setFotoDraftUrl(profile?.foto_url || '');
                        setIsEditModalOpen(true);
                    }}
                    className="px-8 py-3 bg-surface-container text-on-surface text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-surface-container-high active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-outline/10 flex items-center gap-2"
                   >
                     <Edit2 className="w-4 h-4" /> Editar Identidade
                   </button>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           {/* Coluna Lateral: Resumo */}
           <div className="md:col-span-4 space-y-8">
              {/* Desempenho Automático */}
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline flex items-center gap-2 mb-2">
                   <TrendingUp className="w-4 h-4" /> Desempenho
                 </h3>

                 {analytics ? (
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                               <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none mb-1">Horas Totais</p>
                               <p className="text-xl font-black">{(analytics.totalMinutos / 60).toFixed(1)}h</p>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center">
                               <BookOpen className="w-5 h-5 text-tertiary" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none mb-1">Sessões</p>
                               <p className="text-xl font-black">{analytics.totalSessoes}</p>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                               <CheckCircle2 className="w-5 h-5 text-success" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none mb-1">Revisões</p>
                               <p className="text-xl font-black">{analytics.revisoesConcluidas}</p>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                               <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none mb-1">Streak</p>
                               <p className="text-xl font-black">{analytics.streakDias} {analytics.streakDias === 1 ? 'dia' : 'dias'}</p>
                            </div>
                         </div>
                      </div>
                      
                      {analytics.materiaMaisEstudada && (
                          <div className="pt-4 border-t border-outline/10">
                              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Destaque</p>
                              <p className="text-sm font-bold text-primary truncate">{analytics.materiaMaisEstudada}</p>
                          </div>
                      )}
                   </div>
                 ) : (
                    <div className="py-4 text-center text-sm font-medium text-on-surface-variant opacity-60">
                        Calculando métricas...
                    </div>
                 )}
              </div>

              {/* Análise Real da Rotina */}
              <div className="p-8 bg-surface-container-low border border-outline/10 rounded-[2.5rem] space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5" /> Análise da Rotina
                 </h4>
                 
                 {analytics && analytics.rotinaInsight ? (
                     <div className="p-5 bg-surface-container rounded-2xl border border-outline/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <p className="text-sm font-medium text-on-surface leading-relaxed">
                           {analytics.rotinaInsight}
                        </p>
                     </div>
                 ) : (
                     <div className="p-5 border border-dashed border-outline/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                        <Clock className="w-6 h-6 text-outline/50" />
                        <p className="text-xs font-medium text-on-surface-variant">Ainda não há dados suficientes para gerar uma análise confiável de sua rotina. Realize mais sessões!</p>
                     </div>
                 )}
              </div>
           </div>

           {/* Coluna Principal: Conteúdo */}
           <div className="md:col-span-8 space-y-8">
              <div className="glass-panel p-10 rounded-[2.5rem] space-y-10">
                 <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary">Sobre sua Jornada</h3>
                    {profile?.bio ? (
                        <p className="text-sm flex-1 leading-relaxed text-on-surface-variant font-medium whitespace-pre-wrap">
                           {profile.bio}
                        </p>
                    ) : (
                        <p className="text-sm italic text-on-surface-variant opacity-50">
                            (Nenhuma biografia informada)
                        </p>
                    )}
                 </section>

                 <div className="h-[1px] bg-outline/20"></div>

                 {/* Metas Estruturadas */}
                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                            <Target className="w-4 h-4" /> Metas de Estudo
                        </h3>
                        <button 
                         onClick={() => setIsGoalModalOpen(true)}
                         className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors bg-surface border border-outline/10 px-3 py-1.5 rounded-full"
                        >
                           <Plus className="w-3 h-3" /> Adicionar Meta
                        </button>
                    </div>

                    {!profile?.goals || profile.goals.length === 0 ? (
                        <div className="p-8 border border-dashed border-outline/20 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-center">
                            <Target className="w-8 h-8 text-outline/30" />
                            <p className="text-sm font-bold text-on-surface-variant">Você ainda não definiu metas de estudo.</p>
                            <p className="text-xs text-on-surface-variant opacity-70">Crie uma meta para acompanhar seu progresso com mais clareza e manter o foco na evolução real.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {profile.goals.map(meta => {
                               // Calc progress visually based on analytics/data
                               let progressVal = meta.current_value || 0;
                               let progressText = '';
                               
                               if (meta.tracking_mode === 'automatic') {
                                 if (meta.category === 'horas_estudo') {
                                     progressVal = analytics ? Math.round((analytics.totalMinutos/60)) : 0;
                                 } else if (meta.category === 'revisoes') {
                                     progressVal = analytics ? analytics.revisoesConcluidas : 0;
                                 } else if (meta.category === 'constancia') {
                                     progressVal = analytics ? analytics.streakDias : 0;
                                 } else if (meta.category === 'questoes') {
                                     progressVal = analytics ? (analytics.questoesResolvidas || 0) : 0;
                                 }
                               }

                               const percent = meta.target_value ? Math.min(100, Math.round((progressVal / meta.target_value) * 100)) : 0;
                               progressText = meta.target_value ? `${progressVal} / ${meta.target_value}` : `${progressVal} concluído`;

                               return (
                                  <div key={meta.id} className={`relative p-5 rounded-2xl border group flex flex-col justify-between hover:border-primary/30 transition-all shadow-sm ${meta.status === 'completed' ? 'bg-success/5 border-success/20 opacity-80' : 'bg-surface-container-low border-outline/10'}`}>
                                      <button 
                                        onClick={() => handleDeleteGoal(meta.id)}
                                        className="absolute top-4 right-4 p-1.5 bg-error/10 text-error rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-white"
                                        title="Remover meta"
                                      >
                                          <X className="w-3 h-3" />
                                      </button>
                                      
                                      <div className="pr-8 space-y-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="w-2 h-2 rounded-full bg-primary"></span>
                                              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                                                  {meta.tracking_mode === 'automatic' ? 'Auto' : 'Manual'} • {meta.period_type}
                                              </span>
                                          </div>
                                          <p className="text-sm font-bold text-on-surface leading-snug">{meta.title}</p>
                                          <p className="text-[10px] uppercase font-bold tracking-widest text-primary/70">{meta.category.replace('_', ' ')}</p>
                                      </div>

                                      {meta.tracking_mode === 'automatic' || meta.target_value ? (
                                          <div className="mt-5 space-y-2">
                                              <div className="flex justify-between items-end">
                                                  <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">{progressText}</span>
                                                  <span className="text-xs font-black text-primary">{percent}%</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                                                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="mt-5 pt-3 border-t border-outline/10 flex items-center justify-between">
                                            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Acompanhamento</span>
                                            <button 
                                              onClick={() => handleToggleGoalStatus(meta.id, meta.status)}
                                              className={`text-xs font-black px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${meta.status === 'completed' ? 'bg-success/10 border-success/20 text-success' : 'bg-surface-container border-outline/10 hover:border-primary/50 text-on-surface-variant hover:text-on-surface'}`}
                                            >
                                              {meta.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                                              {meta.status === 'completed' ? 'Concluída' : 'Marcar como concluída'}
                                            </button>
                                          </div>
                                      )}
                                  </div>
                               );
                           })}
                        </div>
                    )}
                 </section>

              </div>
           </div>
        </div>
      </div>

      {/* Modal Editar Perfil / Identidade */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-xl bg-surface border border-outline/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-outline/10">
              <h3 className="font-black text-lg uppercase tracking-tighter">Identidade Acadêmica</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-surface-container rounded-xl transition-colors">
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                
                {/* Upload Section */}
                <div className="flex flex-col items-center justify-center gap-4 py-4 border border-dashed border-outline/20 rounded-3xl bg-surface-container-lowest">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface shadow-lg relative bg-surface-container flex items-center justify-center">
                        {fotoDraftUrl ? (
                           <img src={fotoDraftUrl} alt="Draft" className="w-full h-full object-cover" />
                        ) : (
                           <UserIcon className="w-8 h-8 text-outline/30" />
                        )}
                        {uploadingImage && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={fileInputRef}
                           onChange={handleImageSelect}
                        />
                        <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="text-xs font-bold bg-primary text-on-primary px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
                        >
                           <UploadCloud className="w-4 h-4" /> Atualizar Foto
                        </button>
                        <p className="text-[10px] text-on-surface-variant mt-2">Recomendado: 1:1, Max 2MB</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="w-full bg-surface-container border border-outline/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors font-bold"
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Instituição</label>
                          <input 
                            type="text" 
                            value={editInstituicao}
                            onChange={(e) => setEditInstituicao(e.target.value)}
                            className="w-full bg-surface-container border border-outline/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors font-bold"
                            placeholder="Sigla ou nome curto"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Curso</label>
                          <input 
                            type="text" 
                            value={editCurso}
                            onChange={(e) => setEditCurso(e.target.value)}
                            className="w-full bg-surface-container border border-outline/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors font-bold"
                            placeholder="Nome do curso"
                          />
                        </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Biografia (Apresentação)</label>
                      <textarea 
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={3}
                        className="w-full bg-surface-container border border-outline/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors font-medium resize-none"
                        placeholder="Um breve texto sobre o seu momento atual de foco nos estudos..."
                      />
                    </div>
                </div>

            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline/10 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-3 text-xs font-bold rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateIdentity}
                disabled={saving || uploadingImage}
                className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                   <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                ) : <Save className="w-4 h-4" />}
                Salvar Identidade
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Nova Meta */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={() => setIsGoalModalOpen(false)}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-surface border border-outline/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6"
          >
             <div>
                <h4 className="font-black text-xl mb-1 mt-2">Criar nova Meta</h4>
                <p className="text-xs text-on-surface-variant font-medium">Defina um alvo claro para acompanhar seu progresso.</p>
             </div>
             
             <div className="space-y-6">
                 <div className="space-y-2">
                     <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Nome da Meta</label>
                     </div>
                     <input 
                         type="text" 
                         value={newGoal.title}
                         onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                         className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold placeholder:text-outline"
                         placeholder="Ex: Estudar 50 horas neste mês"
                         autoFocus
                     />
                     <div className="flex flex-wrap gap-2 pt-1">
                         <button onClick={() => setNewGoal({ ...newGoal, title: 'Estudar 20h este mês', category: 'horas_estudo', tracking_mode: 'automatic', target_value: 20, period_type: 'mensal' })} className="px-2 py-1 bg-surface-container-low border border-outline/10 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors">20h no mês</button>
                         <button onClick={() => setNewGoal({ ...newGoal, title: '10 Revisões Semanais', category: 'revisoes', tracking_mode: 'automatic', target_value: 10, period_type: 'semanal' })} className="px-2 py-1 bg-surface-container-low border border-outline/10 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors">10 Revisões</button>
                         <button onClick={() => setNewGoal({ ...newGoal, title: '100 Questões', category: 'questoes', tracking_mode: 'automatic', target_value: 100, period_type: 'semanal' })} className="px-2 py-1 bg-surface-container-low border border-outline/10 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors">100 Questões</button>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Tipo de Meta</label>
                         <select
                             value={newGoal.category}
                             onChange={e => {
                               const cat = e.target.value as GoalCategory;
                               const mode = cat === 'personalizada' ? 'manual' : 'automatic';
                               setNewGoal({ ...newGoal, category: cat, tracking_mode: mode });
                             }}
                             className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
                         >
                             <option value="horas_estudo">Horas de Estudo</option>
                             <option value="revisoes">Revisões Concluídas</option>
                             <option value="questoes">Questões Resolvidas</option>
                             <option value="constancia">Constância</option>
                             <option value="materia">Visão por Matéria</option>
                             <option value="personalizada">Meta Personalizada</option>
                         </select>
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Período</label>
                         <select
                             value={newGoal.period_type}
                             onChange={e => setNewGoal({ ...newGoal, period_type: e.target.value as PeriodType })}
                             className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold text-on-surface appearance-none"
                         >
                             <option value="semanal">Semanal</option>
                             <option value="quinzenal">Quinzenal</option>
                             <option value="mensal">Mensal</option>
                             <option value="personalizado">Personalizado</option>
                         </select>
                     </div>
                 </div>

                 {newGoal.tracking_mode === 'automatic' && (
                     <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Meta Desejada (Alvo numérico)</label>
                            <input 
                                type="number" 
                                min="1"
                                value={newGoal.target_value ?? ''}
                                onChange={e => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 0 })}
                                className="w-full bg-surface border border-primary/20 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold text-on-surface"
                                placeholder={`Ex: ${newGoal.category === 'horas_estudo' ? '50' : newGoal.category === 'revisoes' ? '20' : '7'}`}
                            />
                        </div>
                        <p className="text-[10px] font-medium text-primary/80 flex items-center gap-1.5">
                           <Target className="w-3.5 h-3.5" /> O progresso desta meta será calculado automaticamente usando seus dados reais do Revisa+.
                        </p>
                     </div>
                 )}

                 {newGoal.tracking_mode === 'manual' && (
                     <div className="p-4 bg-surface-container border border-outline/10 rounded-xl space-y-2">
                         <p className="text-xs font-bold text-on-surface flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-secondary" /> Acompanhamento Manual
                         </p>
                         <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">
                            O sistema não irá rastrear dados automaticamente. Você poderá marcar a evolução dessa meta como Concluída ou em andamento direto no card.
                         </p>
                     </div>
                 )}
                 
                 {/* Smart Summary / Suggestion box */}
                 <div className="space-y-2">
                     <div className="p-4 bg-surface-container-highest rounded-xl text-center">
                        <p className="text-[11px] font-medium text-on-surface-variant">
                           {newGoal.title.trim() === '' ? 'Resumo da Meta aparecerá aqui.' : (
                              <>
                                Você deseja <strong>{newGoal.title}</strong>, num ciclo <strong>{newGoal.period_type}</strong>
                                {newGoal.tracking_mode === 'automatic' && newGoal.target_value ? `, com alvo de ${newGoal.target_value} ${newGoal.category.replace('_', ' ')}.` : '.'}
                              </>
                           )}
                        </p>
                     </div>
                     {newGoal.tracking_mode === 'automatic' && newGoal.target_value && newGoal.target_value > 0 && (
                         <div className="p-3 bg-surface-container-low border border-outline/10 text-center rounded-xl flex items-center justify-center gap-2">
                             <TrendingUp className="w-3 h-3 text-secondary" />
                             <p className="text-[10px] font-black tracking-wide text-secondary uppercase">
                                 Diagnóstico: <span className="font-medium normal-case text-on-surface-variant">{getDifficultyPrediction()}</span>
                             </p>
                         </div>
                     )}
                 </div>
             </div>

             <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => setIsGoalModalOpen(false)} className="px-6 py-3 font-bold text-xs text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancelar</button>
                  <button onClick={handleSaveGoal} disabled={!newGoal.title.trim()} className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shadow-xl shadow-primary/20 transition-all flex items-center gap-2">
                     <Target className="w-4 h-4" /> Criar Meta
                  </button>
             </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
