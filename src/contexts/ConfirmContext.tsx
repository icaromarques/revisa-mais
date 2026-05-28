import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogOptions {
  title: string;
  message: ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  isDanger?: boolean;
}

interface ConfirmContextType {
  requestConfirm: (options: ConfirmDialogOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmDialogOptions & { isOpen: boolean, isProcessing: boolean }) | null>(null);

  const requestConfirm = (options: ConfirmDialogOptions) => {
    setDialog({ ...options, isOpen: true, isProcessing: false });
  };

  const closeDialog = () => {
    setDialog(prev => prev ? { ...prev, isOpen: false, isProcessing: false } : null);
  };

  const executeConfirm = async () => {
    if (!dialog) return;
    setDialog(prev => prev ? { ...prev, isProcessing: true } : null);
    try {
      await dialog.onConfirm();
    } catch (e) {
      console.error("Confirm error", e);
    } finally {
      closeDialog();
    }
  };

  return (
    <ConfirmContext.Provider value={{ requestConfirm }}>
      {children}
      
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-3xl shadow-2xl p-8 border border-outline/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-on-surface text-center mb-3 tracking-tight">{dialog.title}</h3>
            <div className="text-sm text-on-surface-variant text-center mb-6 leading-relaxed">
              {dialog.message}
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button 
                onClick={closeDialog}
                disabled={dialog.isProcessing}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-surface-container hover:bg-surface-variant text-on-surface transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button 
                onClick={executeConfirm}
                disabled={dialog.isProcessing}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold flex-1 transition-all flex items-center justify-center",
                  dialog.isProcessing ? "opacity-70 pointer-events-none" : "",
                  dialog.isDanger !== false
                    ? "bg-error text-on-error hover:bg-error/90" 
                    : "bg-primary text-on-primary hover:bg-primary/90"
                )}
              >
                {dialog.isProcessing ? (
                   <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                   dialog.confirmText || 'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
