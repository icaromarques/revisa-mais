import { useSessionModal } from '@/contexts/SessionModalContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/hooks/usePreferences';
import { X, Book, FileText, Clock, Save, CheckCircle2, ChevronDown, Plus, Zap, LinkIcon, ExternalLink, Edit2, Star, Trash2 } from 'lucide-react';
import { cn, parseValidDate } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { EventoAcademicoTipo } from '@/types/calendar';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { getPerformanceClass, PerformanceLevel } from '@/lib/performanceUtils';
import { apiClient } from '@/lib/api';

import { ModalNovoMaterial } from '@/components/materias/ModalNovoMaterial';

export function SessionModal() {
  const { isOpen, closeModal, modalData } = useSessionModal();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  
  const [materias, setMaterias] = useState<{id: string, nome: string, cor: string}[]>([]);
  const [topicos, setTopicos] = useState<{id: string, nome: string}[]>([]);
  const [aulas, setAulas] = useState<{id: string, titulo: string}[]>([]);
  const [selectedMateria, setSelectedMateria] = useState('');
  const [selectedTopico, setSelectedTopico] = useState('');
  const [newTopico, setNewTopico] = useState('');
  const [isCreatingTopico, setIsCreatingTopico] = useState(false);
  
  const [tempo, setTempo] = useState('');
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [totalQuestoes, setTotalQuestoes] = useState('');
  const [acertos, setAcertos] = useState('');
  const [notas, setNotas] = useState('');
  const [professor, setProfessor] = useState('');
  const [userEditedProfessor, setUserEditedProfessor] = useState(false);
  const [selectedIntervals, setSelectedIntervals] = useState<number[]>([1, 3, 7, 14]);
  const [preset, setPreset] = useState<'nenhuma' | 'essencial' | 'padrao' | 'completa' | 'personalizada'>('padrao');
  const [includePreProva, setIncludePreProva] = useState(false);
  const [nearbyExam, setNearbyExam] = useState<any | null>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [lastSessionPerf, setLastSessionPerf] = useState<'low' | 'high' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // New relational states
  const [tipoSessao, setTipoSessao] = useState<'estudo_novo'|'revisao'|'resumo'|'mapa_mental'|'questoes'|'flashcards'|'simulado'|'recuperacao_de_conteudo'>('estudo_novo');
  const [tituloSessao, setTituloSessao] = useState('');
  const [revisaoVinculadaId, setRevisaoVinculadaId] = useState('');
  const [faltaVinculadaId, setFaltaVinculadaId] = useState('');
  const [materialVinculadoId, setMaterialVinculadoId] = useState('');
  const [outputDescricao, setOutputDescricao] = useState('');
  const [formaRecuperacao, setFormaRecuperacao] = useState('estudo_autonomo');
  
  // New Output Destination states
  const [outputDestino, setOutputDestino] = useState<'material_existente' | 'novo_material' | 'somente_sessao'>('somente_sessao');
  const [novoMaterialTitulo, setNovoMaterialTitulo] = useState('');
  const [novoMaterialTipo, setNovoMaterialTipo] = useState('resumo');
  const [novoMaterialUrl, setNovoMaterialUrl] = useState('');
  const [novoMaterialAulaId, setNovoMaterialAulaId] = useState('');

  const [faltasPendentes, setFaltasPendentes] = useState<any[]>([]);
  const [revisoesPendentes, setRevisoesPendentes] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  
  const [isMaterialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<any>(null);
  const [realTimeSession, setRealTimeSession] = useState<any>(null);

  // Monitor the session in real-time if editing
  useEffect(() => {
    if (!isOpen || !user || modalData?.modo !== 'edit' || !modalData?.id) {
       setRealTimeSession(null);
       return;
    }
    
    // Provisoriamente uma chamada GET
    apiClient.get(`/sessoes/${modalData.id}`).then(({ data }) => {
        setRealTimeSession(data);
    }).catch(console.error);

  }, [isOpen, user, modalData?.id, modalData?.modo]);

  // Initial data from context (Pomodoro or predefined links)
  useEffect(() => {
    if (isOpen && modalData) {
      if (modalData.materiaId) setSelectedMateria(modalData.materiaId);
      if (modalData.topicoId) setSelectedTopico(modalData.topicoId);
      if (modalData.dataRegistroISO) {
        setDataRegistro(modalData.dataRegistroISO.split('T')[0]);
      }
      
      if (modalData.tipoSessao) setTipoSessao(modalData.tipoSessao as any);
      if (modalData.revisaoId) {
        setRevisaoVinculadaId(modalData.revisaoId);
        setTipoSessao('revisao'); // overwrite to review if explicitly passed a review
      }
      if (modalData.faltaId) {
        setFaltaVinculadaId(modalData.faltaId);
        setTipoSessao('recuperacao_de_conteudo');
      }
      
      if (modalData.modo === 'edit') {
        if (modalData.tempoHHMMSS) setTempo(modalData.tempoHHMMSS);
        if (modalData.totalQuestoes !== undefined) setTotalQuestoes(modalData.totalQuestoes.toString());
        if (modalData.acertos !== undefined) setAcertos(modalData.acertos.toString());
        if (modalData.notas !== undefined) setNotas(modalData.notas);
        if ((modalData as any).professor !== undefined) {
          setProfessor((modalData as any).professor);
          setUserEditedProfessor(true); // Don't overwrite if editing existing
        }
        if ((modalData as any).titulo) setTituloSessao((modalData as any).titulo);
        if ((modalData as any).material_id) setMaterialVinculadoId((modalData as any).material_id);
        
        let initialDestino = (modalData as any).output_destino || 'somente_sessao';
        if (initialDestino === 'novo_material') {
           initialDestino = 'material_existente';
        }
        setOutputDestino(initialDestino);
        
        if ((modalData as any).output_produzido) setOutputDescricao((modalData as any).output_produzido);
        
        if (modalData.dificuldade !== undefined) setDifficulty(modalData.dificuldade);
        setPreset('nenhuma');
        setSelectedIntervals([]);
      } else if (modalData.tempoSugeridoS) {
        const totalSeconds = modalData.tempoSugeridoS;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        setTempo(formatted);
        if (modalData.observacaoSugerida) {
          setNotas(modalData.observacaoSugerida);
        }
      }
    } else if (isOpen) {
      setDataRegistro(new Date().toISOString().split('T')[0]);
      setTipoSessao('estudo_novo'); // reset
      
      // APPLY PREFERENCES
      if (preferences) {
         if (preferences.durations.default_session_minutes) {
             const mins = preferences.durations.default_session_minutes;
             const h = Math.floor(mins / 60);
             const m = mins % 60;
             const s = 0;
             const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
             setTempo(formatted);
         }
      }
    }
  }, [isOpen, modalData, preferences]);

  // Fetch relational data (faltas and revisoes and materiais)
  useEffect(() => {
    if (!user || !isOpen) return;

    let isMounted = true;
    
    const fetchRelations = async () => {
      try {
        const [
           { data: ocs },
           { data: revs },
           { data: mats }
        ] = await Promise.all([
           apiClient.get('/ocorrencias'),
           apiClient.get('/revisoes', { params: { status: 'pendente' } }),
           apiClient.get('/materiais')
        ]);
        
        if (isMounted) {
           setFaltasPendentes(ocs.filter((d:any) => d.status === 'falta' && !d.conteudo_recuperado));
           setRevisoesPendentes(revs);
           setMateriais(mats);
        }
      } catch (e) {
         console.error("Erro ao buscar relações para modal", e);
      }
    };
    
    fetchRelations();
    
    return () => { isMounted = false; };
  }, [user, isOpen]);

  // Fetch materias
  useEffect(() => {
    if (!user || !isOpen) return;

    apiClient.get('/materias').then(({ data }) => {
       setMaterias(data);
    }).catch(console.error);
  }, [user, isOpen]);

  // Fetch topicos and aulas when materia changes
  useEffect(() => {
    if (!user || !selectedMateria) {
      setTopicos([]);
      setAulas([]);
      return;
    }

    apiClient.get(`/topicos/materia/${selectedMateria}`).then(({ data }) => {
       setTopicos(data);
    }).catch(console.error);
    
    apiClient.get(`/materias/${selectedMateria}/aulas`).then(({ data }) => {
       setAulas(data);
    }).catch(console.error);

  }, [user, selectedMateria]);

  // Fetch nearby exams for pre-prova suggestion
  useEffect(() => {
    if (!user || !selectedMateria || !isOpen) {
      setNearbyExam(null);
      return;
    }

    const today = new Date(dataRegistro + 'T00:00:00');
    const futureLimit = new Date(today);
    futureLimit.setDate(futureLimit.getDate() + 30); // Look 30 days ahead

    apiClient.get(`/eventos`, { params: { materiaId: selectedMateria } }).then(({ data }) => {
       const exams = data
        .filter((e: any) => {
          if (!e.data_inicio || e.concluido) return false;
          const examDate = new Date(e.data_inicio);
          return ['prova', 'exame', 'avaliacao', 'trabalho'].includes(e.tipo) && 
                 examDate >= today && 
                 examDate <= futureLimit;
        })
        .sort((a: any, b: any) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());

      setNearbyExam(exams[0] || null);
    }).catch(console.error);

  }, [user, selectedMateria, dataRegistro, isOpen]);

  // Fetch last session performance for topic
  useEffect(() => {
    if (!user || !selectedTopico || !isOpen) {
      setLastSessionPerf(null);
      return;
    }

    apiClient.get(`/sessoes/historico`, { params: { topicoId: selectedTopico, limit: 1 } }).then(({ data }) => {
       if (data && data.length > 0) {
         const sessao = data[0];
         const total = sessao.total_questoes || 0;
         const hits = sessao.acertos || 0;
         const diff = sessao.dificuldade || 3;
         const perf = total > 0 ? (hits / total) : 0;
         
         if (perf >= 0.8 && diff <= 3) setLastSessionPerf('high');
         else if (perf < 0.6 || diff >= 4) setLastSessionPerf('low');
         else setLastSessionPerf(null);
       } else {
         setLastSessionPerf(null);
       }
    }).catch(console.error);
  }, [user, selectedTopico, isOpen]);

  // Fetch user settings for intelligent revisions
  useEffect(() => {
    if (!user || !isOpen) return;
    // Assume we can fetch user settings from auth profile or specific endpoint
    apiClient.get('/usuarios/perfil').then(({ data }) => {
        if (data && data.settings) {
            setUserSettings(data.settings);
            // Auto-apply logic if configured
            if (data.settings.intelligentRevision?.active && data.settings.intelligentRevision?.mode === 'auto') {
              const suggestion = calculateIntelligentSuggestion(data.settings.intelligentRevision?.sensitivity || 'balanced');
              if (suggestion.intervals.length > 0) {
                setSelectedIntervals(suggestion.intervals);
                setPreset('personalizada');
              }
            }
        }
    }).catch(console.error);
  }, [user, isOpen]);

  const calculateIntelligentSuggestion = (sensitivity: string = 'balanced') => {
    const totalQ = parseInt(totalQuestoes || '0');
    const acerts = parseInt(acertos || '0');
    const perfInfo = getPerformanceClass(acerts, totalQ);
    
    // Notes influence
    const notesLower = notas.toLowerCase();
    const hasCriticalNotes = notesLower.includes('difícil') || notesLower.includes('dúvida') || notesLower.includes('confuso');

    let level: 'weak' | 'medium' | 'good' | 'excellent' = 'medium';

    if (perfInfo.level === 'fraco' || difficulty >= 4 || hasCriticalNotes) {
      level = 'weak';
    } else if (perfInfo.level === 'excelente' && difficulty <= 2) {
      level = 'excellent';
      if (lastSessionPerf === 'high') {
        return {
          intervals: [30, 60, 90],
          message: "Domínio excepcional e consistente! Revisões de longuíssimo prazo sugeridas.",
          reason: "Baseado no histórico de alto desempenho neste tópico."
        };
      }
    } else if (perfInfo.level === 'bom' && difficulty <= 3) {
      level = 'good';
      if (lastSessionPerf === 'high') level = 'excellent';
    } else if (perfInfo.level === 'mediano') {
      level = 'medium';
      if (lastSessionPerf === 'low') level = 'weak';
    } else {
      level = 'medium';
    }

    // Adjust based on sensitivity
    if (sensitivity === 'intensive') {
      if (level === 'excellent') level = 'good';
      else if (level === 'good') level = 'medium';
      else if (level === 'medium') level = 'weak';
    } else if (sensitivity === 'conservative') {
      if (level === 'weak') level = 'medium';
      else if (level === 'medium') level = 'good';
      else if (level === 'good') level = 'excellent';
    }

    const map = {
      weak: {
        intervals: [1, 3, 7, 14],
        message: "Seu desempenho sugere reforço mais próximo.",
        reason: difficulty >= 4 ? "Baseado na alta dificuldade reportada." : perfInfo.percentage < 60 && totalQ > 0 ? "Baseado no baixo aproveitamento em questões." : "O conteúdo parece exigir mais atenção inicial."
      },
      medium: {
        intervals: [3, 7, 14, 60],
        message: "Seu desempenho foi estável. Revisões intermediárias são recomendadas.",
        reason: "O domínio está em construção."
      },
      good: {
        intervals: [7, 14, 60, 90],
        message: "Bom desempenho. Você pode espaçar mais as revisões.",
        reason: "Baseado no bom aproveitamento e fluidez."
      },
      excellent: {
        intervals: [14, 60, 90],
        message: "Excelente! Domínio alto detectado, revisões de manutenção sugeridas.",
        reason: "Baseado no alto aproveitamento e baixa dificuldade."
      }
    };

    return map[level];
  };

  const intelligentSuggestion = calculateIntelligentSuggestion(userSettings?.intelligentRevision?.sensitivity);
  const currentPerf = getPerformanceClass(parseInt(acertos || '0'), parseInt(totalQuestoes || '0'));

  const applyPreset = (p: string) => {
    setPreset(p as any);
    if (p === 'nenhuma') setSelectedIntervals([]);
    else if (p === 'essencial') setSelectedIntervals([1, 3, 7]);
    else if (p === 'padrao') setSelectedIntervals([1, 3, 7, 14]);
    else if (p === 'completa') setSelectedIntervals([1, 3, 7, 14, 60, 90]);
  };

  const toggleInterval = (interval: number) => {
    setSelectedIntervals(prev => {
      const next = prev.includes(interval) 
        ? prev.filter(i => i !== interval) 
        : [...prev, interval].sort((a, b) => a - b);
      
      // Update preset status
      const isEssencial = JSON.stringify(next) === JSON.stringify([1, 3, 7]);
      const isPadrao = JSON.stringify(next) === JSON.stringify([1, 3, 7, 14]);
      const isCompleta = JSON.stringify(next) === JSON.stringify([1, 3, 7, 14, 60, 90]);
      const isNenhuma = next.length === 0;

      if (isNenhuma) setPreset('nenhuma');
      else if (isEssencial) setPreset('essencial');
      else if (isPadrao) setPreset('padrao');
      else if (isCompleta) setPreset('completa');
      else setPreset('personalizada');

      return next;
    });
  };

  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 6 digits (HHMMSS)
    if (value.length > 6) value = value.slice(-6);
    
    // Pad with zeros
    const padded = value.padStart(6, '0');
    
    // Format to HH:MM:SS
    const hh = padded.slice(0, 2);
    const mm = padded.slice(2, 4);
    const ss = padded.slice(4, 6);
    
    setTempo(`${hh}:${mm}:${ss}`);
  };

  const handleSave = async () => {
    if (!user || !selectedMateria || !tempo || tempo === '00:00:00') {
      setError("Preencha a matéria e defina um tempo de estudo válido.");
      return;
    }

    const totalQ = parseInt(totalQuestoes || '0');
    const acerts = parseInt(acertos || '0');

    if (acerts > totalQ) {
      setError("O número de acertos não pode ser maior que o total de questões.");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Parse HH:MM:SS to total seconds
      const parts = tempo.split(':');
      const h = parseInt(parts[0] || '0');
      const m = parseInt(parts[1] || '0');
      const s = parseInt(parts[2] || '0');
      const totalSeconds = (h * 3600) + (m * 60) + s;
      const minutos = totalSeconds / 60;

      const isEdit = modalData?.modo === 'edit' && !!modalData.id;

      let topicoId = selectedTopico;
      let finalMaterialId = outputDestino === 'material_existente' ? materialVinculadoId : null;

      // Criar novo tópico se necessário
      if (isCreatingTopico && newTopico.trim()) {
        const existing = topicos.find(t => (t.nome || '').toLowerCase() === newTopico.trim().toLowerCase());
        if (existing) {
          topicoId = existing.id;
        } else {
          const { data } = await apiClient.post('/topicos', {
            materia_id: selectedMateria,
            nome: newTopico.trim(),
            status: 'estudando',
          });
          topicoId = data.id;
        }
      }
      
      // Criar novo material se solicitado
      if (outputDestino === 'novo_material') {
        if (!novoMaterialTitulo.trim()) {
           toast.error("O título do novo material é obrigatório.");
           setLoading(false);
           return;
        }
        
        if (['pdf', 'slide', 'imagem', 'video', 'link', 'audio', 'documento', 'livro', 'outro'].includes(novoMaterialTipo)) {
             if (!novoMaterialUrl.trim()) {
                 toast.error(`Para materiais do tipo "${novoMaterialTipo}", você deve informar a URL/Link.`);
                 setLoading(false);
                 return;
             }
        }
        
        if (!novoMaterialUrl.trim() && ['resumo', 'anotacao'].includes(novoMaterialTipo) && !outputDescricao.trim()) {
            toast.error("Um resumo ou anotação sem link precisa de conteúdo ou observações.");
            setLoading(false);
            return;
        }

        const payload: any = {
          user_id: user.id,
          materia_id: selectedMateria,
          topico_id: topicoId || null,
          aula_id: novoMaterialAulaId || null,
          titulo: novoMaterialTitulo.trim(),
          conteudo: outputDescricao || '',
          tipo: novoMaterialTipo,
          criado_a_partir_da_sessao: true,
          origin_session_id: sessaoId,
          linked_session_ids: [sessaoId]
        };

        if (novoMaterialUrl.trim()) {
            const { prepareMaterialLinkMetadata } = await import('@/lib/materialLinks');
            const meta = prepareMaterialLinkMetadata(novoMaterialUrl.trim());
            if (meta) {
               payload.url = meta.url;
               payload.provider = meta.provider;
               payload.source_kind = meta.source_kind;
               payload.drive_file_id = meta.drive_file_id;
               payload.drive_preview_url = meta.drive_preview_url;
               payload.drive_open_url = meta.drive_open_url;
            } else {
               payload.url = novoMaterialUrl.trim();
            }
        } else if (payload.conteudo && ['resumo', 'anotacao'].includes(payload.tipo)) {
            payload.source_kind = 'text';
            payload.provider = 'text';
        }

        const { materialService } = await import('@/services/materialService');
        const mId = await materialService.createMaterial(payload);
        if (mId) finalMaterialId = mId;
      } else if (outputDestino === 'material_existente' && finalMaterialId) {
         // Linkar essa sessão no material bidirecionalmente (funciona tanto na criacao quanto edicao)
         const { materialService } = await import('@/services/materialService');
         await materialService.linkMaterialToSession(finalMaterialId, sessaoId);
      }

      // Sugerir título se estiver em branco
      let finalTituloSessao = tituloSessao.trim();
      if (!finalTituloSessao) {
         if (preferences?.sessions?.auto_title === false) {
             toast.error('Por favor, informe o título da sessão.');
             setLoading(false);
             return;
         }
         const { parseValidDate, safeFormat } = await import('@/lib/utils');
         const d = parseValidDate(dataRegistro);
         const tipoSessaoFormatado = tipoSessao.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
         
         const topicoNome = topicos.find(t => t.id === topicoId)?.nome || '';
         finalTituloSessao = `${tipoSessaoFormatado} ${topicoNome ? '- ' + topicoNome : ''} - ${safeFormat(d, 'dd/MM')}`;
      }

      // Handle extra fields based on tipoSessao
      const extraFields: any = {};
      if (tipoSessao === 'revisao') extraFields.revisao_id = revisaoVinculadaId || null;
      if (tipoSessao === 'recuperacao_de_conteudo') {
         extraFields.falta_id = faltaVinculadaId || null;
         extraFields.forma_recuperacao = formaRecuperacao;
      }
      
      // Output Destination Persistence
      extraFields.output_destino = outputDestino;
      if (outputDescricao) extraFields.output_produzido = outputDescricao;
      
      let existingLinkedIds = realTimeSession?.linked_material_ids || [];
      if (!Array.isArray(existingLinkedIds)) {
        existingLinkedIds = existingLinkedIds ? [existingLinkedIds] : [];
      }
      
      // Legacy migration logic if saving session
      if (isEdit && realTimeSession?.material_id && existingLinkedIds.length === 0) {
         existingLinkedIds.push(realTimeSession.material_id);
      }
      // Ensure unique
      existingLinkedIds = Array.from(new Set(existingLinkedIds));
      
      extraFields.primary_material_id = realTimeSession?.primary_material_id || (existingLinkedIds.length > 0 ? existingLinkedIds[0] : null);

      if (finalMaterialId) {
        extraFields.material_id = finalMaterialId; // Legacy support
        
        if (!existingLinkedIds.includes(finalMaterialId)) {
          existingLinkedIds.push(finalMaterialId);
        }
        
        // If no primary was set, make the new one primary
        if (!extraFields.primary_material_id) {
           extraFields.primary_material_id = finalMaterialId;
        }
      }
      
      extraFields.linked_material_ids = existingLinkedIds;
      
      const origemReal = modalData?.origem || (modalData?.modo === 'pomodoro' ? 'pomodoro' : 'manual');

      const sessaoData: any = {
        materia_id: selectedMateria,
        topico_id: topicoId || null,
        titulo: finalTituloSessao,
        tipo: tipoSessao, 
        origem_sessao: origemReal,
        tempo_estudado_segundos: totalSeconds,
        dificuldade: difficulty,
        professor: professor || null,
        total_questoes: totalQ,
        acertos: acerts,
        notas: notas,
        ...extraFields
      };

      let finalSessaoId = isEdit ? modalData.id : null;

      if (isEdit) {
        await apiClient.put(`/sessoes/${modalData.id}`, sessaoData);
      } else {
        const { data } = await apiClient.post('/sessoes/registrar', sessaoData);
        finalSessaoId = data.id;
      }
      
      const sessaoId = finalSessaoId;

      // ... then Handle Linked entities consequences (Update Revision / Faltas)
      if (tipoSessao === 'revisao' && revisaoVinculadaId) {
        const { revisaoService } = await import('@/services/revisaoService');
        const activeRevisao = revisoesPendentes.find(r => r.id === revisaoVinculadaId);
        if (activeRevisao) {
           await revisaoService.updateRevisao(revisaoVinculadaId, {
             status: 'concluida',
             data_realizada: dataRegistro + 'T' + new Date().toISOString().split('T')[1],
             session_id: sessaoId, // Relational link back
             updated_at: new Date().toISOString()
           });
        }
      }
      
      if (tipoSessao === 'recuperacao_de_conteudo' && faltaVinculadaId) {
         try {
           const { gradeOccurrenceService } = await import('@/services/gradeOccurrenceService');
           await gradeOccurrenceService.confirmOccurrence(faltaVinculadaId, 'conteudo_recuperado', sessaoId);
         } catch (e) { console.error("Erro ao vincular falta:", e); }
      }

      // Automatic reviews (Only for new sessions OR if selected)
      if (selectedIntervals.length > 0 || (includePreProva && nearbyExam)) {
        const baseDate = new Date(dataRegistro + 'T00:00:00');
        
        const { revisaoService } = await import('@/services/revisaoService');
        const materiaNome = materias.find(m => m.id === selectedMateria)?.nome || 'Sem Matéria';
        const topicoNome = topicos.find(t => t.id === topicoId)?.nome || 'Sem Tópico';

        const createRevision = async (days: number, customizedName?: string, customDate?: Date) => {
          const dataPrevista = customDate || new Date(baseDate);
          if (!customDate) dataPrevista.setDate(dataPrevista.getDate() + days);

          await revisaoService.createRevisao({
            nome: customizedName || `Revisão ${days} dias: ${topicoNome} (${materiaNome})`,
            materia_id: selectedMateria,
            topico_id: topicoId || '',
            session_id: sessaoId,
            tipo_intervalo: customizedName ? 'especial' : `d${days}`,
            data_prevista: dataPrevista.toISOString(),
            status: 'pendente',
            origem: 'automatica'
          });
        };

        // Create normal intervals
        for (const days of selectedIntervals) {
          await createRevision(days);
        }

        // Create pre-prova revision
        if (includePreProva && nearbyExam) {
          const examDate = new Date(nearbyExam.data_inicio);
          const preProvaDate = new Date(examDate);
          preProvaDate.setDate(preProvaDate.getDate() - 1); // 1 day before
          
          await createRevision(0, `Revisão Pré-Prova: ${nearbyExam.titulo} (${materiaNome})`, preProvaDate);
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao salvar sessão:", error);
      setError("Erro ao salvar sessão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMateria('');
    setSelectedTopico('');
    setNewTopico('');
    setIsCreatingTopico(false);
    setTempo('');
    setDifficulty(3);
    setProfessor('');
    setUserEditedProfessor(false);
    setTotalQuestoes('');
    setAcertos('');
    setNotas('');
    setSelectedIntervals([1, 3, 7, 14]);
    setPreset('padrao');
    setIncludePreProva(false);
    setNearbyExam(null);
    setOutputDestino('somente_sessao');
    setNovoMaterialTitulo('');
    setNovoMaterialTipo('resumo');
    setOutputDescricao('');
    setMaterialVinculadoId('');
    setError('');
    setShowSuccess(false);
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col glass-panel rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              {modalData?.modo === 'edit' ? 'Editar Sessão de Estudo' :
               modalData?.modo === 'pomodoro' ? 'Sessão de Foco Concluída' : 
               modalData?.modo === 'partial' ? 'Registrar Progresso Parcial' : 
               'Registro Manual de Sessão'}
            </h2>
            <p className="text-sm text-on-surface-variant font-medium tracking-wide uppercase">
              {modalData?.modo === 'edit' ? 'Atualize as informações do seu estudo' :
               modalData?.modo === 'pomodoro' ? 'Parabéns pelo ciclo de foco!' :
               modalData?.modo === 'partial' ? 'Salve o tempo estudado até agora' :
               'Consolidando Conhecimento Acadêmico'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors group">
            <X className="w-6 h-6 text-outline group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 hide-scrollbar scroll-smooth">
          
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-on-surface">Sessão Salva com Sucesso!</h3>
              <p className="text-on-surface-variant">Seu progresso foi registrado e as revisões agendadas.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-sm text-error animate-in slide-in-from-top-2">
                  <X className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Tipo da Sessão */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-primary tracking-widest uppercase">Tipo da Sessão *</label>
                <div className="relative group">
                  <select 
                    value={tipoSessao}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setTipoSessao(val);
                      // Clear relations on tip change
                      if (val !== 'revisao') setRevisaoVinculadaId('');
                      if (val !== 'recuperacao_de_conteudo') setFaltaVinculadaId('');
                      
                      // Intelligent Suggestions for Output Destination
                      if (val === 'resumo') {
                        setOutputDestino('novo_material');
                        setNovoMaterialTipo('resumo');
                      } else if (val === 'mapa_mental') {
                        setOutputDestino('novo_material');
                        setNovoMaterialTipo('mapa_mental');
                      } else if (val === 'estudo_novo') {
                        setOutputDestino('somente_sessao');
                      } else if (val === 'revisao') {
                        setOutputDestino('material_existente');
                      }
                    }}
                    className="w-full bg-surface-container border border-outline/50 text-on-surface rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="estudo_novo">Estudo Novo</option>
                    <option value="revisao">Revisão</option>
                    <option value="resumo">Resumo</option>
                    <option value="mapa_mental">Mapa Mental</option>
                    <option value="questoes">Questões</option>
                    <option value="flashcards">Flashcards</option>
                    <option value="simulado">Simulado</option>
                    <option value="recuperacao_de_conteudo">Recuperação de Conteúdo</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                </div>
              </div>

              {/* Título da Sessão */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-on-surface-variant tracking-widest uppercase">Título da Sessão (Opcional)</label>
                <input 
                  type="text" 
                  value={tituloSessao}
                  onChange={(e) => setTituloSessao(e.target.value)}
                  placeholder="Ex: Revisão de Custos, Mapa Mental TCP..."
                  className="w-full bg-surface-container border border-outline/50 text-on-surface placeholder:text-on-surface-variant/40 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Dynamic Context Fields based on Session Type */}
              {tipoSessao === 'revisao' && (
                <div className="space-y-3 p-4 bg-tertiary/5 border border-tertiary/20 rounded-xl animate-in fade-in">
                  <label className="block text-xs font-bold text-tertiary tracking-widest uppercase">Revisão Vinculada (Opcional)</label>
                  <div className="relative group">
                    <select 
                      value={revisaoVinculadaId}
                      onChange={(e) => {
                         const revId = e.target.value;
                         setRevisaoVinculadaId(revId);
                         if (revId) {
                            const rev = revisoesPendentes.find(r => r.id === revId);
                            if (rev && rev.materia_id) setSelectedMateria(rev.materia_id);
                            if (rev && rev.topico_id) setSelectedTopico(rev.topico_id);
                         }
                      }}
                      className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-tertiary focus:ring-4 focus:ring-tertiary/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Nenhuma. Registrando avaliação manual abstrata.</option>
                      {revisoesPendentes.map(r => (
                        <option key={r.id} value={r.id}>{r.nome || 'Revisão Pendente'}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-on-surface-variant">Se vinculada, esta revisão será marcada como concluída e ganhará novos marcadores.</p>
                </div>
              )}

              {tipoSessao === 'recuperacao_de_conteudo' && (
                <div className="space-y-4 p-4 bg-error/5 border border-error/20 rounded-xl animate-in fade-in">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-error tracking-widest uppercase">Falta Pendente (Obrigatório)*</label>
                    <div className="relative group">
                      <select 
                        value={faltaVinculadaId}
                        onChange={(e) => {
                           const fid = e.target.value;
                           setFaltaVinculadaId(fid);
                           if (fid) {
                              const falta = faltasPendentes.find(f => f.id === fid);
                              if (falta && falta.materia_id) setSelectedMateria(falta.materia_id);
                           }
                        }}
                        className="w-full bg-surface-container-lowest border border-error/30 text-on-surface rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-error focus:ring-4 focus:ring-error/10 transition-all appearance-none cursor-pointer"
                        required={tipoSessao === 'recuperacao_de_conteudo'}
                      >
                        <option value="">Selecione a falta para repor</option>
                        {faltasPendentes.map(f => {
                           const mat = materias.find(m => m.id === f.materia_id);
                           return <option key={f.id} value={f.id}>Dia {f.data} - {mat?.nome || 'Matéria Desconhecida'}</option>;
                        })}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-error tracking-widest uppercase">Forma de Recuperação</label>
                    <select
                      value={formaRecuperacao}
                      onChange={(e) => setFormaRecuperacao(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl px-4 py-3 focus:border-error"
                    >
                      <option value="estudo_autonomo">Estudo Autônomo com Material</option>
                      <option value="videoaula">Videoaula de Reposição</option>
                      <option value="mentor_monitoria">Tira-Dúvidas / Monitoria</option>
                      <option value="trabalho_repositivo">Trabalho Repositivo Oficial</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Destino do Output / Material Integration */}
              <div className="space-y-4 pt-4 border-t border-outline/20">
                {modalData?.modo === 'edit' && (() => {
                  let linkedIds = realTimeSession?.linked_material_ids || [];
                  if (realTimeSession?.material_id && linkedIds.length === 0) linkedIds = [realTimeSession.material_id];
                  const mats = materiais.filter(m => linkedIds.includes(m.id));
                  if (mats.length === 0) return null;
                  
                  return (
                    <div className="space-y-3 mb-6">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Materiais Desta Sessão
                      </h4>
                      <div className="space-y-3">
                         {mats.map(mat => {
                           const isPrimary = mat.id === realTimeSession?.primary_material_id;
                           
                           return (
                             <div key={mat.id} className={cn(
                               "p-4 border rounded-xl relative group transition-colors",
                               isPrimary ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-surface-container border-outline/30 hover:border-outline/50"
                             )}>
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                 <h5 className="font-bold text-sm text-on-surface truncate pr-20">{mat.titulo}</h5>
                                 <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                   {isPrimary && (
                                     <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-primary text-on-primary rounded">Principal</span>
                                   )}
                                   <span className={cn(
                                     "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                                     mat.origin_session_id === realTimeSession?.id || mat.criado_a_partir_da_sessao
                                       ? "bg-primary/20 text-primary" 
                                       : "bg-tertiary/20 text-tertiary"
                                   )}>
                                     {(mat.origin_session_id === realTimeSession?.id || mat.criado_a_partir_da_sessao) ? 'Criado na Sessão' : 'Vinculado'}
                                   </span>
                                 </div>
                               </div>
                               <p className="text-xs text-on-surface-variant capitalize mb-3">{mat.tipo?.replace('_', ' ')}</p>
                               
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-outline/10">
                                 {mat.url && (
                                   <a 
                                     href={mat.url} 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-secondary-variant transition-colors"
                                   >
                                     <ExternalLink className="w-3 h-3" /> Acessar
                                   </a>
                                 )}
                                 
                                 <button 
                                   type="button"
                                   onClick={() => { setMaterialToEdit(mat); setMaterialModalOpen(true); }}
                                   className="inline-flex items-center gap-1.5 text-xs font-bold text-tertiary hover:text-tertiary/80 transition-colors"
                                 >
                                   <Edit2 className="w-3 h-3" /> Editar
                                 </button>
                                 
                                 {!isPrimary && (
                                   <button 
                                     type="button"
                                     onClick={async () => {
                                        const { materialService } = await import('@/services/materialService');
                                        await materialService.setPrimaryMaterialForSession(realTimeSession.id, mat.id);
                                     }}
                                     className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-variant transition-colors"
                                   >
                                     <Star className="w-3 h-3" /> Tornar Principal
                                   </button>
                                 )}
  
                                 <button 
                                   type="button"
                                   onClick={async () => {
                                     const linkedCount = mat.linked_session_ids?.length || 1;
                                     if(confirm(`Tem certeza que deseja desvincular este material desta sessão?\n${linkedCount > 1 ? `Ele continuará vinculado a outras ${linkedCount - 1} sessão(ões).` : 'O material continuará existindo na sua biblioteca.'}`)) {
                                        try {
                                          const { materialService } = await import('@/services/materialService');
                                          await materialService.unlinkMaterialFromSession(mat.id, realTimeSession.id);
                                        } catch(e) {}
                                     }
                                   }}
                                   className="inline-flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors"
                                 >
                                   <X className="w-3 h-3" /> Desvincular
                                 </button>
  
                                 <button 
                                   type="button"
                                   onClick={async () => {
                                     if (!user) return;
                                     const linkedCount = mat.linked_session_ids?.length || 1;
                                     if(confirm(`ATENÇÃO: Deseja EXCLUIR este material permanentemente de todo o sistema?\n${linkedCount > 1 ? `Isso removerá o vínculo com OUTRAS ${linkedCount - 1} sessão(ões) além desta.` : ''}`)) {
                                        try {
                                          const { materialService } = await import('@/services/materialService');
                                          await materialService.deleteMaterial(mat.id, user.id);
                                        } catch(e) {}
                                     }
                                   }}
                                   className="inline-flex items-center gap-1.5 text-xs font-bold text-error/80 hover:text-error transition-colors"
                                 >
                                   <Trash2 className="w-3 h-3" /> Excluir do Sistema
                                 </button>
                               </div>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Destino do rastro de estudo</label>
                  <div className="flex bg-surface-container rounded-lg p-1 gap-1">
                    <button 
                      onClick={() => setOutputDestino('somente_sessao')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                        outputDestino === 'somente_sessao' ? "bg-primary text-on-primary shadow-sm" : "hover:bg-surface-container-highest text-on-surface-variant"
                      )}
                    >
                      Somente Sessão
                    </button>
                    <button 
                      onClick={() => setOutputDestino('novo_material')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                        outputDestino === 'novo_material' ? "bg-primary text-on-primary shadow-sm" : "hover:bg-surface-container-highest text-on-surface-variant"
                      )}
                    >
                      Novo Material
                    </button>
                    <button 
                      onClick={() => setOutputDestino('material_existente')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                        outputDestino === 'material_existente' ? "bg-primary text-on-primary shadow-sm" : "hover:bg-surface-container-highest text-on-surface-variant"
                      )}
                    >
                      Vincular Existente
                    </button>
                  </div>
                </div>

                <div className="animate-in slide-in-from-top-2 duration-300">
                  {outputDestino === 'somente_sessao' && (
                    <div className="p-4 bg-surface-container-low border border-outline/10 rounded-xl space-y-3">
                      <p className="text-[10px] text-on-surface-variant font-medium">O rastro de estudo (resumo/notas) ficará salvo apenas no histórico desta sessão.</p>
                      <textarea
                        placeholder="Escreva aqui seu rastro de estudo, insights ou resumo rápido..."
                        className="w-full bg-surface-container-lowest border border-outline/30 text-on-surface rounded-xl p-3 min-h-[100px] text-sm focus:border-primary outline-none transition-all"
                        value={outputDescricao}
                        onChange={(e) => setOutputDescricao(e.target.value)}
                      ></textarea>
                    </div>
                  )}

                  {outputDestino === 'novo_material' && (
                    <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-primary">Título do Material *</label>
                          <input 
                            placeholder="Ex: Resumo sobre Organelas Celulares"
                            className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            value={novoMaterialTitulo}
                            onChange={(e) => setNovoMaterialTitulo(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-primary">Tipo</label>
                          <select 
                            className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-2 text-sm outline-none"
                            value={novoMaterialTipo}
                            onChange={(e) => setNovoMaterialTipo(e.target.value)}
                          >
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-primary">Vincular Aula (Opcional)</label>
                          <select 
                            className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-2 text-sm outline-none"
                            value={novoMaterialAulaId}
                            onChange={(e) => setNovoMaterialAulaId(e.target.value)}
                          >
                            <option value="">Sem Aula</option>
                            {aulas.map(a => (
                              <option key={a.id} value={a.id}>{a.titulo}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {['link', 'pdf', 'video', 'slide', 'outro'].includes(novoMaterialTipo) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-primary">URL / Link do Arquivo {['link'].includes(novoMaterialTipo) ? '*' : '(Opcional)'}</label>
                          <input 
                            placeholder="https://..."
                            className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                            value={novoMaterialUrl}
                            onChange={(e) => setNovoMaterialUrl(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-primary">Conteúdo do Material / Observações</label>
                        <textarea
                          placeholder={['link', 'pdf', 'video', 'slide', 'outro', 'livro'].includes(novoMaterialTipo) ? "Alguma nota importante sobre este material..." : "Digite o conteúdo que será formalizado no novo material..."}
                          className="w-full bg-background border border-primary/20 text-on-surface rounded-lg p-3 min-h-[120px] text-sm focus:border-primary outline-none"
                          value={outputDescricao}
                          onChange={(e) => setOutputDescricao(e.target.value)}
                        ></textarea>
                      </div>
                      <p className="text-[9px] text-primary/70 font-semibold italic">* Ao salvar, um item será criado na sua central de materiais automaticamente.</p>
                    </div>
                  )}

                  {outputDestino === 'material_existente' && (
                    <div className="p-4 bg-surface-container-low border border-outline/10 rounded-xl space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Selecionar Material Existente</label>
                        <div className="relative">
                          <select 
                            value={materialVinculadoId}
                            onChange={(e) => setMaterialVinculadoId(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline/30 text-on-surface rounded-xl pl-4 pr-10 py-2.5 text-sm appearance-none cursor-pointer focus:border-primary outline-none"
                          >
                            <option value="">Selecione um material da sua biblioteca</option>
                            {materiais
                               .filter(m => m.materia_id === selectedMateria)
                               .filter(m => {
                                  const linkedIds = realTimeSession?.linked_material_ids || (realTimeSession?.material_id ? [realTimeSession.material_id] : []);
                                  return !linkedIds.includes(m.id);
                               })
                               .sort((a, b) => {
                                  // Prioritize same topic
                                  if (a.topico_id === selectedTopico && b.topico_id !== selectedTopico) return -1;
                                  if (b.topico_id === selectedTopico && a.topico_id !== selectedTopico) return 1;
                                  return 0;
                               })
                               .map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.titulo} ({m.tipo}) {m.topico_id === selectedTopico ? '⭐ (Mesmo tópico)' : ''}
                                </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Adicionar Nota a este Estudo (Opcional)</label>
                        <textarea
                          placeholder="Algum insight específico desta sessão sobre o material?"
                          className="w-full bg-surface-container-lowest border border-outline/30 text-on-surface rounded-xl p-3 min-h-[80px] text-sm outline-none focus:border-primary transition-all"
                          value={outputDescricao}
                          onChange={(e) => setOutputDescricao(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject & Topic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Matéria *</label>
                  <div className="relative group">
                    <Book className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                    <select 
                      value={selectedMateria}
                      onChange={(e) => {
                        const newMateriaId = e.target.value;
                        setSelectedMateria(newMateriaId);
                        setSelectedTopico('');
                        setNewTopico('');
                        setIsCreatingTopico(false);
                        
                        // Auto-fill professor based on materia
                        if (!userEditedProfessor) {
                          const materiaInfo = materias.find(m => m.id === newMateriaId);
                          if (materiaInfo && materiaInfo.professor) {
                            setProfessor(materiaInfo.professor);
                          } else {
                            setProfessor('');
                          }
                        }
                      }}
                      className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl pl-12 pr-10 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Selecione a matéria</option>
                      {materias.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Tópico</label>
                  {!isCreatingTopico ? (
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                      <select 
                        value={selectedTopico}
                        onChange={(e) => {
                          if (e.target.value === 'NEW') {
                            setIsCreatingTopico(true);
                            setSelectedTopico('');
                          } else {
                            setSelectedTopico(e.target.value);
                          }
                        }}
                        disabled={!selectedMateria}
                        className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl pl-12 pr-10 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione um tópico</option>
                        {topicos.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                        {selectedMateria && <option value="NEW" className="text-primary font-bold">+ Criar novo tópico</option>}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative animate-in slide-in-from-right-2">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                      <input 
                        type="text" 
                        value={newTopico}
                        onChange={(e) => setNewTopico(e.target.value)}
                        placeholder="Nome do novo tópico" 
                        className="w-full bg-surface-container-lowest border border-primary/50 text-on-surface rounded-xl pl-12 pr-16 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          setIsCreatingTopico(false);
                          setNewTopico('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline hover:text-error transition-colors px-2 py-1"
                      >
                        CANCELAR
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Professor Input */}
              <div className="space-y-3">
                 <label className="block text-xs font-bold text-primary tracking-widest uppercase">Professor / Docente</label>
                 <input 
                   type="text"
                   value={professor}
                   onChange={(e) => {
                     setProfessor(e.target.value);
                     setUserEditedProfessor(true);
                   }}
                   placeholder="Nome do professor ou docente"
                   className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                 />
                 {!userEditedProfessor && professor && (
                   <p className="text-[10px] text-on-surface-variant italic">Preenchido automaticamente com base na matéria</p>
                 )}
              </div>

              {/* Time & Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Data do Registro *</label>
                  <input 
                    type="date"
                    value={dataRegistro}
                    onChange={(e) => setDataRegistro(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Tempo Estudado *</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                      <input 
                        type="text" 
                        value={tempo}
                        onChange={handleTempoChange}
                        placeholder="00:00:00" 
                        className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface text-center text-2xl font-bold rounded-xl py-3 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-outline font-bold uppercase pointer-events-none group-focus-within:text-primary transition-colors">HH:MM:SS</span>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty Scale */}
              <div className="space-y-3">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Escala de Dificuldade</label>
                  <div className="flex justify-between gap-1 p-1.5 bg-surface-container-lowest border border-outline/50 rounded-xl max-w-sm">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button 
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={cn(
                          "flex-1 py-2.5 text-sm font-black rounded-lg transition-all duration-300 transform",
                          difficulty === level 
                            ? "bg-primary text-on-primary shadow-lg shadow-primary/30 scale-105" 
                            : "hover:bg-surface-variant text-outline"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
              </div>

              {/* Questions Tracking */}
              {['questoes', 'simulado', 'revisao', 'estudo_novo'].includes(tipoSessao) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-primary tracking-widest uppercase">Métricas de Questões</label>
                    {totalQuestoes && acertos && (
                      <span className="text-xs font-bold text-on-surface-variant">
                        Aproveitamento: <span className="text-primary">{Math.round((parseInt(acertos)/parseInt(totalQuestoes))*100)}%</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6 p-6 bg-surface-container-highest/50 border border-outline/30 rounded-2xl relative overflow-hidden group">
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-primary transition-all group-hover:w-2"></div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Resolvido</label>
                      <input 
                        type="number" 
                        value={totalQuestoes}
                        onChange={(e) => setTotalQuestoes(e.target.value)}
                        placeholder="0" 
                        className="w-full bg-transparent border-none text-on-surface text-3xl font-black focus:ring-0 outline-none placeholder:text-outline/30" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Acertos Confirmados</label>
                      <input 
                        type="number" 
                        value={acertos}
                        onChange={(e) => setAcertos(e.target.value)}
                        placeholder="0" 
                        className="w-full bg-transparent border-none text-tertiary text-3xl font-black focus:ring-0 outline-none placeholder:text-tertiary/30" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Markdown Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-primary tracking-widest uppercase">Insight de Estudo</label>
                  <span className="text-[10px] text-outline font-bold bg-surface-container-low px-2 py-0.5 rounded border border-outline/50 uppercase tracking-tighter">Markdown Ready</span>
                </div>
                <textarea 
                  rows={5} 
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Quais foram os pontos-chave de hoje? Registre insights, dúvidas ou gatilhos mentais..."
                  className="w-full bg-surface-container-lowest border border-outline/50 text-on-surface rounded-2xl p-6 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none font-mono text-sm leading-loose outline-none shadow-inner"
                ></textarea>
              </div>

              {/* Advanced Auto Schedule */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-primary tracking-widest uppercase">Agendar Ciclo de Revisão</label>
                    <p className="text-[10px] text-on-surface-variant font-medium">Selecione os marcos para fixação do conteúdo</p>
                  </div>
                  {selectedIntervals.length > 0 && (
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">
                      {selectedIntervals.length} REVISÕES PROGRAMADAS
                    </span>
                  )}
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-outline/30 space-y-6">
                  {/* Presets */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'nenhuma', label: 'Nenhuma' },
                      { id: 'essencial', label: 'Essencial' },
                      { id: 'padrao', label: 'Padrão' },
                      { id: 'completa', label: 'Completa' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={cn(
                          "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                          preset === p.id 
                            ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20" 
                            : "bg-surface-container-low border-outline/20 text-on-surface-variant hover:border-outline/50"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    {preset === 'personalizada' && (
                      <div className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary/20 border border-secondary text-secondary">
                        Personalizada
                      </div>
                    )}
                  </div>

                  {/* Intervals Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[1, 3, 7, 14, 60, 90].map(days => {
                      const isSelected = selectedIntervals.includes(days);
                      
                      // Intelligent Suggestions logic
                      const totalQ = parseInt(totalQuestoes || '0');
                      const acerts = parseInt(acertos || '0');
                      const perf = totalQ > 0 ? (acerts / totalQ) : 0;
                      
                      // Hard topic / Low perf -> suggest earlier reviews
                      const suggestEarly = (difficulty >= 4 || (totalQ > 0 && perf < 0.6)) && days <= 14;
                      // Easy topic / High perf -> suggest later reviews
                      const suggestLate = (difficulty <= 2 && perf >= 0.8) && days >= 7;
                      
                      const shouldSuggest = suggestEarly || suggestLate;

                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => toggleInterval(days)}
                          className={cn(
                            "relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all active:scale-95 group",
                            isSelected 
                              ? "bg-primary/20 border-primary shadow-inner" 
                              : "bg-surface-container-lowest border-outline/20 hover:border-primary/50"
                          )}
                        >
                          <span className={cn(
                             "text-xl font-black mb-0.5 transition-colors",
                             isSelected ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                          )}>
                            {days}d
                          </span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-tighter",
                            isSelected ? "text-primary/70" : "text-outline"
                          )}>
                            Intervalo
                          </span>

                          {shouldSuggest && !isSelected && (
                             <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full shadow-lg animate-bounce border-2 border-background"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Adaptive Suggestion Box */}
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-dashed border-outline/20">
                     <div className="flex flex-col gap-1">
                       <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed uppercase tracking-wider">
                         Resumo do Agendamento:
                       </p>
                       <p className="text-xs font-medium text-on-surface">
                         {selectedIntervals.length === 0 && !includePreProva ? (
                           <span className="text-error font-bold italic">Nenhuma revisão será criada.</span>
                         ) : (
                           <>
                             {selectedIntervals.length > 0 && (
                               <span>
                                 Serão criadas {selectedIntervals.length} revisões: <span className="font-black text-primary">{selectedIntervals.map(i => `${i}D`).join(', ')}</span>.
                               </span>
                             )}
                             {includePreProva && nearbyExam && (
                               <span className={cn(selectedIntervals.length > 0 && "block mt-1")}>
                                 + <span className="font-black text-secondary">Revisão Pré-Prova</span> em {(() => {
                                    try {
                                      const d = parseValidDate(nearbyExam.data_inicio);
                                      const preDate = new Date(d);
                                      preDate.setDate(preDate.getDate() - 1);
                                      return format(preDate, 'dd/MM');
                                    } catch (e) {
                                      return '??/??';
                                    }
                                  })()}
                               </span>
                             )}
                           </>
                         )}
                       </p>
                     </div>
                  </div>

                  {/* Intelligent Revision Suggestion Section */}
                  {userSettings?.intelligentRevision?.active && (
                    <div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/20 space-y-4 animate-in slide-in-from-bottom-2">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-secondary/20 rounded-lg">
                                <Zap className="w-4 h-4 text-secondary" />
                             </div>
                             <div>
                                <h4 className="text-xs font-black uppercase text-secondary">Revisão por Desempenho</h4>
                                <p className="text-[10px] text-on-surface-variant font-medium">Análise inteligente baseada nesta sessão</p>
                             </div>
                          </div>
                          {JSON.stringify(selectedIntervals) !== JSON.stringify(intelligentSuggestion.intervals) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIntervals(intelligentSuggestion.intervals);
                                setPreset('personalizada');
                              }}
                              className="px-3 py-1 bg-secondary text-on-secondary text-[10px] font-black uppercase rounded-lg hover:opacity-90 transition-all shadow-lg shadow-secondary/20"
                            >
                               Aplicar Sugestão
                            </button>
                          )}
                       </div>

                       <div className="space-y-2">
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border", currentPerf.bg, currentPerf.color, currentPerf.border)}>
                             <CheckCircle2 className="w-3 h-3" />
                             {currentPerf.level === 'sem_dados' ? 'Sem dados de desempenho' : `Desempenho ${currentPerf.label}`}
                          </div>
                          <p className="text-xs font-bold text-on-surface">{intelligentSuggestion.message}</p>
                          <div className="flex items-start gap-2">
                             <div className="w-1 h-1 rounded-full bg-secondary mt-1.5 shrink-0"></div>
                             <p className="text-[10px] text-on-surface-variant leading-relaxed">
                               {intelligentSuggestion.reason} {intelligentSuggestion.intervals.length > 0 && (
                                 <>Marcos sugeridos: <span className="font-bold text-secondary">{intelligentSuggestion.intervals.join(', ')} dias.</span></>
                               )}
                             </p>
                          </div>
                          
                          {currentPerf.level === 'fraco' && (
                            <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
                               <X className="w-3 h-3 text-error" />
                               <span className="text-[9px] font-black text-error uppercase">Recomendação forte: Revisar em 1 dia</span>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {/* Pre-Prova Option */}
                  {nearbyExam && (
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-xl border animate-in slide-in-from-top-2",
                      includePreProva ? "bg-secondary/10 border-secondary/50 shadow-lg shadow-secondary/5" : "bg-surface-container-highest/30 border-outline/10"
                    )}>
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "p-2 rounded-lg",
                           includePreProva ? "bg-secondary text-on-secondary" : "bg-surface-container text-outline"
                         )}>
                            <Plus className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-on-surface">Revisão Pré-Prova</p>
                            <p className="text-[10px] text-on-surface-variant">Existe uma prova de <span className="text-primary font-bold">{materias.find(m => m.id === selectedMateria)?.nome}</span> em {(() => {
                              try {
                                return format(parseValidDate(nearbyExam.data_inicio), 'dd/MM');
                              } catch (e) {
                                return '??/??';
                              }
                            })()}.</p>
                         </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIncludePreProva(!includePreProva)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                          includePreProva ? "bg-secondary text-on-secondary hover:bg-secondary/80" : "bg-surface-container-highest text-on-surface-variant hover:bg-secondary/20 hover:text-secondary"
                        )}
                      >
                        {includePreProva ? 'Ativada' : 'Ativar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        {!showSuccess && (
          <div className="px-8 py-6 bg-background/80 backdrop-blur-md border-t border-outline flex items-center justify-between">
            <button 
              onClick={handleClose} 
              className="text-sm font-bold text-on-surface-variant hover:text-error transition-colors px-4 py-2"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-6">
              <button 
                onClick={handleSave} 
                disabled={loading}
                className={cn(
                  "flex items-center gap-3 px-10 py-4 text-sm font-black rounded-full shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group",
                  loading ? "bg-outline cursor-wait" : "bg-primary text-on-primary hover:shadow-primary/40 hover:-translate-y-0.5"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-5 h-5 fill-current group-hover:rotate-6 transition-transform" />
                )}
                {loading ? 'Sincronizando...' : modalData?.modo === 'edit' ? 'Salvar Alterações' : 'Confirmar e Salvar'}
              </button>
            </div>
          </div>
        )}

      </div>
      
      <ModalNovoMaterial
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setMaterialModalOpen(false);
          setMaterialToEdit(null);
        }}
        materialToEdit={materialToEdit}
        materiaId={selectedMateria || ''}
        topicos={topicos}
        aulas={aulas}
      />
    </div>
  );
}
