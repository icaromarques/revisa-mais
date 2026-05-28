import React, { useState } from 'react';
import { BookOpen, Search, Filter, Plus, CalendarIcon, BrainCircuit, File, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseValidDate, safeFormat } from '@/lib/utils';

interface AulasTabProps {
  aulas: any[];
  topicos: any[];
  materiais: any[];
  openNovaAula: () => void;
  openEditAula: (aula: any) => void;
  openDetalheAula: (aula: any) => void;
  onVincularTopico?: (aula: any, topicoId: string | null) => void;
}

export function AulasTab({
  aulas,
  topicos,
  materiais,
  openNovaAula,
  openEditAula,
  openDetalheAula,
  onVincularTopico
}: AulasTabProps) {
  const [aulaSearch, setAulaSearch] = useState('');
  const [aulaFiltroStatus, setAulaFiltroStatus] = useState('');
  const [aulaFiltroTopico, setAulaFiltroTopico] = useState('');
  const [vincularOpenId, setVincularOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="glass-panel rounded-2xl overflow-hidden h-fit flex flex-col">
        <div className="p-6 border-b border-outline flex flex-col md:flex-row md:justify-between md:items-center bg-surface-container-low/50 gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-on-surface"><BookOpen className="w-6 h-6 text-secondary" /> Aulas da Matéria</h3>
            <p className="text-sm text-on-surface-variant mt-1">Sua central de estudo teórico: anotações, materiais, dúvidas e revisões.</p>
          </div>
          <button 
            onClick={openNovaAula} 
            className="shrink-0 text-sm font-bold bg-secondary text-on-secondary px-5 py-2.5 rounded-xl hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Aula
          </button>
        </div>
        
        <div className="p-4 border-b border-outline/50 bg-surface-container-lowest flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Buscar aula por título, conteúdo ou professor..."
              value={aulaSearch}
              onChange={(e) => setAulaSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all placeholder:text-on-surface-variant/50"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <select
                value={aulaFiltroStatus}
                onChange={(e) => setAulaFiltroStatus(e.target.value)}
                className="bg-surface-container border border-outline rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all appearance-none cursor-pointer text-on-surface-variant min-w-[140px]"
              >
                <option value="">Todos os status</option>
                <option value="assistida">Assistidas</option>
                <option value="pendente">Pendentes</option>
                <option value="revisar">Preciso Revisar</option>
                <option value="incompleta">Incompletas</option>
              </select>
            </div>
            <div className="relative hidden md:block">
              <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <select
                value={aulaFiltroTopico}
                onChange={(e) => setAulaFiltroTopico(e.target.value)}
                className="bg-surface-container border border-outline rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all appearance-none cursor-pointer text-on-surface-variant max-w-[200px] truncate"
              >
                <option value="">Todos os tópicos</option>
                {topicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
            {aulas.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-on-surface-variant" />
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">Nenhuma aula registrada</h4>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">Comece a registrar suas aulas para organizar seus estudos e planejar suas revisões de forma inteligente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {aulas
                  .filter(a => !aulaSearch || a.titulo.toLowerCase().includes(aulaSearch.toLowerCase()) || a.conteudo?.toLowerCase().includes(aulaSearch.toLowerCase()) || a.professor?.toLowerCase().includes(aulaSearch.toLowerCase()))
                  .filter(a => !aulaFiltroStatus || a.status === aulaFiltroStatus)
                  .filter(a => !aulaFiltroTopico || a.topico_id === aulaFiltroTopico)
                  .sort((a,b) => parseValidDate(b.data).getTime() - parseValidDate(a.data).getTime())
                  .map(aula => (
                  <div key={aula.id} onClick={() => openDetalheAula(aula)} className={`group relative bg-surface-container-highest rounded-2xl cursor-pointer hover:bg-surface-variant border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col min-h-[220px] ${aula.status === 'assistida' ? 'border-success/30 hover:border-success/50' : aula.status === 'revisar' ? 'border-error/30 hover:border-error/50' : aula.status === 'incompleta' ? 'border-tertiary/30 hover:border-tertiary/50' : 'border-outline/10 hover:border-outline/40'}`}>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h4 className="font-bold text-lg text-on-surface line-clamp-2 leading-tight group-hover:text-secondary transition-colors">{aula.titulo}</h4>
                        <span className={`shrink-0 text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${aula.status === 'assistida' ? 'bg-success/10 text-success' : aula.status === 'revisar' ? 'bg-error/10 text-error' : aula.status === 'incompleta' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-low text-on-surface-variant'}`}>{aula.status}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface-variant font-medium mb-3">
                        <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {(aula.data && !isNaN(parseValidDate(aula.data).getTime())) ? safeFormat(aula.data, "dd/MM/yyyy", {locale:ptBR}) : '?'} {aula.horario ? `às ${aula.horario}` : ''}</span>
                        {aula.professor && <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Prof: {aula.professor}</span>}
                      </div>

                      {/* Tópico e Vincular */}
                      <div className="mb-3 flex flex-wrap gap-2 items-center min-h-[32px]">
                        {aula.topico_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-container-lowest border border-outline/20 rounded-md text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                            <BrainCircuit className="w-3 h-3 text-primary" />
                            {topicos.find(t => t.id === aula.topico_id)?.nome}
                          </span>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant italic font-medium px-1">Sem tópico vinculado</span>
                        )}

                        <div className="relative ml-auto">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setVincularOpenId(vincularOpenId === aula.id ? null : aula.id); }}
                            className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Trocar/Vincular Tópico"
                          >
                            <BrainCircuit className="w-3.5 h-3.5" />
                          </button>
                          
                          {vincularOpenId === aula.id && (
                            <div 
                              className="absolute right-0 bottom-full mb-2 w-56 bg-surface-container-highest rounded-xl shadow-2xl border border-outline/20 py-2 z-50 overflow-y-auto max-h-64"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="px-3 py-1.5 border-b border-outline/10 mb-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Mover para Tópico</p>
                              </div>
                              <button 
                                onClick={() => { onVincularTopico?.(aula, null); setVincularOpenId(null); }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-surface-variant transition-colors flex items-center gap-2 ${!aula.topico_id ? 'text-primary' : 'text-on-surface'}`}
                              >
                                {!aula.topico_id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />} Ninguém (Sem Tópico)
                              </button>
                              {topicos.map(t => (
                                <button 
                                  key={t.id}
                                  onClick={() => { onVincularTopico?.(aula, t.id); setVincularOpenId(null); }}
                                  className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-surface-variant transition-colors flex items-center gap-2 ${aula.topico_id === t.id ? 'text-primary' : 'text-on-surface'}`}
                                >
                                  {aula.topico_id === t.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />} {t.nome}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {aula.resumo_rapido ? (
                        <p className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed mt-auto relative before:absolute before:-left-3 before:top-1 before:bottom-1 border-l-[3px] border-secondary/30 pl-3">{aula.resumo_rapido}</p>
                      ) : aula.conteudo ? (
                        <p className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed mt-auto">{aula.conteudo}</p>
                      ) : (
                        <p className="text-sm text-on-surface-variant/50 italic mt-auto">Sem descrição.</p>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-outline/10 flex justify-between items-center bg-surface-container-lowest/30 rounded-b-2xl">
                      <div className="flex gap-3">
                          {materiais.some(m => m.aula_id === aula.id) && (
                            <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                              <File className="w-3 h-3" /> {materiais.filter(m => m.aula_id === aula.id).length} mat.
                            </span>
                          )}
                          {aula.duvidas && (
                            <span className="text-[10px] font-bold text-tertiary flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> c/ dúvidas
                            </span>
                          )}
                      </div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Abrir Detalhes <ArrowLeft className="w-3 h-3 rotate-180" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
