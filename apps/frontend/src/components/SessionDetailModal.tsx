import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Book, FileText, Target, BarChart2, Edit2, Trash2, Link as LinkIcon, ExternalLink, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatDuration } from '@/lib/utils';
// TODO: A refatoração completa deste modal para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { doc, getDoc } from 'firebase/firestore'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessao: any;
  materiaNome: string;
  topicoNome: string;
  onEdit: (sessao: any) => void;
  onDelete: (sessao: any) => void;
  onEditMaterial?: (material: any) => void;
}

export function SessionDetailModal({ 
  isOpen, 
  onClose, 
  sessao, 
  materiaNome, 
  topicoNome,
  onEdit,
  onDelete,
  onEditMaterial
}: SessionDetailModalProps) {
  const { user } = useAuth();
  const [materiaisVinculados, setMateriaisVinculados] = useState<any[]>([]);
  const [loadingMateriais, setLoadingMateriais] = useState(false);

  useEffect(() => {
    let unsubscribes: any[] = [];
    
    async function setupListeners() {
      setLoadingMateriais(true);
      const matIds = sessao?.linked_material_ids || (sessao?.material_id ? [sessao.material_id] : []);
      
      if (matIds.length > 0) {
        try {
          const { onSnapshot, doc } = await import('firebase/firestore');
          
          const resultsMap = new Map();
          
          unsubscribes = matIds.map((mId: string) => {
            return onSnapshot(doc(db, 'materiais', mId), (docSnap) => {
              if (docSnap.exists()) {
                resultsMap.set(mId, { id: docSnap.id, ...docSnap.data() });
              } else {
                resultsMap.set(mId, { id: mId, _removed: true });
              }
              // Convert map to array keeping order
              setMateriaisVinculados(matIds.map((id: string) => resultsMap.get(id)).filter(Boolean));
              if (resultsMap.size >= matIds.length) {
                setLoadingMateriais(false);
              }
            });
          });
        } catch (error) {
          console.error("Error setting up materials listeners", error);
          setLoadingMateriais(false);
        }
      } else {
        setMateriaisVinculados([]);
        setLoadingMateriais(false);
      }
    }

    if (isOpen && sessao) {
      setupListeners();
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isOpen, sessao?.linked_material_ids?.join(','), sessao?.material_id]);

  if (!isOpen || !sessao) return null;

  const data = sessao.data_registro 
    ? new Date(sessao.data_registro + 'T00:00:00') 
    : (sessao.created_at ? (typeof sessao.created_at.toDate === 'function' ? sessao.created_at.toDate() : new Date(sessao.created_at)) : new Date());

  const aproveitamento = sessao.total_questoes > 0 
    ? Math.round((sessao.acertos / sessao.total_questoes) * 100) 
    : 0;

  // Render format
  const sessionFormatada = sessao.tipo?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Sessão Manual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-lg glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-outline flex items-center justify-between bg-surface-container-low/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-on-surface leading-tight">
                {sessao.titulo || 'Detalhes da Sessão'}
              </h3>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-medium">
                {sessionFormatada}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-outline" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-outline tracking-widest flex items-center gap-1">
                <Book className="w-3 h-3" /> Matéria
              </span>
              <p className="text-sm font-bold text-on-surface">{materiaNome || 'Sem Matéria'}</p>
            </div>
            <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-outline tracking-widest flex items-center gap-1">
                <FileText className="w-3 h-3" /> Tópico
              </span>
              <p className="text-sm font-bold text-on-surface">{topicoNome || 'Geral'}</p>
            </div>
            <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-outline tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data
              </span>
              <p className="text-sm font-bold text-on-surface">
                {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-outline tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duração
              </span>
              <p className="text-sm font-bold text-on-surface">
                {sessao.tempo_estudado_hhmmss || formatDuration((sessao.tempo_estudado_minutos || 0) * 60)}
              </p>
            </div>
          </div>

          {/* Material Vinculado */}
          {(sessao.linked_material_ids?.length > 0 || sessao.material_id) && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Materiais Relacionados
              </h4>
              
              {loadingMateriais ? (
                <div className="p-4 border border-outline/10 text-center rounded-xl animate-pulse bg-surface-container-lowest">
                  <p className="text-xs text-on-surface-variant font-medium">Buscando informações dos materiais...</p>
                </div>
              ) : (
                 <div className="space-y-3">
                   {materiaisVinculados.map((mat, idx) => {
                     if (mat._removed) {
                       return (
                         <div key={idx} className="p-4 border border-error/20 bg-error/5 rounded-xl text-center">
                           <p className="text-sm text-error font-medium mb-1">Material Removido</p>
                           <p className="text-xs text-error/70">O material originalmente vinculado à sessão foi apagado do sistema.</p>
                         </div>
                       );
                     }
                     
                     const isPrimary = mat.id === sessao.primary_material_id;
                     
                     return (
                        <div key={mat.id} className={cn(
                          "p-4 border rounded-xl relative group transition-colors",
                          isPrimary ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-surface-container border-outline/30 hover:border-outline/50"
                        )}>
                          <div className="absolute top-4 right-4 flex items-center gap-1.5 flex-wrap justify-end">
                            {isPrimary && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-primary text-on-primary rounded">
                                  Principal
                                </span>
                            )}
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                              mat.origin_session_id === sessao.id || mat.criado_a_partir_da_sessao || sessao.output_destino === 'novo_material'
                                ? "bg-primary/20 text-primary" 
                                : "bg-tertiary/20 text-tertiary"
                            )}>
                              {(mat.origin_session_id === sessao.id || mat.criado_a_partir_da_sessao || sessao.output_destino === 'novo_material') ? 'Criado na Sessão' : 'Vinculado'}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-on-surface mb-1 pr-24">{mat.titulo}</h5>
                          <p className="text-xs text-on-surface-variant capitalize">{mat.tipo?.replace('_', ' ')}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 block border-t pt-3 border-outline/10">
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
                            
                            {onEditMaterial && (
                              <button 
                                onClick={() => { onClose(); onEditMaterial(mat); }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-tertiary hover:text-tertiary/80 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" /> Editar
                              </button>
                            )}

                            {!isPrimary && (
                               <button 
                                 type="button"
                                 onClick={async () => {
                                    const { materialService } = await import('@/services/materialService');
                                    await materialService.setPrimaryMaterialForSession(sessao.id, mat.id);
                                 }}
                                 className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-variant transition-colors"
                               >
                                 <Star className="w-3 h-3" /> Tornar Principal
                               </button>
                            )}

                            <button 
                              onClick={async () => {
                                const linkedCount = mat.linked_session_ids?.length || 1;
                                if(confirm(`Tem certeza que deseja desvincular este material desta sessão?\n${linkedCount > 1 ? `Ele continuará vinculado a outras ${linkedCount - 1} sessão(ões).` : 'O material continuará existindo na sua biblioteca.'}`)) {
                                   try {
                                     const { materialService } = await import('@/services/materialService');
                                     await materialService.unlinkMaterialFromSession(mat.id, sessao.id);
                                     setMateriaisVinculados(prev => prev.filter(p => p.id !== mat.id));
                                   } catch(e) {}
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors"
                            >
                              <X className="w-3 h-3" /> Desvincular
                            </button>

                            <button 
                              onClick={async () => {
                                if (!user) return;
                                const linkedCount = mat.linked_session_ids?.length || 1;
                                if(confirm(`ATENÇÃO: Deseja EXCLUIR este material permanentemente de todo o sistema?\n${linkedCount > 1 ? `Isso removerá o vínculo com OUTRAS ${linkedCount - 1} sessão(ões) além desta.` : ''}`)) {
                                   try {
                                     const { materialService } = await import('@/services/materialService');
                                     await materialService.deleteMaterial(mat.id, user.id);
                                     setMateriaisVinculados(prev => prev.map(p => p.id === mat.id ? { ...p, _removed: true } : p));
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
              )}
            </div>
          )}

          {sessao.output_destino === 'somente_sessao' && sessao.output_produzido && (
             <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Output da Sessão
              </h4>
              <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl relative group">
                  <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-secondary/20 text-secondary">
                    Interno
                  </span>
                  <div className="whitespace-pre-wrap text-sm text-on-surface-variant pr-16">{sessao.output_produzido}</div>
              </div>
            </div>
          )}

          {/* Metrics Section */}
          {(sessao.total_questoes > 0 || sessao.dificuldade) && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Desempenho e Métricas</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-surface-container-highest/50 rounded-xl text-center border border-outline/10">
                  <span className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">Questões</span>
                  <p className="text-xl font-black text-on-surface">{sessao.total_questoes || 0}</p>
                </div>
                <div className="p-3 bg-tertiary/10 rounded-xl text-center border border-tertiary/20">
                  <span className="block text-[10px] text-tertiary font-bold uppercase mb-1">Acertos</span>
                  <p className="text-xl font-black text-tertiary">{sessao.acertos || 0}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl text-center border",
                  aproveitamento >= 70 ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"
                )}>
                  <span className={cn(
                    "block text-[10px] font-bold uppercase mb-1",
                    aproveitamento >= 70 ? "text-success" : "text-warning"
                  )}>Aproveitamento</span>
                  <p className={cn(
                    "text-xl font-black",
                    aproveitamento >= 70 ? "text-success" : "text-warning"
                  )}>{aproveitamento}%</p>
                </div>
              </div>

              {sessao.dificuldade > 0 && (
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">Dificuldade Percebida</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div 
                        key={lvl} 
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors",
                          sessao.dificuldade === lvl 
                            ? "bg-primary border-primary text-on-primary shadow-sm" 
                            : "bg-surface-container-high border-outline/20 text-outline"
                        )}
                      >
                        {lvl}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observations */}
          {sessao.notas && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Observações</h4>
              <div className="p-4 bg-surface-container-lowest border border-outline/30 rounded-xl italic text-sm text-on-surface-variant leading-relaxed">
                "{sessao.notas}"
              </div>
            </div>
          )}

          {/* Origin */}
          <div className="pt-4 flex items-center justify-center border-t border-outline/30">
            <span className="text-[10px] text-outline font-medium px-3 py-1 bg-surface-container-low rounded-full uppercase tracking-tighter">
              Origem: {sessao.origem || 'Registro Direto'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-surface-container-low flex items-center gap-3">
          <button 
            onClick={() => onEdit(sessao)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button 
            onClick={() => onDelete(sessao)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error/10 text-error hover:bg-error/20 border border-error/20 rounded-xl font-bold text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
