import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMateriaComGradePayload } from './buildMateriaComGradePayload';
import { createDefaultMateriaComGradeFormState, createEmptyGradeSlot } from './formDefaults';
import { findOverlappingSlotPairs, validateGradeSlot } from './gradeSlotRules';
import { validateMateriaComGradeForm } from './validateMateriaComGradeForm';
import type { MateriaComGradeFormState } from '@/types/materiaComGradeForm';

function baseForm(overrides: Partial<MateriaComGradeFormState> = {}): MateriaComGradeFormState {
  const defaults = createDefaultMateriaComGradeFormState();
  return {
    materia: { ...defaults.materia, nome: 'Projeto Integrador', ...overrides.materia },
    periodo: {
      ...defaults.periodo,
      periodo_inicio: '2026-02-01',
      periodo_fim: '2026-06-30',
      ...overrides.periodo
    },
    grade: overrides.grade ?? []
  };
}

function slot(
  horaInicio: string,
  horaFim: string,
  diasSemana: number[] = [2],
  extra: { local?: string; observacoes?: string } = { local: 'Sala 10' }
) {
  return createEmptyGradeSlot({
    dias_semana: diasSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    local: extra.local ?? 'Sala 10',
    observacoes: extra.observacoes ?? ''
  });
}

describe('validateMateriaComGradeForm — CENÁRIO A', () => {
  it('matéria sem grade → período opcional', () => {
    const form = baseForm({
      periodo: { tipo_periodo: 'semestre', numero_periodo: '', periodo_inicio: '', periodo_fim: '' },
      grade: []
    });
    const result = validateMateriaComGradeForm(form);
    assert.equal(result.valid, true);
  });
});

describe('validateMateriaComGradeForm — CENÁRIO B', () => {
  it('matéria com grade e sem período → inválida', () => {
    const form = baseForm({
      periodo: { tipo_periodo: 'semestre', numero_periodo: '', periodo_inicio: '', periodo_fim: '' },
      grade: [slot('18:30', '19:20')]
    });
    const result = validateMateriaComGradeForm(form);
    assert.equal(result.valid, false);
    assert.ok(result.errors.periodo?.periodo_inicio);
    assert.ok(result.errors.periodo?.periodo_fim);
  });
});

describe('grade slots — CENÁRIO C', () => {
  it('3 slots consecutivos na terça permanecem 3 slots no payload', () => {
    const form = baseForm({
      grade: [slot('18:30', '19:20'), slot('19:20', '20:10'), slot('20:10', '21:00')]
    });

    const validation = validateMateriaComGradeForm(form);
    assert.equal(validation.valid, true);
    assert.equal(form.grade.length, 3);

    const payload = buildMateriaComGradePayload(form);
    assert.equal(payload.grade.length, 3);
    assert.deepEqual(payload.grade.map((g) => g.hora_inicio), ['18:30', '19:20', '20:10']);
    assert.deepEqual(payload.grade.map((g) => g.hora_fim), ['19:20', '20:10', '21:00']);
    payload.grade.forEach((g) => assert.deepEqual(g.dias_semana, [2]));
  });
});

describe('grade slots — CENÁRIO D', () => {
  it('mesmo horário em segunda + quarta em dias_semana [1,3] é válido', () => {
    const form = baseForm({
      grade: [slot('08:00', '08:50', [1, 3], { local: '' })]
    });
    const validation = validateMateriaComGradeForm(form);
    assert.equal(validation.valid, true);

    const payload = buildMateriaComGradePayload(form);
    assert.deepEqual(payload.grade[0].dias_semana, [1, 3]);
  });
});

describe('grade slots — CENÁRIO E/F/G', () => {
  it('CENÁRIO E — sobreposição real é inválida', () => {
    const form = baseForm({
      grade: [slot('18:30', '19:30'), slot('19:00', '20:00')]
    });
    const pairs = findOverlappingSlotPairs(form.grade);
    assert.equal(pairs.length, 1);

    const validation = validateMateriaComGradeForm(form);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.grade?.[0]?.some((e) => e.includes('Sobreposição')));
  });

  it('CENÁRIO F — horários consecutivos são válidos', () => {
    const form = baseForm({
      grade: [slot('18:30', '19:20'), slot('19:20', '20:10')]
    });
    const validation = validateMateriaComGradeForm(form);
    assert.equal(validation.valid, true);
    assert.equal(findOverlappingSlotPairs(form.grade).length, 0);
  });

  it('CENÁRIO G — duplicata exata é inválida', () => {
    const form = baseForm({
      grade: [slot('18:30', '19:20'), slot('18:30', '19:20')]
    });
    const validation = validateMateriaComGradeForm(form);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.grade?.[1]?.some((e) => e.includes('duplicado')));
  });
});

describe('buildMateriaComGradePayload — CENÁRIO H/I', () => {
  it('CENÁRIO H — limite_faltas_percentual = 25 permanece 25', () => {
    const form = baseForm({
      materia: {
        ...baseForm().materia,
        limite_faltas_percentual: 25
      },
      grade: [slot('18:30', '19:20')]
    });
    const payload = buildMateriaComGradePayload(form);
    assert.equal(payload.materia.limite_faltas_percentual, 25);
  });

  it('CENÁRIO I — payload { materia, grade } sem campos acadêmicos nos slots', () => {
    const form = baseForm({
      materia: {
        ...baseForm().materia,
        professor: 'Prof. Silva',
        cor: 'bg-primary',
        limite_faltas_percentual: 25
      },
      grade: [slot('18:30', '19:20')]
    });
    const payload = buildMateriaComGradePayload(form);

    assert.ok('materia' in payload);
    assert.ok(Array.isArray(payload.grade));
    assert.equal(payload.materia.nome, 'Projeto Integrador');
    assert.equal(payload.materia.professor, 'Prof. Silva');
    assert.equal(payload.materia.limite_faltas_percentual, 25);

    const slotPayload = payload.grade[0];
    assert.deepEqual(Object.keys(slotPayload).sort(), ['dias_semana', 'hora_fim', 'hora_inicio', 'local']);
    assert.equal((slotPayload as Record<string, unknown>).professor, undefined);
    assert.equal((slotPayload as Record<string, unknown>).cor, undefined);
    assert.equal((slotPayload as Record<string, unknown>).limite_faltas_percentual, undefined);
    assert.equal((slotPayload as Record<string, unknown>).periodo_inicio, undefined);
    assert.equal((slotPayload as Record<string, unknown>).titulo, undefined);
    assert.equal((slotPayload as Record<string, unknown>).clientId, undefined);
  });

  it('preserva observacoes no state e envia no payload do slot', () => {
    const gradeSlot = slot('18:30', '19:20', [2], {
      local: 'Sala 10',
      observacoes: 'Laboratório nas semanas de prática'
    });
    const form = baseForm({ grade: [gradeSlot] });

    assert.equal(form.grade[0].observacoes, 'Laboratório nas semanas de prática');
    assert.ok(form.grade[0].clientId);

    const payload = buildMateriaComGradePayload(form);
    assert.equal(payload.grade[0].observacoes, 'Laboratório nas semanas de prática');
    assert.equal((payload.grade[0] as Record<string, unknown>).clientId, undefined);
  });

  it('omite observacoes vazias do payload', () => {
    const form = baseForm({
      grade: [slot('18:30', '19:20', [2], { local: 'Sala 10', observacoes: '   ' })]
    });
    const payload = buildMateriaComGradePayload(form);
    assert.equal(payload.grade[0].observacoes, undefined);
  });
});

describe('DaySelector — convenção de dias', () => {
  it('WEEK_DAYS mantém 0 = domingo … 6 = sábado', async () => {
    const { WEEK_DAYS } = await import('@/components/common/DaySelector');
    assert.deepEqual(
      WEEK_DAYS.map((d) => d.value),
      [0, 1, 2, 3, 4, 5, 6]
    );
    assert.equal(WEEK_DAYS[0].label, 'Dom');
    assert.equal(WEEK_DAYS[6].label, 'Sáb');
  });
});

describe('validateGradeSlot', () => {
  it('rejeita slot sem dias da semana', () => {
    const errors = validateGradeSlot(
      createEmptyGradeSlot({ dias_semana: [], hora_inicio: '08:00', hora_fim: '09:00' }),
      0
    );
    assert.ok(errors.some((e) => e.includes('dia')));
  });
});
