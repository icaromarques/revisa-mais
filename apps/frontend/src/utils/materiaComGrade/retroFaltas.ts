export type RetroFaltaDetalhe = {
  data: string;
  quantidade: number;
  tipo_falta: string;
  observacoes: string;
  status_reposicao: string;
};

export type RetroFaltasPlan =
  | { mode: 'none' }
  | { mode: 'quantidade'; quantidade: number; data: string }
  | { mode: 'detalhado'; items: RetroFaltaDetalhe[] };

export type RetroOcorrenciaPayload = {
  materia_id: string;
  data: string;
  status: 'falta';
  origem: 'retroativa';
  quantidade_ocorrencias: number;
  tipo_falta: string;
  status_reposicao: string;
  observacoes: string;
};

/** Monta payloads de ocorrências retroativas a partir do plano do formulário (sem grade_id). */
export function buildRetroFaltasOcorrencias(
  materiaId: string,
  plan: RetroFaltasPlan
): RetroOcorrenciaPayload[] {
  if (plan.mode === 'none') return [];

  if (plan.mode === 'quantidade') {
    if (!Number.isFinite(plan.quantidade) || plan.quantidade <= 0) return [];
    return [
      {
        materia_id: materiaId,
        data: plan.data,
        status: 'falta',
        origem: 'retroativa',
        quantidade_ocorrencias: plan.quantidade,
        tipo_falta: 'comum',
        status_reposicao: 'pendente',
        observacoes: 'Faltas retroativas informadas no cadastro da matéria'
      }
    ];
  }

  return plan.items
    .filter((item) => item.quantidade > 0)
    .map((item) => ({
      materia_id: materiaId,
      data: item.data || new Date().toISOString(),
      status: 'falta' as const,
      origem: 'retroativa' as const,
      quantidade_ocorrencias: item.quantidade || 1,
      tipo_falta: item.tipo_falta,
      status_reposicao: item.status_reposicao,
      observacoes: item.observacoes || 'Falta retroativa detalhada'
    }));
}

export type RetroFaltasCreateResult = {
  attempted: number;
  created: number;
  failed: number;
};

export async function createRetroFaltasOcorrencias(
  materiaId: string,
  plan: RetroFaltasPlan,
  postOcorrencia: (body: RetroOcorrenciaPayload) => Promise<unknown>
): Promise<RetroFaltasCreateResult> {
  const payloads = buildRetroFaltasOcorrencias(materiaId, plan);
  let created = 0;
  let failed = 0;

  for (const body of payloads) {
    try {
      await postOcorrencia(body);
      created += 1;
    } catch {
      failed += 1;
    }
  }

  return { attempted: payloads.length, created, failed };
}
