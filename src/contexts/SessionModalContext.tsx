import { createContext, useContext, useState, ReactNode } from 'react';

interface SessionModalData {
  id?: string; // id da sessão para o modo edição
  materiaId?: string;
  topicoId?: string;
  tempoSugeridoS?: number; // em segundos
  tempoHHMMSS?: string;
  totalQuestoes?: number;
  acertos?: number;
  notas?: string;
  dificuldade?: number;
  dataRegistroISO?: string;
  modo?: 'manual' | 'pomodoro' | 'partial' | 'edit';
  origem?: string;
  metadata?: any;
  observacaoSugerida?: string;
  
  // New relacional fields for advanced session tracking
  tipoSessao?: 'estudo_novo' | 'revisao' | 'resumo' | 'mapa_mental' | 'questoes' | 'flashcards' | 'simulado' | 'recuperacao_de_conteudo';
  revisaoId?: string;
  faltaId?: string;
}

interface ContextType {
  isOpen: boolean;
  modalData: SessionModalData | null;
  openModal: (data?: SessionModalData) => void;
  closeModal: () => void;
}

const SessionModalContext = createContext<ContextType | undefined>(undefined);

export function SessionModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<SessionModalData | null>(null);

  const openModal = (data?: SessionModalData) => {
    setModalData(data || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalData(null);
  };

  return (
    <SessionModalContext.Provider value={{ isOpen, modalData, openModal, closeModal }}>
      {children}
    </SessionModalContext.Provider>
  );
}

export const useSessionModal = () => {
  const context = useContext(SessionModalContext);
  if (!context) throw new Error('useSessionModal must be used within provider');
  return context;
}
