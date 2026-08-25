import { Materia, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { buildMateriaData } from '../mappers/materia.mapper';
import { bodyField, parseDate } from '../utils/responseMapper';

/** 0 = domingo … 6 = sábado (convenção date-fns getDay / frontend). */
const VALID_WEEK_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class MateriaGradeValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'MateriaGradeValidationError';
    this.statusCode = statusCode;
  }
}

export interface GradeSlotInput {
  diasSemana: number[];
  horaInicio: string;
  horaFim: string;
  local?: string | null;
  observacoes?: string | null;
  dataInicioVigencia?: Date | null;
  dataFimVigencia?: Date | null;
}

export function parseGradeSlotInput(raw: Record<string, unknown>): GradeSlotInput {
  const dias = bodyField<number[]>(raw, 'diasSemana', 'dias_semana');
  return {
    diasSemana: Array.isArray(dias) ? dias.map(Number) : [],
    horaInicio: String(bodyField(raw, 'horaInicio', 'hora_inicio') || ''),
    horaFim: String(bodyField(raw, 'horaFim', 'hora_fim') || ''),
    local: bodyField<string>(raw, 'local') ?? null,
    observacoes: bodyField<string>(raw, 'observacoes') ?? null,
    dataInicioVigencia: parseDate(bodyField(raw, 'dataInicioVigencia', 'data_inicio_vigencia')),
    dataFimVigencia: parseDate(bodyField(raw, 'dataFimVigencia', 'data_fim_vigencia'))
  };
}

export function parseGradeSlotsFromBody(body: Record<string, unknown>): GradeSlotInput[] {
  const gradeRaw = body.grade ?? body.slots;
  if (gradeRaw === undefined || gradeRaw === null) return [];
  if (!Array.isArray(gradeRaw)) {
    throw new MateriaGradeValidationError('grade deve ser um array');
  }
  return gradeRaw.map((item) => parseGradeSlotInput(item as Record<string, unknown>));
}

export function parseMateriaBodyFromRequest(body: Record<string, unknown>): Record<string, unknown> {
  const materia = body.materia ?? body;
  if (typeof materia !== 'object' || materia === null || Array.isArray(materia)) {
    throw new MateriaGradeValidationError('materia inválida');
  }
  return materia as Record<string, unknown>;
}

export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new MateriaGradeValidationError(`Horário inválido: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function validateMateriaInput(data: ReturnType<typeof buildMateriaData>): void {
  if (!data.nome?.trim()) {
    throw new MateriaGradeValidationError('Nome é obrigatório');
  }
  if (data.limiteFaltasPercentual != null) {
    const limite = Number(data.limiteFaltasPercentual);
    if (!Number.isFinite(limite) || limite <= 0 || limite > 100) {
      throw new MateriaGradeValidationError('limite_faltas_percentual deve ser um percentual entre 0 e 100');
    }
  }
  if (data.periodoInicio && data.periodoFim && data.periodoInicio > data.periodoFim) {
    throw new MateriaGradeValidationError('periodo_inicio não pode ser posterior a periodo_fim');
  }
}

export function assertMateriaPeriodRequiredWhenGradePresent(
  materiaData: ReturnType<typeof buildMateriaData>,
  slots: GradeSlotInput[]
): void {
  if (slots.length === 0) return;

  const { periodoInicio, periodoFim } = materiaData;

  if (!periodoInicio && !periodoFim) {
    throw new MateriaGradeValidationError(
      'periodo_inicio e periodo_fim são obrigatórios quando há slots de grade'
    );
  }
  if (periodoInicio && !periodoFim) {
    throw new MateriaGradeValidationError('periodo_fim é obrigatório quando há slots de grade');
  }
  if (!periodoInicio && periodoFim) {
    throw new MateriaGradeValidationError('periodo_inicio é obrigatório quando há slots de grade');
  }
  if (periodoInicio && periodoFim && periodoInicio > periodoFim) {
    throw new MateriaGradeValidationError('periodo_inicio não pode ser posterior a periodo_fim');
  }
}

export function validateGradeSlot(slot: GradeSlotInput, index: number): void {
  const label = `grade[${index}]`;

  if (!Array.isArray(slot.diasSemana) || slot.diasSemana.length === 0) {
    throw new MateriaGradeValidationError(`${label}: dias_semana não pode ser vazio`);
  }

  for (const day of slot.diasSemana) {
    if (!VALID_WEEK_DAYS.has(day)) {
      throw new MateriaGradeValidationError(`${label}: dia da semana inválido (${day})`);
    }
  }

  if (!TIME_PATTERN.test(slot.horaInicio)) {
    throw new MateriaGradeValidationError(`${label}: hora_inicio inválida (use HH:mm)`);
  }
  if (!TIME_PATTERN.test(slot.horaFim)) {
    throw new MateriaGradeValidationError(`${label}: hora_fim inválida (use HH:mm)`);
  }

  const start = timeToMinutes(slot.horaInicio);
  const end = timeToMinutes(slot.horaFim);
  if (end <= start) {
    throw new MateriaGradeValidationError(`${label}: hora_fim deve ser posterior a hora_inicio`);
  }

  if (slot.dataInicioVigencia && slot.dataFimVigencia && slot.dataInicioVigencia > slot.dataFimVigencia) {
    throw new MateriaGradeValidationError(`${label}: data_inicio_vigencia não pode ser posterior a data_fim_vigencia`);
  }
}

export function slotSignature(slot: GradeSlotInput): string {
  const days = [...slot.diasSemana].sort((a, b) => a - b).join(',');
  return `${days}|${slot.horaInicio}|${slot.horaFim}|${slot.local ?? ''}`;
}

export function assertNoDuplicateSlots(slots: GradeSlotInput[]): void {
  const seen = new Set<string>();
  for (const slot of slots) {
    const key = slotSignature(slot);
    if (seen.has(key)) {
      throw new MateriaGradeValidationError('Slot de grade duplicado no mesmo request');
    }
    seen.add(key);
  }
}

/** Overlap when intervals share a day and strictly intersect (touching endpoints allowed). */
export function assertNoOverlappingSlots(slots: GradeSlotInput[]): void {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      const sharedDays = a.diasSemana.filter((d) => b.diasSemana.includes(d));
      if (sharedDays.length === 0) continue;

      const aStart = timeToMinutes(a.horaInicio);
      const aEnd = timeToMinutes(a.horaFim);
      const bStart = timeToMinutes(b.horaInicio);
      const bEnd = timeToMinutes(b.horaFim);

      if (aStart < bEnd && aEnd > bStart) {
        throw new MateriaGradeValidationError(
          'Sobreposição de horários entre slots da mesma matéria no mesmo dia'
        );
      }
    }
  }
}

function assertVigenciaWithinMateriaPeriod(
  materia: Pick<Materia, 'periodoInicio' | 'periodoFim'>,
  slot: GradeSlotInput,
  index: number
): void {
  const label = `grade[${index}]`;
  const { periodoInicio, periodoFim } = materia;

  if (slot.dataInicioVigencia && periodoInicio && slot.dataInicioVigencia < periodoInicio) {
    throw new MateriaGradeValidationError(`${label}: data_inicio_vigencia anterior ao período da matéria`);
  }
  if (slot.dataFimVigencia && periodoFim && slot.dataFimVigencia > periodoFim) {
    throw new MateriaGradeValidationError(`${label}: data_fim_vigencia posterior ao período da matéria`);
  }
}

export function buildGradeDataFromMateria(
  userId: string,
  materia: Materia,
  slot: GradeSlotInput
): Prisma.GradeFaculdadeCreateInput {
  return {
    user: { connect: { id: userId } },
    materia: { connect: { id: materia.id } },
    titulo: materia.nome,
    professor: materia.professor,
    cor: materia.cor,
    diasSemana: slot.diasSemana,
    horaInicio: slot.horaInicio,
    horaFim: slot.horaFim,
    local: slot.local ?? null,
    recorrente: true,
    periodoInicio: materia.periodoInicio,
    periodoFim: materia.periodoFim,
    tipoPeriodo: materia.tipoPeriodo,
    numeroPeriodo: materia.numeroPeriodo,
    limiteFaltasPercentual: materia.limiteFaltasPercentual,
    dataInicioVigencia: slot.dataInicioVigencia ?? materia.periodoInicio,
    dataFimVigencia: slot.dataFimVigencia ?? materia.periodoFim,
    observacoes: slot.observacoes ?? null,
    ativo: true
  };
}

export function validateCreateMateriaWithGradeInput(
  materiaBody: Record<string, unknown>,
  slots: GradeSlotInput[]
): ReturnType<typeof buildMateriaData> {
  const materiaData = buildMateriaData('', materiaBody);
  validateMateriaInput(materiaData);
  assertMateriaPeriodRequiredWhenGradePresent(materiaData, slots);

  for (let i = 0; i < slots.length; i++) {
    validateGradeSlot(slots[i], i);
  }
  assertNoDuplicateSlots(slots);
  assertNoOverlappingSlots(slots);

  return materiaData;
}

export async function executeCreateMateriaWithGradeInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  materiaData: ReturnType<typeof buildMateriaData>,
  slots: GradeSlotInput[]
): Promise<{ materia: Materia; grade: Awaited<ReturnType<typeof prisma.gradeFaculdade.create>>[] }> {
  const materia = await tx.materia.create({ data: materiaData });

  for (let i = 0; i < slots.length; i++) {
    assertVigenciaWithinMateriaPeriod(materia, slots[i], i);
  }

  const grade: Awaited<ReturnType<typeof prisma.gradeFaculdade.create>>[] = [];
  for (const slot of slots) {
    const created = await tx.gradeFaculdade.create({
      data: buildGradeDataFromMateria(userId, materia, slot)
    });
    grade.push(created);
  }

  return { materia, grade };
}

export const materiaGradeService = {
  async createMateriaWithGrade(
    userId: string,
    materiaBody: Record<string, unknown>,
    slots: GradeSlotInput[]
  ): Promise<{ materia: Materia; grade: Awaited<ReturnType<typeof prisma.gradeFaculdade.create>>[] }> {
    const materiaData = validateCreateMateriaWithGradeInput(materiaBody, slots);
    materiaData.userId = userId;

    return prisma.$transaction((tx) =>
      executeCreateMateriaWithGradeInTransaction(tx, userId, materiaData, slots)
    );
  }
};
