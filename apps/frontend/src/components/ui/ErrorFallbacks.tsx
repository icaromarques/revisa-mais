import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface FallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  message?: string;
}

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,59,48,0.05),transparent_70%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-md w-full space-y-8"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-error/10 border border-error/20 rounded-[32px] flex items-center justify-center shadow-2xl shadow-error/20">
            <ShieldAlert className="w-10 h-10 text-error" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Oops! Algo deu errado</h2>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
              Ocorreu uma falha inesperada na renderização desta tela. Nossos sistemas já registraram o ocorrido.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4">
          <button
            onClick={() => resetErrorBoundary?.()}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-4 bg-white/5 text-on-surface rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Voltar para Dashboard
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-8 p-4 bg-black/40 border border-white/10 rounded-xl text-left overflow-auto max-h-40 custom-scrollbar">
            <p className="text-[10px] font-mono text-error font-bold mb-2">DEBUG_INFO:</p>
            <pre className="text-[10px] font-mono text-on-surface-variant leading-tight">
              {error.message}
              {error.stack}
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function SectionErrorFallback({ title, message, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="w-full p-8 bg-surface-container-low border border-outline/20 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
      <div className="w-12 h-12 bg-error/10 border border-error/20 rounded-2xl flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-error" />
      </div>
      
      <div className="space-y-1">
        <h4 className="text-sm font-black uppercase tracking-tight text-white">
          {title || 'Falha no carregamento'}
        </h4>
        <p className="text-[10px] text-on-surface-variant font-medium max-w-[240px]">
          {message || 'Este bloco encontrou um erro e não pôde ser exibido corretamente.'}
        </p>
      </div>

      <button
        onClick={() => resetErrorBoundary?.()}
        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-white/10 transition-all flex items-center gap-2"
      >
        <RefreshCw className="w-3 h-3" />
        Recarregar Bloco
      </button>
    </div>
  );
}

export function InlineDataFallback({ message }: { message?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-error/5 border border-error/10 rounded-lg text-error/60">
      <AlertTriangle className="w-3 h-3" />
      <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">
        {message || 'Dados Inconsistentes'}
      </span>
    </div>
  );
}
