import { parseValidDate } from '@/lib/utils';
import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { OcorrenciaGrade } from '@/types/availability';
import { toast } from '@/lib/toast';
import { format,  } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';

interface ModalExcluirFaltaProps {
  isOpen: boolean;
  onClose: () => void;
  faltaToExcluir?: OcorrenciaGrade;
}

export function ModalExcluirFalta({ isOpen, onClose, faltaToExcluir }: ModalExcluirFaltaProps) {
  const [loading, setLoading] = useState(false);
  const [loadingVinculo, setLoadingVinculo] = useState(false);
  const [vinculoInfo, setVinculoInfo] = useState<{ tipo: string; titulo: string; data?: string; isOrphan?: boolean } | null>(null);
  const { user } = useAuth();

  const isRecuperado = React.useMemo(() => {
    if (!faltaToExcluir) return false;
    return (
      faltaToExcluir.status_reposicao === 'recuperado' || 
      faltaToExcluir.status === 'conteudo_recuperado' || 
      !!faltaToExcluir.reposicao_aula_id || 
      !!faltaToExcluir.reposicao_sessao_id || 
      !!faltaToExcluir.reposicao_observacao
    );
  }, [faltaToExcluir]);

  React.useEffect(() => {
    async function checkVinculo() {
       if (!user || !isOpen || !faltaToExcluir || !faltaToExcluir.id) {
          setVinculoInfo(null);
          return;
       }
       setLoadingVinculo(true);
       try {
          let info: any = null;
          // Endpoint might return this info if we implement it, mock for now
          setVinculoInfo(info);
       } catch (err) {
          console.error("Error fetching vinculo:", err);
       } finally {
          setLoadingVinculo(false);
       }
    }
    checkVinculo();
  }, [isOpen, faltaToExcluir, user]);

  if (!isOpen || !faltaToExcluir) return null;

  // Handle standard exact deletion
  const executeDelete = async () => {
    setLoading(true);
    try {
      if (faltaToExcluir.id) {
         await apiClient.delete(`/ocorrencias/${faltaToExcluir.id}`);
         toast.success('Falta excluída com sucesso.');
      }
      onClose();
    } catch (err: any) {
      console.error('Error deleting absence:', err);
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearBackReferences = async () => {
    if (!user || !faltaToExcluir.id) return;
    
    try {
      const { data: aulas } = await apiClient.get(`/aulas?materia_id=${faltaToExcluir.materia_id || ''}`);
      await Promise.all(
        (aulas || [])
          .filter((a: any) => a.reposicao_ocorrencia_id === faltaToExcluir.id)
          .map((a: any) => apiClient.patch(`/aulas/${a.id}`, { reposicao_ocorrencia_id: null }))
      );
    } catch(err) {
      console.warn("Could not clear back references for aulas", err);
    }
  };

  const handleOnlyFalta = async () => {
    setLoading(true);
    try {
      if (faltaToExcluir.id) {
         await apiClient.delete(`/ocorrencias/${faltaToExcluir.id}?cascade=false`);
         toast.success('Falta excluída com sucesso. Recuperação preservada.');
      }
      onClose();
    } catch (err: any) {
      console.error('Error:', err);
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmbos = async () => {
     if (!user) return;
     setLoading(true);
     try {
       if (faltaToExcluir.id) {
          await apiClient.delete(`/ocorrencias/${faltaToExcluir.id}?cascade=true`);
          toast.success('Falta e recuperação(ões) excluídas com sucesso.');
       }
       onClose();
     } catch (err: any) {
       console.error('Error:', err);
       toast.error('Erro ao excluir: ' + err.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-surface border border-outline/10 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-on-surface text-center mb-3 tracking-tight">Excluir Falta</h3>
        
        {vinculoInfo?.isOrphan && (
          <div className="flex items-start gap-3 bg-error/10 text-error p-4 rounded-2xl mb-6 border border-error/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Dados inconsistentes</p>
              <p className="opacity-80">A matéria vinculada a esta falta não existe mais. Você pode excluí-la para limpar seu histórico.</p>
            </div>
          </div>
        )}

        {!isRecuperado ? (
          <div>
            <p className="text-sm text-on-surface-variant text-center mb-6 leading-relaxed">
              Deseja realmente excluir esta falta? Essa ação removerá a falta do histórico e atualizará os contadores.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
               <button 
                 onClick={onClose}
                 disabled={loading}
                 className="px-6 py-3 rounded-xl text-sm font-bold bg-surface-container hover:bg-surface-variant text-on-surface transition-colors w-full sm:w-auto"
               >
                 Cancelar
               </button>
               <button 
                 onClick={executeDelete}
                 disabled={loading}
                 className="px-6 py-3 rounded-xl text-sm font-bold flex-1 transition-all bg-error text-on-error hover:bg-error/90 flex items-center justify-center"
               >
                 {loading ? 'Processando...' : 'Excluir falta'}
               </button>
             </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 bg-warning/10 text-warning p-4 rounded-2xl mb-4">
               <div className="flex items-center gap-3">
                 <AlertCircle className="w-6 h-6 flex-shrink-0" />
                 <p className="text-sm font-medium">Esta falta possui uma recuperação vinculada.</p>
               </div>
               
               {loadingVinculo ? (
                 <p className="text-xs opacity-70 ml-9 animate-pulse">Carregando vínculo...</p>
               ) : vinculoInfo ? (
                 <div className="ml-9 text-xs border border-warning/20 bg-warning/5 rounded-xl p-3">
                   <p className="font-bold opacity-90 mb-1">{vinculoInfo.tipo}</p>
                   <p className="opacity-80 truncate">{vinculoInfo.titulo}</p>
                   {vinculoInfo.data && (
                     <p className="opacity-70 mt-1">{format(parseValidDate(vinculoInfo.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                   )}
                 </div>
               ) : null}
            </div>
            
            <p className="text-sm font-medium text-center text-on-surface-variant mb-4">O que deseja fazer?</p>

            <div className="space-y-3">
               <button 
                 onClick={handleOnlyFalta}
                 disabled={loading}
                 className="w-full text-left p-4 rounded-2xl border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group"
               >
                  <p className="font-bold text-on-surface group-hover:text-primary transition-colors">Excluir apenas a falta e desvincular</p>
                  <p className="text-xs text-on-surface-variant mt-1">Apaga a falta mas mantém a reposição no sistema.</p>
               </button>

               <button 
                 onClick={handleAmbos}
                 disabled={loading}
                 className="w-full text-left p-4 rounded-2xl border border-error/20 hover:border-error/50 hover:bg-error/5 transition-all group"
               >
                  <p className="font-bold text-on-surface group-hover:text-error transition-colors">Excluir falta e recuperação</p>
                  <p className="text-xs text-on-surface-variant mt-1">Apaga a falta e exclui o registro de reposição.</p>
               </button>

               <button 
                 onClick={onClose}
                 disabled={loading}
                 className="w-full text-center p-3 rounded-xl text-sm font-bold bg-surface-container hover:bg-surface-variant text-on-surface transition-colors mt-2"
               >
                 Cancelar
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
