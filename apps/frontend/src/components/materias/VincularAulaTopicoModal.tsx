import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Clock, CalendarIcon, CheckCircle, BrainCircuit, Link as LinkIcon, Move, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseValidDate, safeFormat } from '@/lib/utils';

interface VincularAulaTopicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  topico: any;
  aulas: any[];
  topicos: any[];
  onConfirm: (aula: any) => Promise<void>;
  loading?: boolean;
}

export function VincularAulaTopicoModal({ 
  isOpen, 
  onClose, 
  topico, 
  aulas, 
  topicos, 
  onConfirm, 
  loading 
}: VincularAulaTopicoModalProps) {
  const [busca, setBusca] = useState('');
  const [confirmMoveAula, setConfirmMoveAula] = useState<any>(null);

  const aulasFiltradas = useMemo(() => {
    return aulas.filter(aula => {
      // Don't show lessons already in this topic
      if (aula.topico_id === topico?.id) return false;
      
      const searchLower = busca.toLowerCase();
      return (
        aula.titulo.toLowerCase().includes(searchLower) ||
        aula.professor?.toLowerCase().includes(searchLower) ||
        aula.conteudo?.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => parseValidDate(b.data).getTime() - parseValidDate(a.data).getTime());
  }, [aulas, busca, topico]);

  if (!isOpen || !topico) return null;

  const handleLinkClick = (aula: any) => {
    if (aula.topico_id) {
      setConfirmMoveAula(aula);
    } else {
      onConfirm(aula);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel mx-4 rounded-2xl shadow-2xl flex flex-col h-[80vh] md:h-auto md:max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-outline bg-surface-container-low/50">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-secondary" /> 
              Vincular Aula Existente
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Selecione uma aula para vincular ao tópico: <span className="text-secondary font-bold font-mono">{topico.nome}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-outline/50 bg-surface-container-lowest">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Buscar por título, professor ou conteúdo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-surface-container border border-outline rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all shadow-inner"
              autoFocus
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-surface-container-lowest">
          {confirmMoveAula ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in">
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
                <Move className="w-8 h-8 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Mover aula de tópico?</h3>
                <p className="text-sm text-on-surface-variant max-w-md">
                  A aula <strong>"{confirmMoveAula.titulo}"</strong> já está vinculada ao tópico 
                  <span className="text-error font-bold font-mono ml-1 uppercase">
                    {topicos.find(t => t.id === confirmMoveAula.topico_id)?.nome || 'Outro'}
                  </span>.
                  Deseja movê-la para o tópico <strong className="text-secondary">{topico.nome}</strong>?
                </p>
              </div>
              <div className="flex gap-4 w-full max-w-xs">
                <button 
                  onClick={() => setConfirmMoveAula(null)}
                  className="flex-1 px-4 py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onConfirm(confirmMoveAula);
                    setConfirmMoveAula(null);
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Movendo...' : 'Mover'}
                </button>
              </div>
            </div>
          ) : aulasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant/50 italic py-12">
              <BookOpen className="w-12 h-12 mb-3 opacity-20" />
              <p>Nenhuma aula disponível para vincular.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {aulasFiltradas.map((aula) => (
                <button
                  key={aula.id}
                  onClick={() => handleLinkClick(aula)}
                  disabled={loading}
                  className="w-full text-left p-4 bg-surface-container-low hover:bg-surface-container border border-outline/10 hover:border-secondary/50 rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-secondary transition-colors">
                        {aula.titulo}
                      </h4>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${aula.status === 'assistida' ? 'bg-success/10 text-success' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {aula.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {aula.data ? safeFormat(aula.data, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </span>
                      {aula.professor && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {aula.professor}
                        </span>
                      )}
                      {aula.topico_id && (
                        <span className="flex items-center gap-1 text-secondary font-bold">
                          <BrainCircuit className="w-3 h-3" />
                          {topicos.find(t => t.id === aula.topico_id)?.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                      {aula.topico_id ? <Move className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {aula.topico_id ? 'Mover' : 'Vincular'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
