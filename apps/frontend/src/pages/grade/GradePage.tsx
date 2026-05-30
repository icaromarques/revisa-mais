import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { Plus, Grid, List as ListIcon, Loader2, CalendarX2 } from 'lucide-react';
import { GradeSemanal } from './components/GradeSemanal';
import { GradeList } from './components/GradeList';
import { BloqueiosLista } from './components/BloqueiosLista';
import { ModalNovoHorario } from './components/ModalNovoHorario';
import { ModalNovoBloqueio } from './components/ModalNovoBloqueio';
import { cn } from '@/lib/utils';
// TODO: A refatoração completa desta página para usar apiClient foi adiada. 
// Atualmente ela ainda usa firebase/firestore diretamente.
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // TODO: Refatorar
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { apiClient } from '@/lib/api';

export function GradePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'grade' | 'bloqueios'>('grade');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  
  const [grade, setGrade] = useState<GradeFaculdade[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  
  const [isModalHorarioOpen, setIsModalHorarioOpen] = useState(false);
  const [isModalBloqueioOpen, setIsModalBloqueioOpen] = useState(false);
  const [horarioToEdit, setHorarioToEdit] = useState<GradeFaculdade | undefined>();
  const [bloqueioToEdit, setBloqueioToEdit] = useState<BloqueioAgenda | undefined>();

  useEffect(() => {
    if (!user) return;

    const qGrade = query(collection(db, 'grade_faculdade'), where('user_id', '==', user.id));
    const unsubGrade = onSnapshot(qGrade, (snap) => {
      setGrade(snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeFaculdade)));
      setLoading(false);
    });

    const qBloqueios = query(collection(db, 'bloqueios_agenda'), where('user_id', '==', user.id));
    const unsubBloqueios = onSnapshot(qBloqueios, (snap) => {
      setBloqueios(snap.docs.map(d => ({ id: d.id, ...d.data() } as BloqueioAgenda)));
    });

    const qMaterias = query(collection(db, 'materias'), where('user_id', '==', user.id));
    const unsubMaterias = onSnapshot(qMaterias, (snap) => {
      setMaterias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubGrade();
      unsubBloqueios();
      unsubMaterias();
    };
  }, [user]);

  const openHorario = (item?: GradeFaculdade) => {
    setHorarioToEdit(item);
    setIsModalHorarioOpen(true);
  };

  const openBloqueio = (item?: BloqueioAgenda) => {
    setBloqueioToEdit(item);
    setIsModalBloqueioOpen(true);
  };

  return (
    <>
      <Header title="Horários & Disponibilidade">
        <div className="flex gap-2">
           <button 
             onClick={() => activeTab === 'grade' ? openHorario() : openBloqueio()}
             className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-container transition-colors"
           >
             <Plus className="w-4 h-4" />
             {activeTab === 'grade' ? 'Novo Horário' : 'Novo Bloqueio'}
           </button>
        </div>
      </Header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-surface-container rounded-full p-1 w-fit">
            <button
              onClick={() => setActiveTab('grade')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold transition-colors",
                activeTab === 'grade' ? "bg-surface text-on-surface shadow" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Grade da Faculdade
            </button>
            <button
              onClick={() => setActiveTab('bloqueios')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold transition-colors",
                activeTab === 'bloqueios' ? "bg-surface text-on-surface shadow" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Meus Bloqueios
            </button>
          </div>

          {activeTab === 'grade' && (
            <div className="flex bg-surface-container rounded-full p-1 w-fit">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-full text-sm font-bold transition-colors",
                  viewMode === 'grid' ? "bg-surface text-primary shadow" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Visão Semanal"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-full text-sm font-bold transition-colors",
                  viewMode === 'list' ? "bg-surface text-primary shadow" : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Lista"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'grade' && (
              viewMode === 'grid' 
                ? <GradeSemanal grade={grade} bloqueios={bloqueios} materias={materias} onEdit={openHorario} onEditBloqueio={openBloqueio} />
                : <GradeList grade={grade} materias={materias} onEdit={openHorario} />
            )}
            {activeTab === 'bloqueios' && (
              <BloqueiosLista bloqueios={bloqueios} onEdit={openBloqueio} />
            )}
          </div>
        )}
      </main>

      {isModalHorarioOpen && (
        <ModalNovoHorario 
          onClose={() => {
            setIsModalHorarioOpen(false);
            setHorarioToEdit(undefined);
          }}
          horarioToEdit={horarioToEdit}
        />
      )}
      {isModalBloqueioOpen && (
        <ModalNovoBloqueio 
          onClose={() => {
            setIsModalBloqueioOpen(false);
            setBloqueioToEdit(undefined);
          }}
          bloqueioToEdit={bloqueioToEdit}
        />
      )}
    </>
  );
}
