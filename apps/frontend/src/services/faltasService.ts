import { apiClient } from '@/lib/api';
import { FaltasResumoApi } from '@/types/faltas';

export async function fetchFaltasResumos(): Promise<FaltasResumoApi[]> {
  const { data } = await apiClient.get<FaltasResumoApi[]>('/materias/faltas-resumos');
  return data;
}

export async function fetchFaltasResumo(materiaId: string): Promise<FaltasResumoApi> {
  const { data } = await apiClient.get<FaltasResumoApi>(`/materias/${materiaId}/faltas-resumo`);
  return data;
}
