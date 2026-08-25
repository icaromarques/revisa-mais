import type { GradeSlotFormData } from '@/types/materiaComGradeForm';

/** 0 = domingo … 6 = sábado (alinhado ao backend 1C.1 e date-fns getDay). */
export const VALID_WEEK_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function slotSignature(slot: Pick<GradeSlotFormData, 'dias_semana' | 'hora_inicio' | 'hora_fim' | 'local'>): string {
  const days = [...slot.dias_semana].sort((a, b) => a - b).join(',');
  return `${days}|${slot.hora_inicio}|${slot.hora_fim}|${slot.local ?? ''}`;
}

export function validateGradeSlot(slot: GradeSlotFormData, index: number): string[] {
  const errors: string[] = [];
  const label = `Horário ${index + 1}`;

  if (!Array.isArray(slot.dias_semana) || slot.dias_semana.length === 0) {
    errors.push(`${label}: selecione pelo menos um dia da semana`);
  } else {
    for (const day of slot.dias_semana) {
      if (!VALID_WEEK_DAYS.has(day)) {
        errors.push(`${label}: dia da semana inválido (${day})`);
      }
    }
  }

  if (!isValidTime(slot.hora_inicio)) {
    errors.push(`${label}: hora de início inválida (use HH:mm)`);
  }
  if (!isValidTime(slot.hora_fim)) {
    errors.push(`${label}: hora de fim inválida (use HH:mm)`);
  }

  const start = timeToMinutes(slot.hora_inicio);
  const end = timeToMinutes(slot.hora_fim);
  if (start != null && end != null && end <= start) {
    errors.push(`${label}: hora de fim deve ser posterior à hora de início`);
  }

  return errors;
}

export function findDuplicateSlotIndexes(slots: GradeSlotFormData[]): number[] {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];

  slots.forEach((slot, index) => {
    const key = slotSignature(slot);
    const first = seen.get(key);
    if (first != null) {
      if (!duplicates.includes(first)) duplicates.push(first);
      duplicates.push(index);
    } else {
      seen.set(key, index);
    }
  });

  return duplicates.sort((a, b) => a - b);
}

/** Overlap when intervals share a day and strictly intersect (touching endpoints allowed). */
export function findOverlappingSlotPairs(slots: GradeSlotFormData[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      const sharedDays = a.dias_semana.filter((d) => b.dias_semana.includes(d));
      if (sharedDays.length === 0) continue;

      const aStart = timeToMinutes(a.hora_inicio);
      const aEnd = timeToMinutes(a.hora_fim);
      const bStart = timeToMinutes(b.hora_inicio);
      const bEnd = timeToMinutes(b.hora_fim);
      if (aStart == null || aEnd == null || bStart == null || bEnd == null) continue;

      if (aStart < bEnd && aEnd > bStart) {
        pairs.push([i, j]);
      }
    }
  }

  return pairs;
}
