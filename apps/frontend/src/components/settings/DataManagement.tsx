import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  ChevronRight,
  CheckCircle2,
  X,
  FileJson,
  Calendar,
  BookOpen,
  ClipboardList,
  History,
  Lightbulb,
  CheckSquare,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService, ResetModule, ResetImpact } from '@/services/dataService';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export function DataManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState<{ open: boolean; module: ResetModule | null }>({ open: false, module: null });
  const [impact, setImpact] = useState<ResetImpact | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Integrity State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ResetImpact | any | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    if (resetModal.open && resetModal.module && user) {
      loadImpact(resetModal.module);
    }
  }, [resetModal.open, resetModal.module, user]);

  const loadHealth = async () => {
    if (!user) return;
    setIsScanning(true);
    try {
      const { integrityService } = await import('@/services/integrityService');
      const result = await integrityService.runIntegrityScan(user.id);
      setScanResult(result);
      if (result.issuesFound === 0) {
        toast.success("Nenhum problema de integridade encontrado!");
      } else {
        toast.info(`${result.issuesFound} problemas de dados detectados.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao escanear integridade.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRepair = async () => {
    if (!user || !scanResult) return;
    setIsRepairing(true);
    try {
      const { integrityService } = await import('@/services/integrityService');
      const count = await integrityService.repairIssues(user.id, scanResult.issues);
      toast.success(`${count} problemas corrigidos com sucesso!`);
      // Re-scan to update UI
      loadHealth();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao reparar dados.");
    } finally {
      setIsRepairing(false);
    }
  };

  const loadImpact = async (module: ResetModule) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getResetImpact(user.id, module);
      setImpact(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar impacto do reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!user || !resetModal.module) return;

    if (resetModal.module === 'total' && confirmationText.toUpperCase() !== 'RECOMEÇAR') {
      toast.error("Por favor, digite RECOMEÇAR para confirmar.");
      return;
    }

    setLoading(true);
    try {
      await dataService.resetData(user.id, resetModal.module);
      toast.success(resetModal.module === 'total' ? "Sistema resetado com sucesso!" : "Módulo limpo com sucesso!");
      setResetModal({ open: false, module: null });
      setConfirmationText('');
      // Force a slight delay or window reload if necessary, but the listeners should pick it up
    } catch (e) {
      console.error(e);
      toast.error("Erro ao realizar o reset dos dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const json = await dataService.exportUserData(user.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revisamais_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar dados.");
    } finally {
      setIsExporting(false);
    }
  };

  const modules = [
    { id: 'materias', label: 'Matérias e Conteúdo', icon: BookOpen, desc: 'Apaga matérias, tópicos, aulas e faltas.' },
    { id: 'sessoes', label: 'Histórico de Estudo', icon: History, desc: 'Limpa todas as sessões e cronômetros.' },
    { id: 'revisoes', label: 'Agendamentos de Revisão', icon: RefreshCw, desc: 'Remove todas as revisões pendentes e concluídas.' },
    { id: 'flashcards', label: 'Flashcards e Decks', icon: Lightbulb, desc: 'Apaga todos os baralhos e cartões.' },
    { id: 'questoes', label: 'Simulados e Questões', icon: CheckSquare, desc: 'Limpa banco de questões e tentativas.' },
    { id: 'resumos', label: 'Resumos', icon: ClipboardList, desc: 'Remove todos os seus resumos manuais e de IA.' },
    { id: 'agenda', label: 'Grade e Calendário', icon: Calendar, desc: 'Limpa grade fixa e eventos manuais.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="header">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Gerenciamento de Dados</h3>
        <p className="text-sm text-on-surface-variant">Controle total sobre suas informações e privacidade no Revisa+</p>
      </div>

      {/* Backup Section */}
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight">Exportar meus dados</h4>
            <p className="text-[10px] text-on-surface-variant font-medium">Baixe uma cópia completa de todos os seus registros em formato JSON para backup.</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? 'Processando...' : 'Exportar JSON'}
        </button>
      </div>

      {/* Data Health Section */}
      <div className="p-6 bg-surface-container-low border border-outline/20 rounded-[24px] space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/20 shrink-0">
              <Shield className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight">Saúde dos Dados</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Verifique e corrija automaticamente vínculos órfãos e inconsistências relacionais.</p>
            </div>
          </div>
          <button 
            onClick={loadHealth}
            disabled={isScanning}
            className="w-full sm:w-auto px-6 py-3 bg-secondary text-on-secondary rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isScanning ? 'Escaneando...' : 'Escanear Integridade'}
          </button>
        </div>

        {scanResult && scanResult.issuesFound > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-warning/5 border border-warning/20 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Inconsistências Detectadas: {scanResult.issuesFound}</span>
              </div>
              {scanResult.repairableCount > 0 && (
                <button 
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className="px-4 py-2 bg-warning text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isRepairing ? 'Corrigindo...' : `Reparar ${scanResult.repairableCount} Problemas`}
                </button>
              )}
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {scanResult.issues.map((issue: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1 shrink-0",
                    issue.isRepairable ? "bg-warning" : "bg-error"
                  )} />
                  <div className="text-[9px] leading-tight">
                    <p className="font-bold text-on-surface uppercase tracking-tighter opacity-80">{issue.collection} • {issue.type}</p>
                    <p className="text-on-surface-variant font-medium mt-0.5">{issue.description}</p>
                    <p className="text-[8px] opacity-40 font-mono mt-1">ID: {issue.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {scanResult && scanResult.issuesFound === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 bg-success/5 border border-success/10 rounded-2xl text-success"
          >
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-[11px] font-bold uppercase tracking-tight">Status: Dados íntegros. Nenhuma falha relacional detectada.</p>
          </motion.div>
        )}
      </div>

      {/* Partial Reset Section */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase text-outline tracking-widest px-1">Limpeza por Módulo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setResetModal({ open: true, module: mod.id as ResetModule })}
              className="flex items-center justify-between p-4 bg-surface-container-low/30 rounded-2xl border border-outline/30 hover:border-error/30 hover:bg-error/5 transition-all group group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-error/10 transition-colors">
                  <mod.icon className="w-5 h-5 text-on-surface-variant group-hover:text-error transition-colors" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-black uppercase tracking-tight">{mod.label}</h5>
                  <p className="text-[9px] text-on-surface-variant line-clamp-1">{mod.desc}</p>
                </div>
              </div>
              <Trash2 className="w-4 h-4 text-outline group-hover:text-error transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Total Reset Section */}
      <div className="p-8 border border-error/20 bg-error/5 rounded-[32px] space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center border border-error/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight text-error">Recomeçar do Zero</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium mt-1">
              Esta ação apagará <strong>todos</strong> os seus dados permanentemente. 
              Sua conta permanecerá, mas todas as matérias, sessões, flashcards e configurações serão resetados para o estado original.
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setResetModal({ open: true, module: 'total' })}
          className="w-full py-4 bg-error text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-error/90 transition-all shadow-lg shadow-error/20 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Apagar Tudo e Resetar Sistema
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {resetModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-overlay-scrim backdrop-blur-sm"
              onClick={() => setResetModal({ open: false, module: null })}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-elevated rounded-[32px] border border-outline/20 p-8 shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-error/10 blur-[100px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-error/10 blur-[100px] rounded-full" />

              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center border border-error/20">
                  <AlertTriangle className="w-6 h-6 text-error" />
                </div>
                <button 
                  onClick={() => setResetModal({ open: false, module: null })}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {resetModal.module === 'total' ? 'Confirmar Reset Total' : 'Confirmar Limpeza de Módulo'}
                </h3>
                <p className="text-sm text-on-surface-variant">
                  {resetModal.module === 'total' 
                    ? 'Esta ação é irreversível e apagará cada dado da sua jornada acadêmica.'
                    : `Você está prestes a apagar todos os dados do módulo: ${modules.find(m => m.id === resetModal.module)?.label}.`}
                </p>

                {/* Impact Info */}
                <div className="p-5 bg-error/5 border border-error/10 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-error tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Impacto Estimado
                  </h4>
                  {loading ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Calculando volume de dados...
                    </div>
                  ) : impact ? (
                    <div className="grid grid-cols-2 gap-2">
                       {(Object.entries(impact.counts) as [string, number][]).map(([key, count]) => (
                         count > 0 && (
                           <div key={key} className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                             <CheckCircle2 className="w-3 h-3 text-error/50" /> {count} {key.replace('_', ' ')}
                           </div>
                         )
                       ))}
                       {impact.totalCount === 0 && (
                         <p className="text-[10px] font-bold text-on-surface-variant opacity-50 col-span-2">Nenhum dado encontrado para remover neste módulo.</p>
                       )}
                    </div>
                  ) : null}
                </div>

                {resetModal.module === 'total' && (
                  <div className="space-y-3 pt-4 border-t border-outline/10">
                    <label className="text-[10px] font-black uppercase text-error tracking-widest px-1">
                      Digite <span className="text-error underline">RECOMEÇAR</span> para confirmar
                    </label>
                    <input 
                      type="text" 
                      placeholder="RECOMEÇAR"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      className="w-full bg-error/5 border border-error/20 p-4 rounded-xl text-sm font-black outline-none focus:border-error transition-colors placeholder:text-error/20"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => setResetModal({ open: false, module: null })}
                  className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReset}
                  disabled={loading || (resetModal.module === 'total' && confirmationText.toUpperCase() !== 'RECOMEÇAR')}
                  className={cn(
                    "py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                    loading || (resetModal.module === 'total' && confirmationText.toUpperCase() !== 'RECOMEÇAR')
                      ? "bg-outline/10 text-outline cursor-not-allowed"
                      : "bg-error text-white hover:bg-error/90 shadow-lg shadow-error/20"
                  )}
                >
                  {loading ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
