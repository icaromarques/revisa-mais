import { apiClient } from '@/lib/api'; // Ajustado para apontar para a instância do axios configurada

// Como o backend agora faz o CASCADE do banco de dados relacional (PostgreSQL),
// não precisamos mais calcular ou enviar em lotes as deleções.
// O banco de dados fará ON DELETE CASCADE automaticamente na Matéria.

export const materiaService = {
  checkDependencies: async (materiaId: string, userId: string) => {
    try {
      // Por enquanto, podemos retornar counts genéricos ou bater em uma rota de count no backend
      // Para não quebrar o frontend atual que espera esses valores:
      const { data } = await apiClient.get(`/materias/${materiaId}/dependencies`);
      return data;
    } catch (e) {
      console.warn("Rota de dependências em construção. Retornando 0.");
      return { totalCount: 0, counts: {}, deps: {} };
    }
  },

  deleteMateriaCascade: async (materiaId: string, userId: string) => {
    // Agora uma simples chamada HTTP resolve 100% da integridade via Banco de Dados
    await apiClient.delete(`/materias/${materiaId}`);
  }
};
