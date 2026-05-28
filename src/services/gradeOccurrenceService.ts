import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDoc,
  increment,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OcorrenciaGrade, GradeFaculdade, StatusOcorrencia } from '@/types/availability';
import { format, isSameDay, parseISO } from 'date-fns';

export const gradeOccurrenceService = {
  /**
   * Generates occurrences for the current day based on the user's faculty grade.
   * Also checks if existing classes already "resolve" these occurrences.
   */
  async generateDailyOccurrences(userId: string, targetDate: Date = new Date()) {
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const dayOfWeek = targetDate.getDay();

    // 1. Fetch grade items for this day of week
    // Handle both legacy (dia_semana) and new (dias_semana array)
    const qLegacy = query(
      collection(db, 'grade_faculdade'), 
      where('user_id', '==', userId),
      where('dia_semana', '==', dayOfWeek),
      where('ativo', '==', true)
    );
    const qArray = query(
      collection(db, 'grade_faculdade'),
      where('user_id', '==', userId),
      where('dias_semana', 'array-contains', dayOfWeek),
      where('ativo', '==', true)
    );
    const qSpecific = query(
      collection(db, 'grade_faculdade'),
      where('user_id', '==', userId),
      where('data_especifica', '==', dateStr),
      where('recorrente', '==', false),
      where('ativo', '==', true)
    );

    const [snapLegacy, snapArray, snapSpecific] = await Promise.all([getDocs(qLegacy), getDocs(qArray), getDocs(qSpecific)]);
    
    // Combine results and remove duplicates (by ID)
    const gradesMap = new Map<string, GradeFaculdade>();
    snapLegacy.docs.forEach(d => {
       const g = { id: d.id, ...d.data() } as GradeFaculdade;
       if (g.recorrente !== false) gradesMap.set(d.id, g);
    });
    snapArray.docs.forEach(d => {
       const g = { id: d.id, ...d.data() } as GradeFaculdade;
       if (g.recorrente !== false) gradesMap.set(d.id, g);
    });
    snapSpecific.docs.forEach(d => gradesMap.set(d.id, { id: d.id, ...d.data() } as GradeFaculdade));
    const grades = Array.from(gradesMap.values());

    // 2. Fetch existing occurrences for this date to avoid duplicates
    const occurrenceQuery = query(
      collection(db, 'ocorrencias_grade'),
      where('user_id', '==', userId),
      where('data', '==', dateStr)
    );
    const occurrenceSnap = await getDocs(occurrenceQuery);
    const existingOccurrences = occurrenceSnap.docs.map(d => d.data() as OcorrenciaGrade);

    // 3. Fetch classes registered for this date to auto-resolve
    const classQuery = query(
      collection(db, 'aulas'),
      where('user_id', '==', userId),
      where('data', '==', dateStr)
    );
    const classSnap = await getDocs(classQuery);
    const existingClasses = classSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const batch = writeBatch(db);
    let createdCount = 0;
    
    const now = new Date();

    for (const grade of grades) {
      if (!grade.id) continue;
      
      // Check if it's today and if the class has finished
      if (isSameDay(targetDate, now)) {
        if (grade.hora_fim) {
           const [eh, em] = grade.hora_fim.split(':').map(Number);
           const endD = new Date(targetDate);
           endD.setHours(eh, em, 0, 0);
           // Only generate if the class has finished!
           if (now < endD) {
              continue; // Skip, it hasn't finished yet
           }
        }
      }

      const alreadyExists = existingOccurrences.find(o => o.grade_id === grade.id);
      if (alreadyExists) continue;

      // Check if there's a class for this materia today (more strictly)
      // Any class for the same subject on the same day can be considered a resolution
      const matchingClass = existingClasses.find(c => c.materia_id === grade.materia_id);
      
      const status: StatusOcorrencia = matchingClass ? 'resolvida_por_aula_existente' : 'pendente_confirmacao';
      
      const occurrenceRef = doc(collection(db, 'ocorrencias_grade'));
      batch.set(occurrenceRef, {
        user_id: userId,
        grade_id: grade.id,
        materia_id: grade.materia_id || '',
        data: dateStr,
        status,
        aula_id: matchingClass?.id || null,
        origem: 'automatica',
        quantidade_ocorrencias: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      createdCount++;
    }

    if (createdCount > 0) {
      await batch.commit();
    }

    return createdCount;
  },

  async confirmOccurrence(occurrenceId: string, status: StatusOcorrencia, aulaId?: string) {
    const occurrenceRef = doc(db, 'ocorrencias_grade', occurrenceId);
    const occurrenceSnap = await getDoc(occurrenceRef);
    
    if (!occurrenceSnap.exists()) return;
    const occurrenceData = occurrenceSnap.data() as OcorrenciaGrade;

    const batch = writeBatch(db);
    
    const updatePayload: any = {
      status,
      aula_id: aulaId || null,
      updated_at: new Date().toISOString()
    };
    if (status === 'falta') {
      updatePayload.status_reposicao = 'pendente';
    }

    batch.update(occurrenceRef, updatePayload);

    // If it was a "falta", create a recovery task
    if (status === 'falta' && occurrenceData.materia_id) {
      // Create a recovery task
      const taskRef = doc(collection(db, 'eventos_academicos'));
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      batch.set(taskRef, {
        user_id: occurrenceData.user_id,
        titulo: `RECUPERAÇÃO DE CONTEÚDO: ${occurrenceData.data}`,
        descricao: `Aula perdida registrada na grade faculdade para o dia ${occurrenceData.data}. Precisa recuperar o conteúdo e registrar a reposição.`,
        tipo: 'tarefa',
        materia_id: occurrenceData.materia_id,
        topico_id: null,
        revisao_id: null,
        sessao_id: null,
        origem: 'automatica',
        data_inicio: Timestamp.fromDate(nextWeek),
        data_fim: Timestamp.fromDate(nextWeek),
        dia_inteiro: true,
        local: '',
        cor: 'vermelho', // Error color for visibility
        concluido: false,
        google_event_id: null,
        google_calendar_id: null,
        sync_status: 'local',
        sync_enabled: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }

    await batch.commit();
  },

  async getPendingOccurrences(userId: string) {
    const q = query(
      collection(db, 'ocorrencias_grade'),
      where('user_id', '==', userId),
      where('status', '==', 'pendente_confirmacao')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as OcorrenciaGrade & { id: string }));
  }
};
