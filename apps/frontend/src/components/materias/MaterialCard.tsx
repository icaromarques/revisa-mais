import React from 'react';
import {
  Video,
  File,
  Link as LinkIcon,
  FileText,
  Book,
  MessageSquare,
  Edit2,
  Trash2,
  ExternalLink,
  BrainCircuit,
  GraduationCap,
  Sparkles,
  Mic,
  Image as ImageIcon,
  FileArchive,
  Globe
} from 'lucide-react';
import { openMaterial, formatFileSize } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface MaterialCardProps {
  key?: any;
  material: any;
  topicos: any[];
  aulas: any[];
  onEdit: (material: any) => void;
  onDelete: (id: string) => void;
}

export function MaterialCard({
  material,
  topicos,
  aulas,
  onEdit,
  onDelete
}: MaterialCardProps) {
  const topico = topicos.find(t => t.id === material.topico_id);
  const aula = aulas.find(a => a.id === material.aula_id);

  const handleOpen = () => {
    openMaterial(material, toast.error);
  };

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(material);
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(material.id);
  };

  const getIcon = () => {
    switch (material.tipo) {
      case 'video':
        return <Video className="w-5 h-5 text-tertiary" />;
      case 'pdf':
        return <File className="w-5 h-5 text-tertiary" />;
      case 'slide':
        return <FileText className="w-5 h-5 text-tertiary" />;
      case 'livro':
        return <Book className="w-5 h-5 text-tertiary" />;
      case 'resumo':
        return <MessageSquare className="w-5 h-5 text-tertiary" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-tertiary" />;
      case 'imagem':
        return <ImageIcon className="w-5 h-5 text-tertiary" />;
      case 'arquivo':
        return <FileArchive className="w-5 h-5 text-tertiary" />;
      default:
        return <LinkIcon className="w-5 h-5 text-tertiary" />;
    }
  };

  const hasLinkOrFile = !!(material.url?.trim() || material.arquivo_url?.trim() || material.drive_file_id);
  const hasTextualContent = !!(material.conteudo?.trim() || material.descricao?.trim());

  return (
    <div className="relative p-4 bg-surface-container-highest rounded-2xl border border-outline/10 hover:border-tertiary/30 transition-all group flex flex-col h-full shadow-sm hover:shadow-md">
        <div className="flex gap-4 items-start mb-4">
        <button
          type="button"
          onClick={handleOpen}
          className="flex gap-4 items-start flex-1 min-w-0 text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-tight group-hover:text-tertiary transition-colors">
              {material.titulo || 'Sem título'}
            </h4>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest text-on-surface-variant bg-surface-container-low">
                {material.tipo}
              </span>

              {material.provider === 'google_drive' && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                  <File className="w-2.5 h-2.5 shrink-0" /> Google Drive
                </span>
              )}
              {material.provider === 'youtube' && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-error/10 text-error flex items-center gap-1">
                  <Video className="w-2.5 h-2.5 shrink-0" /> YouTube
                </span>
              )}
              {material.provider === 'external' && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-surface-container-highest text-on-surface flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 shrink-0" /> Link Externo
                </span>
              )}
              {material.provider === 'text' && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-tertiary/10 text-tertiary flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5 shrink-0" /> Texto
                </span>
              )}

              {material.origem === 'ia' && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-fuchsia-500/10 text-fuchsia-500 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> IA
                </span>
              )}
              
              {material.origin_session_id && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-tertiary/10 text-tertiary flex items-center gap-1">
                  <Book className="w-2.5 h-2.5" /> Origem na Sessão
                </span>
              )}

              {material.arquivo_url && !material.provider && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-primary/10 text-primary flex items-center gap-1 max-w-full">
                  <File className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate" title={material.arquivo_nome}>{material.arquivo_nome || 'Upload'}</span>
                  {material.arquivo_tamanho && <span className="opacity-70 ml-1 shrink-0">({formatFileSize(material.arquivo_tamanho)})</span>}
                </span>
              )}

              {/* Legacy drive info */}
              {material.drive_file_id && !material.provider && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest bg-emerald-500/10 text-emerald-500 flex items-center gap-1 max-w-full">
                  <File className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate" title={material.drive_file_name}>{material.drive_file_name || 'Upload (Drive)'}</span>
                  {material.drive_file_size && <span className="opacity-70 ml-1 shrink-0">({formatFileSize(material.drive_file_size)})</span>}
                </span>
              )}

              {material.linked_session_ids && material.linked_session_ids.length > 0 && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest border border-outline/20 text-on-surface-variant flex items-center gap-1">
                  <LinkIcon className="w-2.5 h-2.5" /> {material.linked_session_ids.length} {material.linked_session_ids.length === 1 ? 'VÍNCULO' : 'VÍNCULOS'}
                </span>
              )}
            </div>
            
            {['link', 'pdf', 'video', 'slide', 'outro'].includes(material.tipo) && !hasLinkOrFile && (material.observacoes?.match(/^https?:\/\//) || material.conteudo?.match(/^https?:\/\//) || material.descricao?.match(/^https?:\/\//)) && (
              <div className="mt-2 text-[9px] font-bold text-error bg-error/10 px-2 py-1 rounded inline-flex items-center gap-1">
                ⚠️ URL salva incorretamente. Edite para corrigir o link.
              </div>
            )}
          </div>
        </button>

        <div className="relative z-30 pointer-events-auto flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-surface-container-low rounded-lg shadow-sm border border-outline/10 p-0.5 shrink-0">
          <button
            type="button"
            onClick={handleEditClick}
            className="relative z-30 pointer-events-auto p-1.5 hover:bg-surface-variant hover:text-primary rounded text-on-surface-variant"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDeleteClick}
            className="relative z-30 pointer-events-auto p-1.5 hover:bg-error/10 hover:text-error rounded text-on-surface-variant"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {material.conteudo && (
        <button
          type="button"
          onClick={handleOpen}
          className="text-left w-full"
        >
          <div className="bg-surface-container-low p-3 pl-4 border-l-2 border-primary/40 rounded-r-xl rounded-bl-sm">
             <p className="text-xs text-on-surface-variant line-clamp-3 mb-1 leading-relaxed whitespace-pre-wrap">
               {material.conteudo}
             </p>
          </div>
        </button>
      )}

      {material.descricao && !material.conteudo && (
        <button
          type="button"
          onClick={handleOpen}
          className="text-left"
        >
          <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed italic">
            "{material.descricao}"
          </p>
        </button>
      )}

      <div className="mt-auto pt-4 border-t border-outline/5 space-y-2">
        {topico && (
          <div className="flex items-center gap-2 text-[10px] text-primary font-bold bg-primary/5 px-2 py-1 rounded-lg">
            <BrainCircuit className="w-3 h-3" />
            <span className="truncate">{topico.nome}</span>
          </div>
        )}

        {aula && (
          <div className="flex items-center gap-2 text-[10px] text-tertiary font-bold bg-tertiary/5 px-2 py-1 rounded-lg">
            <GraduationCap className="w-3 h-3" />
            <span className="truncate">{aula.titulo}</span>
          </div>
        )}

        {(hasLinkOrFile || hasTextualContent) && (
          <button
            type="button"
            onClick={handleOpen}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-tertiary/10 text-tertiary rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-tertiary group-hover:text-on-tertiary transition-all"
          >
            {material.tipo === 'audio' ? 'Abrir Áudio' : 
             material.tipo === 'pdf' ? 'Abrir PDF' :
             material.tipo === 'slide' ? 'Abrir Slide' :
             material.tipo === 'video' ? 'Ver Vídeo' :
             material.tipo === 'imagem' ? 'Ver Imagem' :
             material.tipo === 'livro' ? 'Ver Livro' :
             hasTextualContent && !hasLinkOrFile ? 'Ler Conteúdo' : 'Acessar Recurso'} {hasLinkOrFile && <ExternalLink className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
