import type { Notificacao } from '@prisma/client';

type NotificationMeta = {
  category?: string;
  prioridade?: string;
  dedupe_key?: string;
  channel?: string;
  rota_destino?: string;
  revisao_id?: string;
  evento_id?: string;
  materia_id?: string;
  actions?: unknown[];
  [key: string]: unknown;
};

const TYPE_DEFAULTS: Record<
  string,
  { category: string; prioridade: string; rota_destino?: string }
> = {
  revisao_hoje: { category: 'revisao', prioridade: 'media', rota_destino: '/revisoes' },
  revisao_atrasada: { category: 'revisao', prioridade: 'alta', rota_destino: '/revisoes' },
  lembrete_grade: { category: 'agenda', prioridade: 'media', rota_destino: '/grade' },
  prova_proxima: { category: 'avaliacao', prioridade: 'alta', rota_destino: '/calendario' },
  trabalho_proximo: { category: 'avaliacao', prioridade: 'media', rota_destino: '/calendario' },
  apresentacao_proxima: { category: 'avaliacao', prioridade: 'media', rota_destino: '/calendario' },
  streak_lembrete: { category: 'sistema', prioridade: 'baixa', rota_destino: '/dashboard' },
  meta_diaria: { category: 'sistema', prioridade: 'baixa', rota_destino: '/dashboard' }
};

function resolveStatus(n: Notificacao): string {
  if (n.status === 'archived') return 'arquivada';
  if (n.lida) return 'lida';
  return 'nao_lida';
}

export function mapNotificacaoToApi(n: Notificacao): Record<string, unknown> {
  const meta = (n.metadataJson as NotificationMeta | null) || {};
  const defaults = TYPE_DEFAULTS[n.tipo] || {
    category: 'sistema',
    prioridade: 'baixa',
    rota_destino: '/notificacoes'
  };

  return {
    id: n.id,
    user_id: n.userId,
    titulo: n.titulo,
    mensagem: n.mensagem,
    tipo: n.tipo,
    category: meta.category || defaults.category,
    prioridade: meta.prioridade || defaults.prioridade,
    status: resolveStatus(n),
    lida: n.lida,
    created_at: n.createdAt.toISOString(),
    updated_at: n.updatedAt.toISOString(),
    dedupe_key: meta.dedupe_key || `${n.tipo}:${n.id}`,
    is_persistent: false,
    origem: meta.channel || 'engine',
    rota_destino: meta.rota_destino || defaults.rota_destino,
    revisao_id: meta.revisao_id,
    evento_id: meta.evento_id,
    materia_id: meta.materia_id,
    actions: meta.actions,
    metadata: meta
  };
}

export function mapNotificacoesToApi(items: Notificacao[]): Record<string, unknown>[] {
  return items.map(mapNotificacaoToApi);
}
