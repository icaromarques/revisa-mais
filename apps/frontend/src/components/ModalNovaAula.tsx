import React, { useState, useEffect } from 'react';
import { X, BookOpen, Clock, CalendarIcon, FileText, CheckCircle, Play, BrainCircuit, Bookmark, Plus, Trash2, Zap, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/hooks/usePreferences';
import { toast } from '@/lib/toast';
import { OcorrenciaGrade } from '@/types/availability';
import { DateInputMasked } from '@/components/ui/DateInputMasked';
import { TimeInputMasked } from '@/components/ui/TimeInputMasked';
import { materialService } from '@/services/materialService';
import { apiClient } from '@/lib/api';

export function ModalNovaAula({ 
  isOpen, 
  onClose, 
  aulaAtual, 
  materiaId: propMateriaId, 
  topicos, 
  materiaisIniciais = [], 
  defaultTopicoId = '',
  initialData
}: ModalNovaAulaProps) {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');

  // If initialData has a materiaId, use it, otherwise use propMateriaId
  const effectiveMateriaId = initialData?.materia_id || propMateriaId;

  const initialForm = {
    titulo: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '',
    professor: '',
    local_ou_link: '',
    status: 'assistida',
    topico_id: '',
    tipo_aula: 'normal',
    reposicao_ocorrencia_id: '',
    conteudo: '',
    resumo_rapido: '',
    anotacoes_livres: '',
    duvidas: '',
    pontos_importantes: '',
    observacoes_professor: '',
    proximos_passos_o_que_estudar: '',
    proximos_passos_paginas: '',
    proximos_passos_exercicios: '',
    proximos_passos_data: '',
    prioridade_estudo: 'media',
    add_to_planner: false,
    auto_revisao: false,
    auto_sessao: false,
    auto_resumo_ia: false,
    auto_flashcards_ia: false,
    auto_questoes_ia: false,
    auto_calendario: false,
    avaliacao_ids: [] as string[]
  };

  const [form, setForm] = useState(initialForm);
  const [userEditedProfessor, setUserEditedProfessor] = useState(false);
  const [novoTopico, setNovoTopico] = useState({
     nome: '',
     descricao: '',
     status: 'estudar',
     prioridade: 'media',
     peso_importancia: 1,
     dificuldade: 'media'
  });
  const [materiais, setMateriais] = useState<any[]>([]);
  const [materiaisExcluidos, setMateriaisExcluidos] = useState<string[]>([]);
  const [faltasPendentes, setFaltasPendentes] = useState<any[]>([]);
  const [horarioError, setHorarioError] = useState('');

  const validateAndFormatHorario = (val: string): { valid: boolean, value: string, error?: string } => {
    let clean = val.trim();
    if (!clean) return { valid: true, value: '' };
    
    // replace non-digits (like 'h' or ' ') with ':'
    clean = clean.replace(/[^\d:]/g, ':').replace(/:+/g, ':');
    // remove trailing or leading colons
    clean = clean.replace(/^:/, '').replace(/:$/, '');

    // if it's just numbers
    if (/^\d{1,4}$/.test(clean)) {
      if (clean.length === 1 || clean.length === 2) {
        clean = `${clean.padStart(2, '0')}:00`;
      } else if (clean.length === 3) {
        clean = `0${clean[0]}:${clean.substring(1)}`;
      } else if (clean.length === 4) {
        clean = `${clean.substring(0,2)}:${clean.substring(2)}`;
      }
    }

    const match = clean.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) {
      return { valid: false, value: val, error: 'Use o formato HH:MM' };
    }

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return { valid: false, value: val, error: 'Horário inválido (00:00 - 23:59)' };
    }

    return { valid: true, value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` };
  };

  const handleHorarioBlur = () => {
    const res = validateAndFormatHorario(form.horario);
    if (res.valid) {
      setForm({...form, horario: res.value});
      setHorarioError('');
    } else {
      setHorarioError(res.error || 'Formato inválido');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHorarioError('');
      if (aulaAtual) {
        setForm({ 
          ...initialForm, 
          ...aulaAtual,
          horario: aulaAtual.horario || '',
           data: aulaAtual.data || format(new Date(), 'yyyy-MM-dd'),
           add_to_planner: !!aulaAtual.add_to_planner,
           auto_revisao: !!aulaAtual.auto_revisao,
           auto_sessao: !!aulaAtual.auto_sessao,
           auto_resumo_ia: !!aulaAtual.auto_resumo_ia,
           auto_flashcards_ia: !!aulaAtual.auto_flashcards_ia,
           auto_questoes_ia: !!aulaAtual.auto_questoes_ia,
           auto_calendario: !!aulaAtual.auto_calendario
        });
        setUserEditedProfessor(true); // Don't overwrite if editing
        setMateriais(materiaisIniciais.map(m => ({...m, observacao: m.descricao || ''})));
      } else if (initialData) {
        setUserEditedProfessor(false);
        setForm({
          ...initialForm,
          ...initialData,
          topico_id: initialData.topico_id || defaultTopicoId || (topicos?.length === 1 ? topicos[0].id : '')
        });
        
        if (effectiveMateriaId) {
          apiClient.get(`/materias/${effectiveMateriaId}`).then(({ data }) => {
               if (data && data.professor && !userEditedProfessor && !initialData.professor) {
                  setForm(f => ({...f, professor: data.professor}));
               }
          }).catch(console.error);
        }
        setMateriais([]);
      } else {
        setUserEditedProfessor(false);
        setForm({
          ...initialForm,
          topico_id: defaultTopicoId || (topicos?.length === 1 ? topicos[0].id : ''),
          auto_revisao: preferences?.reviews?.auto_schedule ?? true,
          // We can also initialize auto_sessao/add_to_planner based on what exists, but we'll leave as is if not in preferences
        });
        
        // Auto-fill professor from materia if new class and not manually edited yet
        if (effectiveMateriaId) {
          apiClient.get(`/materias/${effectiveMateriaId}`).then(({ data }) => {
              if (data && data.professor && !userEditedProfessor) {
                setForm(f => ({...f, professor: data.professor}));
              }
          }).catch(console.error);
        }
        
        setMateriais([]);
      }
      setMateriaisExcluidos([]);
      setActiveTab('basico');

      if (effectiveMateriaId && user) {
        apiClient.get('/ocorrencias', { params: { materiaId: effectiveMateriaId, status: 'falta' } })
          .then(({ data }) => {
             const pendentes = data.filter((d: any) => d.status_reposicao !== 'recuperado');
             setFaltasPendentes(pendentes);
          })
          .catch(console.error);
      }

    }
  }, [isOpen, aulaAtual, materiaisIniciais, effectiveMateriaId, defaultTopicoId, initialData, user, preferences?.reviews?.auto_schedule]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Optional: add confirmation if dirty
    onClose();
  };

  const handleSave = async (e?: React.FormEvent, criarOutra = false) => {
    if (e) e.preventDefault();
    if (!user || !effectiveMateriaId || !form.titulo.trim() || !form.data) return;

    const horarioRes = validateAndFormatHorario(form.horario);
    if (!horarioRes.valid) {
      setActiveTab('basico');
      setHorarioError(horarioRes.error || 'Horário inválido.');
      toast.error('Corrija o horário da aula para poder salvar.');
      return;
    }
    const finalHorario = horarioRes.value;

    setLoading(true);
    try {
      if (form.topico_id === 'new') {
         toast.error("Por favor, clique em 'Salvar Tópico Agora' antes de salvar a aula.");
         setLoading(false);
         return;
      }
      let resolvedTopicoId = form.topico_id;

      const aulaData: any = {
        titulo: form.titulo,
        data: form.data,
        horario: finalHorario,
        professor: form.professor,
        local_ou_link: form.local_ou_link,
        status: form.status,
        topico_id: resolvedTopicoId,
        conteudo: form.conteudo,
        resumo_rapido: form.resumo_rapido,
        anotacoes_livres: form.anotacoes_livres,
        duvidas: form.duvidas,
        pontos_importantes: form.pontos_importantes,
        observacoes_professor: form.observacoes_professor,
        proximos_passos_o_que_estudar: form.proximos_passos_o_que_estudar,
        proximos_passos_paginas: form.proximos_passos_paginas,
        proximos_passos_exercicios: form.proximos_passos_exercicios,
        proximos_passos_data: form.proximos_passos_data,
        prioridade_estudo: form.prioridade_estudo,
        add_to_planner: form.add_to_planner,
        auto_revisao: form.auto_revisao,
        auto_sessao: form.auto_sessao,
        auto_resumo_ia: form.auto_resumo_ia,
        auto_flashcards_ia: form.auto_flashcards_ia,
        auto_questoes_ia: form.auto_questoes_ia,
        auto_calendario: form.auto_calendario,
        tipo_aula: form.tipo_aula,
        reposicao_ocorrencia_id: form.tipo_aula === 'reposicao' ? form.reposicao_ocorrencia_id : null
      };

      if (initialData?.ocorrencia_id) {
        aulaData.ocorrencia_id = initialData.ocorrencia_id;
      }

      let aulaRefId = '';

      if (aulaAtual?.id) {
         try {
           await apiClient.put(`/materias/${effectiveMateriaId}/aulas/${aulaAtual.id}`, aulaData);
           aulaRefId = aulaAtual.id;
         } catch(err) { console.error(err); }
      } else {
         try {
           const { data } = await apiClient.post(`/materias/${effectiveMateriaId}/aulas`, aulaData);
           aulaRefId = data.id;

           // Se for aula de reposição, temos que atualizar a falta. O Backend pode/deve fazer isso.
           // Se backend não faz, faremos via API.
           if (initialData?.ocorrencia_id) {
             const { gradeOccurrenceService } = await import('@/services/gradeOccurrenceService');
             await gradeOccurrenceService.confirmOccurrence(initialData.ocorrencia_id, 'assistida', aulaRefId);
           }
         } catch(err) { console.error(err); }
      }
      
      // Resolve absence if makeup class
      if (form.tipo_aula === 'reposicao' && form.reposicao_ocorrencia_id && aulaRefId) {
         try {
            await apiClient.patch(`/ocorrencias/${form.reposicao_ocorrencia_id}`, {
               status_reposicao: 'recuperado',
               reposicao_aula_id: aulaRefId,
               reposicao_observacao: `Recuperado pela aula: ${form.titulo}`
            });
         } catch(e) {
            console.error("Failed to update occurrence with makeup class:", e);
         }
      }

      // Validar Materiais e ignorar vazios
      const validMateriais = [];
      for (const mat of materiais) {
        const hasUrl = !!mat.url?.trim();
        const hasLegacyDocs = !!mat.arquivo_url || !!mat.drive_file_id;
        const hasConteudo = !!mat.observacao?.trim();
        const hasTitulo = !!mat.titulo?.trim();

        // Se estiver totalmente vazio, ignora
        if (!hasTitulo && !hasUrl && !hasConteudo && !hasLegacyDocs) {
           continue;
        }

        // Se preencheu algo, valida
        if (!hasTitulo) {
           setHorarioError('Por favor, preencha o título dos materiais ou remova as linhas em branco.');
           return;
        }

        const isLinkRequired = ['link', 'video'].includes(mat.tipo);
        if (isLinkRequired && !hasUrl && !hasLegacyDocs) {
           setHorarioError(`O material "${mat.titulo}" exige uma URL. Por favor, forneça o link.`);
           return;
        }
        
        const isFileRequired = ['pdf', 'slide', 'imagem', 'arquivo', 'outro', 'audio', 'documento', 'livro'].includes(mat.tipo);
        if (isFileRequired && !hasUrl && !hasLegacyDocs) {
           setHorarioError(`O material "${mat.titulo}" exige um link do Google Drive ou URL válida.`);
           return;
        }

        validMateriais.push(mat);
      }

      // Salvar Materiais
      if (aulaRefId) {
        // Exclusões com materialService
        for (const matId of materiaisExcluidos) {
          try {
            await materialService.deleteMaterial(matId, user.id);
          } catch (error) {
            console.error('Failed to delete material via service', error);
          }
        }

        const materiaisAProcessar = [];
        
        for (const mat of validMateriais) {
            let processedMat = { ...mat };
            
            if (mat.url?.trim()) {
                const meta = await import('@/lib/materialLinks').then(m => m.prepareMaterialLinkMetadata(mat.url.trim()));
                if (meta) {
                    processedMat.url = meta.url;
                    processedMat.provider = meta.provider;
                    processedMat.source_kind = meta.source_kind;
                    processedMat.drive_file_id = meta.drive_file_id;
                    processedMat.drive_preview_url = meta.drive_preview_url;
                    processedMat.drive_open_url = meta.drive_open_url;
                }
            } else if (mat.observacao?.trim() && ['resumo', 'anotacao'].includes(mat.tipo)) {
                processedMat.source_kind = 'text';
                processedMat.provider = 'text';
            }
            materiaisAProcessar.push(processedMat);
        }

        // Criar os materiais na API em paralelo
        await Promise.all(materiaisAProcessar.map(async (mat) => {
          if (!mat.id) { // Create
            await apiClient.post(`/materiais`, {
              ...mat, 
              materia_id: effectiveMateriaId,
              aula_id: aulaRefId,
              topico_id: resolvedTopicoId,
              titulo: mat.titulo,
              tipo: mat.tipo,
              url: mat.url || null,
              descricao: mat.observacao || null,
              origem: 'aula',
              source_kind: mat.source_kind || (mat.url ? 'url' : 'text')
            });
          } else { // Update
            const updates: any = {
              topico_id: resolvedTopicoId, 
              titulo: mat.titulo,
              tipo: mat.tipo,
              url: mat.url,
              descricao: mat.observacao || '',
            };
            if (mat.drive_file_id !== undefined) updates.drive_file_id = mat.drive_file_id;
            if (mat.drive_preview_url !== undefined) updates.drive_preview_url = mat.drive_preview_url;
            if (mat.drive_open_url !== undefined) updates.drive_open_url = mat.drive_open_url;
            if (mat.provider !== undefined) updates.provider = mat.provider;
            if (mat.source_kind !== undefined) updates.source_kind = mat.source_kind;
            
            await apiClient.put(`/materiais/${mat.id}`, updates);
          }
        }));

        // Como removemos o auto-actions do Frontend pois o Backend cuidará disso ao criar/editar aula, 
        // ou faremos chamadas a API aqui (preferencialmente, isso estaria na própria API de salvar aula,
        // mas vamos manter aqui fazendo requisições separadas caso a API de aula ainda não trate isso)
        
        // Porém, se o backend não foi implementado com essas lógicas no POST/PUT da aula,
        // nós teríamos que chamar as rotas apropriadas (ex: /revisoes, /eventos, /resumos, etc)
        // O ideal é que na rota /aulas essas flags disparem jobs/criações automáticas no backend.
        // Assumindo que o back-end cuidará da criação caso envie as flags, podemos remover as chamadas diretas ao firebase aqui.
      }

      setLoading(false);
      
      if (criarOutra) {
        setForm({ ...initialForm, topico_id: form.topico_id, data: form.data }); // Keep some context
        setMateriais([]);
        setActiveTab('basico');
        toast.success('Aula salva com sucesso! Crie a próxima.');
      } else {
        toast.success('Aula salva com sucesso!');
        onClose();
      }

    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error('Erro ao salvar aula. Tente novamente.');
    }
  };

  const addMaterial = () => {
    setMateriais([...materiais, { titulo: '', tipo: 'link', url: '', observacao: '' }]);
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const newMats = [...materiais];
    newMats[index] = { ...newMats[index], [field]: value };
    setMateriais(newMats);
  };

  const removeMaterial = (index: number) => {
    const mat = materiais[index];
    if (mat.id) {
      setMateriaisExcluidos([...materiaisExcluidos, mat.id]);
    }
    setMateriais(materiais.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto pt-20">
      <div className="w-full max-w-4xl glass-panel rounded-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {form.tipo_aula === 'reposicao' && (
          <div className="shrink-0 bg-error/10 text-error px-6 py-3 border-b border-error/20 flex flex-col md:flex-row md:items-center gap-2">
             <AlertCircle className="w-4 h-4 shrink-0" />
             <span className="text-xs font-bold uppercase tracking-widest">
               Registrando aula de reposição
             </span>
             {form.reposicao_ocorrencia_id && (
               <span className="text-xs md:ml-auto opacity-80">
                  Esta aula será vinculada à pendência selecionada, e o status da falta passará para "Em Reposição" (ou Concluído dependendo de outras ações).
               </span>
             )}
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-outline bg-surface-container-low/50">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" /> 
              {aulaAtual ? 'Editar Aula' : 'Nova Aula'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">Preencha os detalhes e conecte o conteúdo ao seu planejamento.</p>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Sidebar Tabs */}
          <div className="md:w-64 shrink-0 bg-surface-container-lowest border-b md:border-b-0 md:border-r border-outline flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible custom-scrollbar">
            {[
              { id: 'basico', label: 'Info. Básica' },
              { id: 'conteudo', label: 'Conteúdo e Notas' },
              { id: 'materiais', label: 'Materiais (Links/PDFs)' },
              { id: 'planejamento', label: 'Próximos Passos' },
              { id: 'automacao', label: 'IA & Automações' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 text-left px-6 py-4 text-sm font-bold transition-colors border-b-2 md:border-b-0 md:border-l-2 ${activeTab === tab.id ? 'border-secondary text-secondary bg-secondary/5' : 'border-transparent text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-container-lowest">
            <form id="aulaForm" onSubmit={(e) => handleSave(e, false)} className="space-y-6">
              
              {/* TAB: BÁSICO */}
              <div className={activeTab === 'basico' ? 'block space-y-6 animate-in fade-in' : 'hidden'}>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Título da Aula *</label>
                  <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder="Ex: Teoria Geral do Estado" className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipo de Aula</label>
                     <select 
                       value={form.tipo_aula || 'normal'} 
                       onChange={e => setForm({...form, tipo_aula: e.target.value})}
                       className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors"
                     >
                        <option value="normal">Aula Normal</option>
                        <option value="reposicao">Aula de Reposição / Recuperação</option>
                        <option value="revisao">Revisão Geral</option>
                        <option value="extra">Aula Extra</option>
                     </select>
                   </div>
                   
                   {form.tipo_aula === 'reposicao' && (
                     <div className="animate-in fade-in slide-in-from-top-2">
                       <label className="block text-xs font-bold text-error uppercase tracking-wider mb-2">Falta sendo Reposta</label>
                       <select 
                         value={form.reposicao_ocorrencia_id || ''} 
                         onChange={e => setForm({...form, reposicao_ocorrencia_id: e.target.value})}
                         className="w-full bg-error/10 border border-error/30 text-on-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-error transition-colors"
                       >
                          <option value="">Selecione a falta pendente...</option>
                          {faltasPendentes.map(falta => (
                             <option key={falta.id} value={falta.id}>
                               Falta do dia {falta.data} {falta.quantidade_ocorrencias > 1 ? `(${falta.quantidade_ocorrencias} faltas)` : ''}
                             </option>
                          ))}
                          {faltasPendentes.length === 0 && <option value="" disabled>Nenhuma falta pendente encontrada</option>}
                       </select>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Data *</label>
                    <DateInputMasked 
                      value={form.data} 
                      onValueChange={(val) => setForm({...form, data: val})} 
                      required 
                      className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" 
                    />
                    
                    {form.tipo_aula !== 'reposicao' && faltasPendentes.some(f => f.data.substring(0,10) === form.data.substring(0,10)) && (
                      <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded-lg flex flex-col gap-1 animate-in fade-in">
                        <span className="text-[10px] font-bold text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Você tem uma falta pendente neste mesmo dia.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const falta = faltasPendentes.find(f => f.data.substring(0,10) === form.data.substring(0,10));
                            if (falta) {
                              setForm(prev => ({
                                ...prev,
                                tipo_aula: 'reposicao',
                                reposicao_ocorrencia_id: falta.id
                              }));
                            }
                          }}
                          className="text-[10px] uppercase font-black tracking-wider text-error underline self-start hover:text-error/80"
                        >
                          Usar aula como reposição
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Horário</label>
                    <TimeInputMasked 
                      value={form.horario} 
                      onValueChange={(val) => {
                         setForm({...form, horario: val});
                         if (horarioError) setHorarioError('');
                      }} 
                      onBlur={handleHorarioBlur}
                      className={`w-full bg-surface-container border ${horarioError ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors`} 
                    />
                    {horarioError && <span className="text-error text-xs font-bold mt-1 block">{horarioError}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status da Aula</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors">
                      <option value="pendente">Pendente</option>
                      <option value="assistida">Assistida</option>
                      <option value="revisar">Preciso Revisar</option>
                      <option value="incompleta">Incompleta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Vincular a Tópico</label>
                    <select value={form.topico_id} onChange={e => setForm({...form, topico_id: e.target.value})} className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors">
                      <option value="">(Sem vínculo)</option>
                      <option value="new" className="font-bold text-primary">+ Criar novo tópico agora</option>
                      {topicos.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.topico_id === 'new' && (
                  <div className="bg-surface border border-primary/30 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                     <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                        Criar Novo Tópico
                     </h4>
                     <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nome do Tópico *</label>
                        <input type="text" autoFocus value={novoTopico.nome} onChange={e => setNovoTopico({...novoTopico, nome: e.target.value})} required={form.topico_id === 'new'} className="w-full bg-surface-container border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors" placeholder="Ex: Direitos e Garantias Fundamentais" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</label>
                          <select value={novoTopico.status} onChange={e => setNovoTopico({...novoTopico, status: e.target.value as any})} className="w-full bg-surface-container border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors">
                             <option value="estudar">A Estudar</option>
                             <option value="estudando">Estudando</option>
                             <option value="revisar">Preciso Revisar</option>
                             <option value="concluido">Concluído</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Dificuldade</label>
                          <select value={novoTopico.dificuldade} onChange={e => setNovoTopico({...novoTopico, dificuldade: e.target.value as any})} className="w-full bg-surface-container border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors">
                             <option value="facil">Fácil</option>
                             <option value="media">Média</option>
                             <option value="dificil">Difícil</option>
                          </select>
                        </div>
                     </div>
                     <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setForm({...form, topico_id: ''})} className="px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface">Cancelar</button>
                        <button type="button" onClick={async () => {
                          if (!user || !effectiveMateriaId) return;
                          if (!novoTopico.nome.trim()) {
                              toast.error('Informe o nome do novo tópico');
                              return;
                          }
                          setLoading(true);
                          try {
                              const { data } = await apiClient.post('/topicos', {
                                  materia_id: effectiveMateriaId,
                                  nome: novoTopico.nome,
                                  descricao: novoTopico.descricao || '',
                                  status: novoTopico.status,
                                  prioridade: novoTopico.prioridade,
                                  peso_importancia: Number(novoTopico.peso_importancia) || 1,
                                  dificuldade: novoTopico.dificuldade,
                                  horas_planejadas: 0
                              });
                              setForm({...form, topico_id: data.id});
                              toast.success('Tópico criado e vinculado à aula.');
                          } catch (err: any) {
                              toast.error('Erro ao salvar tópico: ' + err.message);
                          } finally {
                              setLoading(false);
                          }
                        }} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">Salvar Tópico Agora</button>
                     </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Professor</label>
                    <input 
                      type="text" 
                      value={form.professor} 
                      onChange={e => {
                        setForm({...form, professor: e.target.value});
                        setUserEditedProfessor(true);
                      }}
                      placeholder="Nome do professor" 
                      className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" 
                    />
                    {!userEditedProfessor && form.professor && !aulaAtual && (
                      <p className="text-[10px] text-on-surface-variant italic mt-1">Preenchido automaticamente da matéria</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Local ou Link (Meet/Zoom)</label>
                    <input type="text" value={form.local_ou_link} onChange={e => setForm({...form, local_ou_link: e.target.value})} placeholder="Sala ou URL" className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" />
                  </div>
                </div>
              </div>

              {/* TAB: CONTEÚDO */}
              <div className={activeTab === 'conteudo' ? 'block space-y-6 animate-in fade-in' : 'hidden'}>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resumo Rápido</label>
                  <input type="text" value={form.resumo_rapido} onChange={e => setForm({...form, resumo_rapido: e.target.value})} placeholder="Frase ou conceito central da aula" className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Dúvidas ou Dificuldades</label>
                  <textarea value={form.duvidas} onChange={e => setForm({...form, duvidas: e.target.value})} placeholder="O que não ficou claro?" className="w-full bg-error/5 border border-error/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-error transition-colors min-h-[80px]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Anotações Livres / Conteúdo</label>
                  <textarea value={form.conteudo} onChange={e => setForm({...form, conteudo: e.target.value})} placeholder="Suas anotações completas" className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors min-h-[160px] resize-y" />
                </div>
              </div>

              {/* TAB: MATERIAIS */}
              <div className={activeTab === 'materiais' ? 'block space-y-4 animate-in fade-in' : 'hidden'}>
                <div className="flex justify-between items-center bg-surface-container-low p-4 border border-outline/50 rounded-xl">
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">Anexar Links e Materiais</h4>
                    <p className="text-xs text-on-surface-variant">Arquivos do Google Drive, vídeos no YouTube ou links externos oficiais.</p>
                  </div>
                  <button type="button" onClick={addMaterial} className="bg-tertiary/10 text-tertiary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-tertiary/20 flex items-center gap-1"><Plus className="w-4 h-4"/> Add Link</button>
                </div>
                
                {materiais.length === 0 && (
                   <div className="bg-surface-container border border-outline/50 rounded-xl p-6 text-center">
                     <p className="text-sm text-on-surface-variant italic mb-4">Nenhum material adicionado ainda.</p>
                     
                     <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-left inline-block max-w-sm">
                        <h5 className="font-bold text-emerald-600 text-xs flex items-center gap-1.5 mb-2">
                           <Zap className="w-3.5 h-3.5" /> Dica: Google Drive
                        </h5>
                        <p className="text-[10px] text-on-surface-variant">Para anexar PDFs ou Slides de forma segura, suba o arquivo no seu Google Drive, clique em "Compartilhar", libere para "Qualquer pessoa com o link" ou "Leitor" e cole a URL aqui.</p>
                     </div>
                   </div>
                )}

                <div className="space-y-4">
                  {materiais.map((mat, index) => (
                    <div key={index} className="p-4 bg-surface-container border border-outline rounded-xl relative group">
                      <button type="button" onClick={() => removeMaterial(index)} className="absolute top-4 right-4 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mr-6">
                        <div>
                           <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tipo</label>
                           <select value={mat.tipo} onChange={(e) => updateMaterial(index, 'tipo', e.target.value)} className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm">
                             <option value="link">Apenas Link / Web</option>
                             <option value="pdf">Arquivo PDF</option>
                             <option value="video">Vídeo / Aula</option>
                             <option value="audio">Áudio / Gravação</option>
                             <option value="slide">Apresentação / Slide</option>
                             <option value="documento">Documento de Texto</option>
                             <option value="imagem">Imagem</option>
                             <option value="livro">Livro ou E-book</option>
                             <option value="resumo">Resumo / Anotação Própria</option>
                             <option value="outro">Outro (Drive/Link)</option>
                           </select>
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Título</label>
                           <input type="text" value={mat.titulo} onChange={(e) => updateMaterial(index, 'titulo', e.target.value)} placeholder="Ex: Slide da Aula 1" className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="md:col-span-3">
                           <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                             {['resumo', 'anotacao'].includes(mat.tipo) ? 'URL / Link (Opcional se houver notas)' : 'URL / Link do Material'}
                           </label>
                           <input 
                             type="text" 
                             value={mat.url} 
                             onChange={(e) => updateMaterial(index, 'url', e.target.value)} 
                             placeholder={mat.tipo === 'audio' ? "Cole o link da gravação no Google Drive..." : "https://..."} 
                             className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm mb-2" 
                           />
                           
                           {/* Legacy document info fallback */}
                           {(mat.arquivo_nome || mat.drive_file_name) && (
                              <div className="mt-2 px-3 py-2 bg-surface-container-lowest border border-outline/50 rounded-lg flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-on-surface line-clamp-1">
                                      Anexo antigo: {mat.arquivo_nome || mat.drive_file_name}
                                  </span>
                                  <button type="button" onClick={() => {
                                      const newMats = [...materiais];
                                      newMats[index] = { ...newMats[index], arquivo_url: null, arquivo_nome: null, drive_file_id: null, drive_file_name: null };
                                      setMateriais(newMats);
                                  }} className="text-[10px] text-error hover:underline shrink-0 ml-4 font-bold bg-error/10 px-2 py-1 rounded">Remover Anexo Antigo</button>
                              </div>
                           )}
                           
                           {['resumo', 'anotacao'].includes(mat.tipo) && (
                             <div className="mt-4">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Conteúdo ou Observações Livres</label>
                                <textarea
                                  value={mat.observacao || ''}
                                  onChange={(e) => updateMaterial(index, 'observacao', e.target.value)}
                                  placeholder="Suas anotações, notas da aula ou texto do resumo..."
                                  className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm min-h-[80px]"
                                />
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TAB: PLANEJAMENTO */}
              <div className={activeTab === 'planejamento' ? 'block space-y-6 animate-in fade-in' : 'hidden'}>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">O que estudar a seguir?</label>
                  <input type="text" value={form.proximos_passos_o_que_estudar} onChange={e => setForm({...form, proximos_passos_o_que_estudar: e.target.value})} placeholder="Ex: Ler capítulo 3 e finalizar exercícios" className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Prioridade</label>
                    <select value={form.prioridade_estudo} onChange={e => setForm({...form, prioridade_estudo: e.target.value})} className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Vincular a Avaliação (Prova/Trab)</label>
                    <select className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors text-on-surface-variant italic" disabled>
                      <option value="">Nenhuma avaliação cadastrada (Em breve)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Data Sugerida para Estudo</label>
                    <input type="date" value={form.proximos_passos_data} onChange={e => setForm({...form, proximos_passos_data: e.target.value})} className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-tertiary/5 border border-tertiary/20 rounded-xl cursor-pointer hover:bg-tertiary/10 transition-colors" onClick={() => setForm({...form, add_to_planner: !form.add_to_planner})}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${form.add_to_planner ? 'bg-tertiary border-tertiary' : 'border-outline/50'}`}>
                    {form.add_to_planner && <CheckCircle className="w-3.5 h-3.5 text-on-tertiary" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface text-tertiary">Adicionar ao Planner Inteligente</p>
                    <p className="text-[10px] text-on-surface-variant">Cria um evento de estudo pendente no seu planner com base nesta data e prioridade.</p>
                  </div>
                </div>
              </div>

              {/* TAB: IA e AUTOMACAO */}
              <div className={activeTab === 'automacao' ? 'block space-y-4 animate-in fade-in' : 'hidden'}>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-4">
                  <h3 className="font-bold text-primary flex items-center gap-2 mb-4"><BrainCircuit className="w-5 h-5" /> Copilot: Automações</h3>
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_revisao} 
                      onChange={e => setForm({...form, auto_revisao: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_revisao ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_revisao && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Agendar Revisões Automáticas</p>
                      <p className="text-[10px] text-on-surface-variant">Agenda revisões nos próximos 3, 7, 15, 30 e 90 dias automaticamente.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_calendario} 
                      onChange={e => setForm({...form, auto_calendario: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_calendario ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_calendario && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Adicionar Aula ao Calendário</p>
                      <p className="text-[10px] text-on-surface-variant">Cria um evento no calendário interno (sincroniza com Google Calendar se conectado).</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.add_to_planner} 
                      onChange={e => setForm({...form, add_to_planner: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.add_to_planner ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.add_to_planner && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Criar bloco sugerido no Planner</p>
                      <p className="text-[10px] text-on-surface-variant">Sugere um bloco de estudo baseado nos próximos passos.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_resumo_ia} 
                      onChange={e => setForm({...form, auto_resumo_ia: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_resumo_ia ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_resumo_ia && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">Gerar Resumo Inteligente <Zap className="w-3 h-3 text-primary"/></p>
                      <p className="text-[10px] text-on-surface-variant">Cria um resumo estruturado e o salva na aba Resumos.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_flashcards_ia} 
                      onChange={e => setForm({...form, auto_flashcards_ia: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_flashcards_ia ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_flashcards_ia && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">Extrair Flashcards <Zap className="w-3 h-3 text-primary"/></p>
                      <p className="text-[10px] text-on-surface-variant">Busca conceitos principais e cria flashcards vinculados a este tópico.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_questoes_ia} 
                      onChange={e => setForm({...form, auto_questoes_ia: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_questoes_ia ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_questoes_ia && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">Gerar Questões <Zap className="w-3 h-3 text-primary"/></p>
                      <p className="text-[10px] text-on-surface-variant">Gera questões práticas baseadas no conteúdo da aula.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={!!form.auto_sessao} 
                      onChange={e => setForm({...form, auto_sessao: e.target.checked})} 
                    />
                    <div className={`w-5 h-5 mt-0.5 rounded flex shrink-0 items-center justify-center border transition-colors ${form.auto_sessao ? 'bg-primary border-primary' : 'border-primary/30 group-hover:border-primary'}`}>
                      {form.auto_sessao && <CheckCircle className="w-3.5 h-3.5 text-on-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">Criar sugestão de sessão de estudo <Zap className="w-3 h-3 text-primary"/></p>
                      <p className="text-[10px] text-on-surface-variant">Cria uma sessão de estudo agendada para facilitar a revisão posterior.</p>
                    </div>
                  </label>

                </div>
              </div>

            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 p-4 border-t border-outline bg-surface-container-low/80 backdrop-blur-sm">
          {!aulaAtual && (
             <button 
               type="button" 
               disabled={loading}
               onClick={() => handleSave(undefined, true)}
               className="px-4 py-2 bg-surface-container-highest border border-outline/30 text-on-surface text-sm font-bold rounded-xl hover:bg-surface-variant transition-colors disabled:opacity-50"
             >
               Salvar e Criar Outra
             </button>
          )}
          <button 
            type="button" 
            onClick={handleClose}
            className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="aulaForm"
            disabled={loading}
            className="px-8 py-2.5 bg-secondary text-on-secondary text-sm font-bold rounded-xl hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Salvando...' : 'Salvar Aula'}
          </button>
        </div>

      </div>
    </div>
  );
}
