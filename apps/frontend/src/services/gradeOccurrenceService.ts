import { apiClient } from '@/lib/api';
import { OcorrenciaGrade, GradeFaculdade, StatusOcorrencia } from '@/types/availability';
import { format, isSameDay } from 'date-fns';

export const gradeOccurrenceService = {
  /**
   * Generates occurrences for the current day based on the user's faculty grade.
   * Also checks if existing classes already "resolve" these occurrences.
   */
  async generateDailyOccurrences(userId: string, targetDate: Date = new Date()) {
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const dayOfWeek = targetDate.getDay();

    try {
       // 1. Fetch grade items for this day of week
       const { data: allGrades } = await apiClient.get('/disponibilidade/grade_faculdade');
       const grades = allGrades.filter((g: any) => {
         if (!g.ativo) return false;
         
         const matchesDay = g.dias_semana?.includes(dayOfWeek) || g.dia_semana === dayOfWeek;
         const matchesSpecific = g.data_especifica === dateStr && g.recorrente === false;
         
         return (matchesDay && g.recorrente !== false) || matchesSpecific;
       });

       // 2. Fetch existing occurrences for this date to avoid duplicates
       const { data: occurrences } = await apiClient.get(`/ocorrencias?data=${dateStr}`);
       const existingOccurrences = occurrences || [];

       // 3. Fetch classes registered for this date to auto-resolve
       const { data: classes } = await apiClient.get(`/aulas?data=${dateStr}`);
       const existingClasses = classes || [];

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

         const alreadyExists = existingOccurrences.find((o: any) => o.grade_id === grade.id);
         if (alreadyExists) continue;

         // Check if there's a class for this materia today (more strictly)
         // Any class for the same subject on the same day can be considered a resolution
         const matchingClass = existingClasses.find((c: any) => c.materia_id === grade.materia_id);
         
         const status: StatusOcorrencia = matchingClass ? 'resolvida_por_aula_existente' : 'pendente_confirmacao';
         
         await apiClient.post('/ocorrencias', {
           grade_id: grade.id,
           materia_id: grade.materia_id || '',
           data: dateStr,
           status,
           aula_id: matchingClass?.id || null,
           criado_por_robo: true
         });
         createdCount++;
       }

       if (createdCount > 0) {
         console.log(`Generated ${createdCount} new occurrences for ${dateStr}`);
       }
    } catch (e) {
       console.error("Failed to generate daily occurrences", e);
    }
  },

  async confirmOccurrence(occurrenceId: string, status: StatusOcorrencia, aulaId?: string) {
    try {
      const updatePayload: any = {
        status,
        aula_id: aulaId || null
      };
      
      if (status === 'falta') {
        updatePayload.status_reposicao = 'pendente';
      }

      await apiClient.patch(`/ocorrencias/${occurrenceId}`, updatePayload);
    } catch (e) {
      console.error("Failed to confirm occurrence:", e);
      throw e;
    }
  },

  async getPendingOccurrences(userId: string) {
    try {
       const { data } = await apiClient.get('/ocorrencias?status=pendente_confirmacao');
       return data || [];
    } catch (e) {
       console.error("Failed to fetch pending occurrences:", e);
       return [];
    }
  }
};
