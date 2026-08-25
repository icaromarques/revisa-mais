import {
  addDays,
  differenceInCalendarDays,
  getDay,
  isBefore,
  startOfDay
} from 'date-fns';
import { prisma } from '../config/prisma';

/** Gross expected classes — period + grade slots, no academic-calendar exceptions yet. */
export const TOTAL_PREVISTO_BRUTO_NOTA =
  'Total previsto bruto (sem feriados/recessos do calendário acadêmico).';

export type SituacaoFaltas =
  | 'indeterminado'
  | 'seguro'
  | 'atencao'
  | 'critico'
  | 'reprovado_limite';

export interface GradeSlotInput {
  id?: string;
  ativo?: boolean;
  recorrente?: boolean;
  diasSemana?: number[];
  dias_semana?: number[];
  dia_semana?: number;
  dataEspecifica?: Date | string | null;
  data_especifica?: string | null;
  periodoInicio?: Date | string | null;
  periodo_inicio?: string | null;
  periodoFim?: Date | string | null;
  periodo_fim?: string | null;
  dataInicioVigencia?: Date | string | null;
  data_inicio_vigencia?: string | null;
  dataFimVigencia?: Date | string | null;
  data_fim_vigencia?: string | null;
}

export interface OcorrenciaInput {
  status: string;
  tipoFalta?: string | null;
  tipo_falta?: string | null;
  gradeId?: string | null;
  grade_id?: string | null;
  quantidadeOcorrencias?: number;
  quantidade_ocorrencias?: number;
}

export interface FaltasResumo {
  totalAulasPrevistas: number;
  totalPrevistoBruto: boolean;
  totalPrevistoNota: string;
  totalOcorrenciasRegistradas: number;
  faltasContabilizadas: number;
  percentualFaltas: number | null;
  limitePercentual: number | null;
  minimoFaltasParaReprovar: number | null;
  maximoFaltasSemReprovar: number | null;
  faltasAindaPermitidasSemReprovar: number | null;
  percentualDoLimiteConsumido: number | null;
  situacao: SituacaoFaltas;
  reprovadoPorLimite: boolean;
}

function parseDateValue(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnlyKey(value: Date | string): string {
  const d = parseDateValue(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDiasSemana(slot: GradeSlotInput): number[] {
  if (Array.isArray(slot.diasSemana) && slot.diasSemana.length > 0) return slot.diasSemana;
  if (Array.isArray(slot.dias_semana) && slot.dias_semana.length > 0) return slot.dias_semana;
  if (typeof slot.dia_semana === 'number') return [slot.dia_semana];
  return [];
}

/**
 * Counts expected class slots in [inicio, fim]. Each GradeFaculdade row counts individually per matching day.
 */
export function calculateTotalExpectedOccurrences(
  grade: GradeSlotInput[],
  inicio: Date | string,
  fim: Date | string
): number {
  const start = startOfDay(parseDateValue(inicio)!);
  const end = startOfDay(parseDateValue(fim)!);
  if (!start || !end || grade.length === 0) return 0;
  if (isBefore(end, start)) return 0;

  let total = 0;
  const daysDiff = differenceInCalendarDays(end, start);

  for (let i = 0; i <= daysDiff; i++) {
    const d = addDays(start, i);
    const dayOfWeek = getDay(d);
    const dateStr = dateOnlyKey(d);

    for (const g of grade) {
      if (g.ativo === false) continue;

      const pInicio = g.periodoInicio ?? g.periodo_inicio ?? g.dataInicioVigencia ?? g.data_inicio_vigencia;
      const pFim = g.periodoFim ?? g.periodo_fim ?? g.dataFimVigencia ?? g.data_fim_vigencia;
      const gStart = parseDateValue(pInicio) ?? start;
      const gEnd = parseDateValue(pFim) ?? end;

      if (d < startOfDay(gStart) || d > startOfDay(gEnd)) continue;

      const recorrente = g.recorrente !== false;
      if (recorrente) {
        const dias = getDiasSemana(g);
        if (dias.includes(dayOfWeek)) total++;
      } else {
        const especifica = g.dataEspecifica ?? g.data_especifica;
        if (especifica && dateOnlyKey(especifica) === dateStr) total++;
      }
    }
  }

  return total;
}

function getTipoFalta(oc: OcorrenciaInput): string | null {
  return oc.tipoFalta ?? oc.tipo_falta ?? null;
}

function getGradeId(oc: OcorrenciaInput): string | null {
  return oc.gradeId ?? oc.grade_id ?? null;
}

function isFaltaStatus(status: string): boolean {
  return status === 'falta' || status === 'conteudo_recuperado';
}

/**
 * Grade-linked occurrences always count as 1 slot = 1 class.
 * Retroativa/manual rows without grade_id may use quantidade_ocorrencias.
 */
export function countFaltaUnits(oc: OcorrenciaInput): number {
  if (!isFaltaStatus(oc.status)) return 0;
  if (getTipoFalta(oc) === 'com_atestado') return 0;
  if (getGradeId(oc)) return 1;
  const qtd = oc.quantidadeOcorrencias ?? oc.quantidade_ocorrencias ?? 1;
  return Math.max(0, Number(qtd) || 0);
}

export function countFaltasContabilizadas(ocorrencias: OcorrenciaInput[]): number {
  return ocorrencias.reduce((sum, oc) => sum + countFaltaUnits(oc), 0);
}

export function countTotalOcorrenciasRegistradas(ocorrencias: OcorrenciaInput[]): number {
  return ocorrencias.filter((oc) => isFaltaStatus(oc.status)).length;
}

function normalizeLimitePercentual(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return n;
}

/** Thresholds for situacao before reprovado_limite (based on percentualDoLimiteConsumido). */
export const LIMITE_CONSUMIDO_CRITICO = 80;
export const LIMITE_CONSUMIDO_ATENCAO = 50;

export function buildFaltasResumo(
  totalAulasPrevistas: number,
  limitePercentualRaw: number | null | undefined,
  ocorrencias: OcorrenciaInput[]
): FaltasResumo {
  const limitePercentual = normalizeLimitePercentual(limitePercentualRaw);
  const faltasContabilizadas = countFaltasContabilizadas(ocorrencias);
  const totalOcorrenciasRegistradas = countTotalOcorrenciasRegistradas(ocorrencias);

  if (totalAulasPrevistas <= 0 || limitePercentual === null) {
    return {
      totalAulasPrevistas,
      totalPrevistoBruto: true,
      totalPrevistoNota: TOTAL_PREVISTO_BRUTO_NOTA,
      totalOcorrenciasRegistradas,
      faltasContabilizadas,
      percentualFaltas: totalAulasPrevistas > 0 && faltasContabilizadas > 0
        ? round2((faltasContabilizadas / totalAulasPrevistas) * 100)
        : totalAulasPrevistas > 0 ? 0 : null,
      limitePercentual,
      minimoFaltasParaReprovar: null,
      maximoFaltasSemReprovar: null,
      faltasAindaPermitidasSemReprovar: null,
      percentualDoLimiteConsumido: null,
      situacao: 'indeterminado',
      reprovadoPorLimite: false
    };
  }

  const percentualFaltas = round2((faltasContabilizadas / totalAulasPrevistas) * 100);
  const minimoFaltasParaReprovar = Math.ceil(totalAulasPrevistas * (limitePercentual / 100));
  const maximoFaltasSemReprovar = Math.max(0, minimoFaltasParaReprovar - 1);
  const faltasAindaPermitidasSemReprovar = Math.max(0, maximoFaltasSemReprovar - faltasContabilizadas);
  const percentualDoLimiteConsumido = round2((percentualFaltas / limitePercentual) * 100);
  const reprovadoPorLimite = percentualFaltas >= limitePercentual;

  let situacao: SituacaoFaltas = 'seguro';
  if (reprovadoPorLimite) {
    situacao = 'reprovado_limite';
  } else if (percentualDoLimiteConsumido >= LIMITE_CONSUMIDO_CRITICO) {
    situacao = 'critico';
  } else if (percentualDoLimiteConsumido >= LIMITE_CONSUMIDO_ATENCAO) {
    situacao = 'atencao';
  }

  return {
    totalAulasPrevistas,
    totalPrevistoBruto: true,
    totalPrevistoNota: TOTAL_PREVISTO_BRUTO_NOTA,
    totalOcorrenciasRegistradas,
    faltasContabilizadas,
    percentualFaltas,
    limitePercentual,
    minimoFaltasParaReprovar,
    maximoFaltasSemReprovar,
    faltasAindaPermitidasSemReprovar,
    percentualDoLimiteConsumido,
    situacao,
    reprovadoPorLimite
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const faltasService = {
  async getFaltasResumoForMateria(userId: string, materiaId: string): Promise<FaltasResumo | null> {
    const materia = await prisma.materia.findFirst({
      where: { id: materiaId, userId }
    });
    if (!materia) return null;

    const [gradeRows, ocorrencias] = await Promise.all([
      prisma.gradeFaculdade.findMany({
        where: { userId, materiaId, ativo: true }
      }),
      prisma.ocorrenciaGrade.findMany({
        where: { userId, materiaId }
      })
    ]);

    const inicio = materia.periodoInicio;
    const fim = materia.periodoFim;
    const totalAulasPrevistas =
      inicio && fim
        ? calculateTotalExpectedOccurrences(gradeRows, inicio, fim)
        : 0;

    return buildFaltasResumo(
      totalAulasPrevistas,
      materia.limiteFaltasPercentual,
      ocorrencias
    );
  }
};
