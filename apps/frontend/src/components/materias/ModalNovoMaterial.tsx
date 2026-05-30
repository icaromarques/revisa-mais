import React, { useState, useEffect } from 'react';
import { X, FileText, Link as LinkIcon, Video, File, Globe, Book, MessageSquare, Save, Mic, Image as ImageIcon, FileArchive, Info, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// TODO: A refatoração completa deste modal para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { apiClient } from '@/lib/api';
import { db } from '@/lib/firebase'; // TODO: Refatorar no próximo passo
import { getDocs, query, collection, where } from 'firebase/firestore'; // TODO: Refatorar no próximo passo
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { materialService } from '@/services/materialService';
import { prepareMaterialLinkMetadata } from '@/lib/materialLinks';
import { openMaterial } from '@/lib/utils';

interface ModalNovoMaterialProps {
  isOpen: boolean;
  onClose: () => void;
  materialToEdit?: any;
  materiaId: string;
  topicos: any[];
  aulas: any[];
  defaultTopicoId?: string;
  defaultAulaId?: string;
}

const MATERIAL_TYPES = [
  { id: 'link', label: 'Link Web', icon: Globe },
  { id: 'pdf', label: 'PDF', icon: File },
  { id: 'video', label: 'Vídeo', icon: Video },
  { id: 'slide', label: 'Slides', icon: FileText },
  { id: 'audio', label: 'Áudio / Gravação', icon: Mic },
  { id: 'imagem', label: 'Imagem', icon: ImageIcon },
  { id: 'documento', label: 'Documento', icon: FileText },
  { id: 'livro', label: 'Livro', icon: Book },
  { id: 'resumo', label: 'Resumo', icon: MessageSquare },
  { id: 'anotacao', label: 'Anotação', icon: MessageSquare },
  { id: 'outro', label: 'Outro', icon: LinkIcon },
];

export function ModalNovoMaterial({ 
  isOpen, 
  onClose, 
  materialToEdit, 
  materiaId, 
  topicos, 
  aulas,
  defaultTopicoId = '',
  defaultAulaId = ''
}: ModalNovoMaterialProps) {
  const { user } = useAuth();
  const [sessoesDisponiveis, setSessoesDisponiveis] = useState<any[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDriveHelp, setShowDriveHelp] = useState(false);
  
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'link',
    url: '',
    descricao: '', // this acts as both description and textual content
    topico_id: '',
    aula_id: '',
    origem: 'manual_materiais'
  });

  useEffect(() => {
    async function fetchSessoes() {
      if (!user || !materiaId) return;
      try {
        const q = query(
          collection(db, 'sessoes'), 
          where('user_id', '==', user.id),
          where('materia_id', '==', materiaId)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // sort by most recent 
        fetched.sort((a: any, b: any) => {
           const da = new Date(a.data_registro || a.created_at || 0).getTime();
           const dbDate = new Date(b.data_registro || b.created_at || 0).getTime();
           return dbDate - da;
        });
        setSessoesDisponiveis(fetched);
      } catch (err) {
        console.error("Failed to fetch sessoes for material modal", err);
      }
    }
    if (isOpen) {
      fetchSessoes();
    }
  }, [isOpen, materiaId, user]);

  useEffect(() => {
    if (materialToEdit) {
      // In case old material has arquivo_url instead of url
      const urlToUse = materialToEdit.url || materialToEdit.arquivo_url || '';
      
      setForm({
        titulo: materialToEdit.titulo || '',
        tipo: materialToEdit.tipo || 'link',
        url: urlToUse,
        descricao: materialToEdit.conteudo || materialToEdit.descricao || materialToEdit.observacoes || '',
        topico_id: materialToEdit.topico_id || '',
        aula_id: materialToEdit.aula_id || '',
        origem: materialToEdit.origem || 'manual_materiais'
      });
      setSelectedSessions(materialToEdit.linked_session_ids || []);
      setShowDriveHelp(false);
    } else {
      setForm({
        titulo: '',
        tipo: 'link',
        url: '',
        descricao: '',
        topico_id: defaultTopicoId || '',
        aula_id: defaultAulaId || '',
        origem: 'manual_materiais'
      });
      setSelectedSessions([]);
      setShowDriveHelp(false);
    }
  }, [materialToEdit, isOpen, defaultTopicoId, defaultAulaId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !materiaId) return;

    setLoading(true);

    try {
      const payload: any = {
        user_id: user.id,
        materia_id: materiaId,
        titulo: form.titulo,
        tipo: form.tipo,
        conteudo: form.descricao, 
        observacoes: form.descricao, 
        topico_id: form.topico_id || null,
        aula_id: form.aula_id || null,
        linked_session_ids: selectedSessions
      };

      if (form.url.trim()) {
         const meta = prepareMaterialLinkMetadata(form.url.trim());
         if (meta) {
            payload.url = meta.url;
            payload.provider = meta.provider;
            payload.source_kind = meta.source_kind;
            payload.drive_file_id = meta.drive_file_id;
            payload.drive_preview_url = meta.drive_preview_url;
            payload.drive_open_url = meta.drive_open_url;
         } else {
             payload.url = form.url;
         }
      } else if (payload.conteudo && ['resumo', 'anotacao'].includes(payload.tipo)) {
         payload.source_kind = 'text';
         payload.provider = 'text';
      }

      if (materialToEdit) {
        await materialService.updateMaterial(materialToEdit.id, payload);

        // Sync bidirectional relations: Find removed sessions
        const oldSessions = materialToEdit.linked_session_ids || [];
        const added = selectedSessions.filter(s => !oldSessions.includes(s));
        const removed = oldSessions.filter((s: string) => !selectedSessions.includes(s));
        
        for (const addedId of added) { await materialService.linkMaterialToSession(materialToEdit.id, addedId); }
        for (const removedId of removed) { await materialService.unlinkMaterialFromSession(materialToEdit.id, removedId); }
        
        toast.success("Material atualizado!");
      } else {
        const newMatId = await materialService.createMaterial(payload);
        if (newMatId) {
           for (const sessionId of selectedSessions) {
               await materialService.linkMaterialToSession(newMatId, sessionId);
           }
        }
        toast.success("Material criado com sucesso!");
      }
      onClose();
    } catch (error: any) {
      console.error("Error submitting material:", error);
      toast.error(error.message || "Erro ao salvar material. Cole um link válido ou verifique os campos.");
    } finally {
      setLoading(false);
    }
  };

  const getUrlPlaceholder = () => {
     switch (form.tipo) {
         case 'audio': return "Cole aqui o link do áudio no Google Drive...";
         case 'pdf': return "Cole aqui o link do PDF no Google Drive...";
         case 'slide': return "Cole aqui o link dos slides...";
         case 'imagem': return "Cole aqui o link da imagem...";
         case 'video': return "Cole aqui o link do vídeo (YouTube, Drive)...";
         default: return "https://...";
     }
  };
  
  const linkMetadata = form.url.trim() ? prepareMaterialLinkMetadata(form.url.trim()) : null;

  const isSubmitDisabled = loading || 
        !form.titulo.trim() || 
        ((!form.url.trim() && !materialToEdit?.arquivo_url && !materialToEdit?.drive_file_id) && 
        (['pdf', 'slide', 'imagem', 'video', 'link', 'audio', 'documento', 'livro', 'outro'].includes(form.tipo)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline bg-surface-container-low/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-5 h-5 text-tertiary" /> 
              {materialToEdit ? 'Editar Material' : 'Novo Material'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              {materialToEdit ? 'Atualize as informações do seu recurso.' : 'Adicione links, arquivos ou resumos ao seu acervo.'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
            {/* Tipo de Material */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-3 block">Tipo de Recurso</label>
            <div className="grid grid-cols-4 gap-2">
              {MATERIAL_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: type.id })}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all gap-1.5 ${
                    form.tipo === type.id 
                      ? 'bg-tertiary/10 border-tertiary text-tertiary shadow-lg shadow-tertiary/10' 
                      : 'bg-surface-container border-outline/20 text-on-surface-variant hover:border-tertiary/50'
                  }`}
                  title={type.label}
                >
                  <type.icon className="w-5 h-5" />
                  <span className="text-[8px] font-bold uppercase truncate w-full text-center px-1">{type.label.split(' / ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dados Básicos */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Título do Material *</label>
              <input
                type="text"
                required
                placeholder="Ex: Resumo de Direito Civil - Cap 1"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tertiary/40 transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">URL / Link externo {!['resumo', 'anotacao'].includes(form.tipo) && '*'}</label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  placeholder={getUrlPlaceholder()}
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tertiary/40 transition-all font-mono"
                />
              </div>
              {linkMetadata && (
                <div className="flex gap-2 mt-2 px-1">
                  {linkMetadata.provider === 'google_drive' && (
                     <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"><File className="w-3 h-3" /> Google Drive detectado</span>
                  )}
                  {linkMetadata.provider === 'youtube' && (
                     <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-full flex items-center gap-1"><Video className="w-3 h-3" /> YouTube detectado</span>
                  )}
                  {linkMetadata.provider === 'external' && form.url.length > 5 && (
                     <span className="text-[10px] font-bold bg-surface-container-highest text-on-surface px-2 py-0.5 rounded-full flex items-center gap-1"><Globe className="w-3 h-3" /> Link Externo</span>
                  )}
                </div>
              )}
            </div>
            
            {['pdf', 'slide', 'imagem', 'audio', 'documento', 'livro'].includes(form.tipo) && (
              <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4 mt-2">
                 <h4 className="text-xs font-bold text-tertiary flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Arquivos pelo Google Drive</h4>
                 <p className="text-[11px] text-on-surface-variant leading-relaxed mb-3">
                   Envie seu arquivo para o Google Drive e cole aqui o link compartilhável. O Revisa+ salva o acesso ao material sem ocupar armazenamento interno ou exigir downloads.
                 </p>
                 <button type="button" onClick={() => setShowDriveHelp(!showDriveHelp)} className="text-[10px] font-bold text-tertiary flex items-center gap-1 hover:underline">
                   <HelpCircle className="w-3 h-3" /> Como pegar o link do Drive?
                 </button>
                 
                 {showDriveHelp && (
                   <ol className="list-decimal list-inside text-[10px] text-on-surface-variant mt-3 space-y-1 ml-1">
                     <li>Abra o arquivo no seu Google Drive.</li>
                     <li>Clique no botão <strong>Compartilhar</strong>.</li>
                     <li>Altere o Acesso Geral para <strong>"Qualquer pessoa com o link"</strong>.</li>
                     <li>Clique em <strong>Copiar link</strong> e cole no campo acima.</li>
                   </ol>
                 )}
              </div>
            )}
            
            {/* Descrição / Conteúdo Textual */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                 {['resumo', 'anotacao'].includes(form.tipo) ? 'Conteúdo da Anotação / Resumo' : 'Observações'}
                 {['resumo', 'anotacao'].includes(form.tipo) && '*'}
              </label>
              <textarea
                placeholder={['resumo', 'anotacao'].includes(form.tipo) ? "Escreva ou cole seu resumo aqui..." : "Alguma nota importante sobre este material..."}
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tertiary/40 transition-all min-h-[100px] resize-y"
              />
            </div>
            
          </div>

          {/* Vínculos */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Vincular Tópico</label>
                <select
                  value={form.topico_id}
                  onChange={e => setForm({ ...form, topico_id: e.target.value })}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tertiary/40 transition-all appearance-none font-medium text-on-surface"
                >
                  <option value="">Sem Tópico</option>
                  {topicos.map(t => (
                     <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Vincular Aula</label>
                <select
                  value={form.aula_id}
                  onChange={e => setForm({ ...form, aula_id: e.target.value })}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tertiary/40 transition-all appearance-none font-medium text-on-surface"
                >
                  <option value="">Sem Aula</option>
                  {aulas.map(a => (
                     <option key={a.id} value={a.id}>{a.titulo}</option>
                  ))}
                </select>
              </div>
            </div>

            {sessoesDisponiveis.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Sessões Relacionadas</label>
                <div className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                   {sessoesDisponiveis.map(s => {
                       const isOrigin = materialToEdit?.origin_session_id === s.id;
                       const isLinked = selectedSessions.includes(s.id);
                       return (
                         <label key={s.id} className={cn(
                           "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                           isLinked ? "bg-tertiary/5 border-tertiary/20" : "hover:bg-outline/5"
                         )}>
                            <input 
                               type="checkbox" 
                               className="w-4 h-4 text-tertiary focus:ring-tertiary border-outline/30 rounded cursor-pointer"
                               checked={isLinked}
                               onChange={(e) => {
                                  if (e.target.checked) setSelectedSessions([...selectedSessions, s.id]);
                                  else setSelectedSessions(selectedSessions.filter(id => id !== s.id));
                               }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-on-surface block truncate">{s.titulo}</span>
                              <div className="flex items-center gap-1.5 mt-0.5 mt-1">
                                {isOrigin && (
                                  <span className="text-[8px] font-black uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded">Sessão de Origem</span>
                                )}
                                {isLinked && !isOrigin && (
                                  <span className="text-[8px] font-black uppercase bg-tertiary/20 text-tertiary px-1.5 py-0.5 rounded">Vinculada</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
                              {s.data_registro ? new Date(s.data_registro + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : ''}
                            </span>
                         </label>
                       );
                   })}
                </div>
              </div>
            )}
            
          </div>

          </div>
          
          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-outline/10 bg-surface-container-low shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-black uppercase tracking-widest text-on-surface-variant transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 px-4 py-3 bg-tertiary text-on-tertiary hover:bg-tertiary/90 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-tertiary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-on-tertiary/30 border-t-on-tertiary rounded-full animate-spin" />
              ) : (
                <><Save className="w-4 h-4" /> {materialToEdit ? 'Salvar' : 'Criar Material'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
