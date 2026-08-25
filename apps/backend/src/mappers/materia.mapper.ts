import { bodyField, parseDate } from '../utils/responseMapper';

export function buildMateriaData(userId: string, body: Record<string, unknown>) {
  return {
    userId,
    nome: String(bodyField(body, 'nome') || ''),
    cor: String(bodyField(body, 'cor') || 'roxo'),
    descricao: bodyField<string>(body, 'descricao') || null,
    professor: bodyField<string>(body, 'professor') || null,
    prioridade: bodyField<string>(body, 'prioridade') || null,
    metaSemanalHoras: bodyField<number>(body, 'metaSemanalHoras', 'meta_semanal_horas') ?? null,
    pesoImportancia: bodyField<string>(body, 'pesoImportancia', 'peso_importancia') || null,
    status: bodyField<string>(body, 'status') || 'em_andamento',
    periodoInicio: parseDate(bodyField(body, 'periodoInicio', 'periodo_inicio')),
    periodoFim: parseDate(bodyField(body, 'periodoFim', 'periodo_fim')),
    tipoPeriodo: bodyField<string>(body, 'tipoPeriodo', 'tipo_periodo') || null,
    numeroPeriodo: bodyField<number>(body, 'numeroPeriodo', 'numero_periodo') ?? null,
    limiteFaltasPercentual: bodyField<number>(body, 'limiteFaltasPercentual', 'limite_faltas_percentual') ?? null,
    revisaoAutomaticaAtiva: bodyField<boolean>(body, 'revisaoAutomaticaAtiva', 'revisao_automatica_ativa') ?? true,
    exibirNoCalendario: bodyField<boolean>(body, 'exibirNoCalendario', 'exibir_no_calendario') ?? true,
    iaHabilitada: bodyField<boolean>(body, 'iaHabilitada', 'ia_habilitada') ?? false
  };
}
