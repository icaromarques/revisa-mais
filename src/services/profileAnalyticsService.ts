import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseValidDate } from '@/lib/utils';
import { endOfDay, startOfDay, getDay, isSameDay } from 'date-fns';

export interface ProfileAnalytics {
  totalSessoes: number;
  totalMinutos: number;
  revisoesConcluidas: number;
  questoesResolvidas: number;
  streakDias: number;
  mediaPorSessao: number;
  materiaMaisEstudada: string | null;
  melhorHorario: string | null;
  taxaRevisao: number | null;
  rotinaInsight: string | null;
}

export const profileAnalyticsService = {
  async compute(userId: string): Promise<ProfileAnalytics> {
    const qSessoes = query(collection(db, 'sessoes'), where('user_id', '==', userId));
    const sessoesSnap = await getDocs(qSessoes);
    
    // Convert to easier format
    const sessoes = sessoesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    const qMaterias = query(collection(db, 'materias'), where('user_id', '==', userId));
    const materiasSnap = await getDocs(qMaterias);
    const materiasMap = new Map<string, string>();
    materiasSnap.docs.forEach(d => materiasMap.set(d.id, d.data().nome));

    const qRevisoes = query(collection(db, 'revisoes'), where('user_id', '==', userId));
    const revisoesSnap = await getDocs(qRevisoes);
    const revisoes = revisoesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    const revisoesConcluidas = revisoes.filter(r => r.status === 'concluida').length;
    const taxaRevisao = revisoes.length > 0 ? (revisoesConcluidas / revisoes.length) * 100 : null;

    let totalMinutos = 0;
    const materiaTempos = new Map<string, number>();
    const horaFrequence = new Array(24).fill(0);
    const diaFrequence = new Array(7).fill(0);

    const activeDays = new Set<string>();

    sessoes.forEach(s => {
      const min = s.tempo_estudado_minutos || Math.floor((s.tempo_estudado_segundos || 0) / 60) || 0;
      totalMinutos += min;

      if (s.materia_id) {
        materiaTempos.set(s.materia_id, (materiaTempos.get(s.materia_id) || 0) + min);
      }

      if (s.created_at) {
        const d = parseValidDate(s.created_at);
        activeDays.add(d.toISOString().split('T')[0]);
        horaFrequence[d.getHours()]++;
        diaFrequence[getDay(d)]++;
      } else if (s.data_sessao) {
        const d = parseValidDate(s.data_sessao);
        activeDays.add(d.toISOString().split('T')[0]);
        horaFrequence[d.getHours()]++;
        diaFrequence[getDay(d)]++;
      }
    });

    const totalSessoes = sessoes.length;
    const mediaPorSessao = totalSessoes > 0 ? Math.round(totalMinutos / totalSessoes) : 0;

    let bestMateriaId: string | null = null;
    let maxMateriaTime = -1;
    materiaTempos.forEach((time, matId) => {
      if (time > maxMateriaTime) {
        maxMateriaTime = time;
        bestMateriaId = matId;
      }
    });
    const materiaMaisEstudada = bestMateriaId ? (materiasMap.get(bestMateriaId) || 'Desconhecida') : null;

    let bestHour = -1;
    let maxHourFreq = -1;
    horaFrequence.forEach((freq, h) => {
      if (freq > maxHourFreq) {
        maxHourFreq = freq;
        bestHour = h;
      }
    });
    let melhorHorario: string | null = null;
    if (bestHour !== -1 && maxHourFreq > 0) {
      if (bestHour >= 5 && bestHour < 12) melhorHorario = 'Manhã';
      else if (bestHour >= 12 && bestHour < 18) melhorHorario = 'Tarde';
      else if (bestHour >= 18 && bestHour < 23) melhorHorario = 'Noite';
      else melhorHorario = 'Madrugada';
    }

    // Calcular streak simples
    const sortedDays = Array.from(activeDays).sort((a,b) => b.localeCompare(a)); // desc
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (sortedDays.includes(today)) {
      streak = 1;
      let curr = new Date();
      curr.setDate(curr.getDate() - 1);
      while(sortedDays.includes(curr.toISOString().split('T')[0])) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      }
    } else if (sortedDays.includes(yesterday)) {
       streak = 1;
       let curr = new Date(Date.now() - 86400000);
       curr.setDate(curr.getDate() - 1);
       while(sortedDays.includes(curr.toISOString().split('T')[0])) {
         streak++;
         curr.setDate(curr.getDate() - 1);
       }
    }

    // Insight string
    let rotinaInsight: string | null = null;
    if (totalSessoes >= 3) {
       const periodStr = melhorHorario ? `predominantemente no período da ${melhorHorario.toLowerCase()}` : '';
       
       const limit = 2; // getting top 2 days
       const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
       const activeDaysIdx = diaFrequence.map((f, i) => ({f, i})).filter(x => x.f > 0).sort((a,b) => b.f - a.f);
       
       let daysStr = '';
       if (activeDaysIdx.length > 0) {
           const topDays = activeDaysIdx.slice(0, 2).map(x => dayNames[x.i]);
           daysStr = 'com maior atividade às ' + topDays.join(' e ');
       }

       rotinaInsight = `Sua rotina indica estudos ${periodStr}, ${daysStr}. A sessão média dura ${mediaPorSessao} minutos, com maior foco em ${materiaMaisEstudada || 'várias matérias'}.`;
    }

    // TODO questoes if applicable
    const questoesResolvidas = 0;

    return {
      totalSessoes,
      totalMinutos,
      revisoesConcluidas,
      questoesResolvidas,
      streakDias: streak,
      mediaPorSessao,
      materiaMaisEstudada,
      melhorHorario,
      taxaRevisao,
      rotinaInsight
    };
  }
};
