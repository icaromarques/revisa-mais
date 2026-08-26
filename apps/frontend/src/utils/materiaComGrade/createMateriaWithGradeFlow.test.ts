import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeCreateMateriaWithGradeFlow } from './createMateriaWithGradeFlow';
import { createDefaultMateriaComGradeFormState, createEmptyGradeSlot } from './formDefaults';
import { buildRetroFaltasOcorrencias, createRetroFaltasOcorrencias } from './retroFaltas';
import type { MateriaComGradeApiPayload, MateriaComGradeFormState } from '@/types/materiaComGradeForm';

function baseForm(overrides: Partial<MateriaComGradeFormState> = {}): MateriaComGradeFormState {
  const defaults = createDefaultMateriaComGradeFormState();
  return {
    materia: { ...defaults.materia, nome: 'Projeto Integrador', limite_faltas_percentual: 25, ...overrides.materia },
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
  extra: { local?: string; observacoes?: string } = {}
) {
  return createEmptyGradeSlot({
    dias_semana: diasSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    local: extra.local ?? 'Sala 10',
    observacoes: extra.observacoes ?? ''
  });
}

describe('executeCreateMateriaWithGradeFlow', () => {
  it('CENÁRIO A — sem grade chama create com grade []', async () => {
    let calledPayload: MateriaComGradeApiPayload | null = null;
    const result = await executeCreateMateriaWithGradeFlow({
      form: baseForm({ grade: [] }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        calledPayload = payload;
        return { materia: { id: 'mat-1', nome: payload.materia.nome, cor: payload.materia.cor }, grade: [] };
      },
      createOcorrencia: async () => undefined,
      retroFaltas: { mode: 'none' }
    });

    assert.equal(result.status, 'success');
    assert.ok(calledPayload);
    assert.deepEqual(calledPayload!.grade, []);
    if (result.status === 'success') {
      assert.equal(result.response.materia.id, 'mat-1');
    }
  });

  it('CENÁRIO B — 3 horários mantém 3 slots no payload', async () => {
    let calledPayload: MateriaComGradeApiPayload | null = null;
    const form = baseForm({
      grade: [slot('18:30', '19:20'), slot('19:20', '20:10'), slot('20:10', '21:00')]
    });

    const result = await executeCreateMateriaWithGradeFlow({
      form,
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        calledPayload = payload;
        return {
          materia: { id: 'mat-2', nome: payload.materia.nome, cor: payload.materia.cor },
          grade: payload.grade.map((_, i) => ({ id: `g-${i}` }))
        };
      },
      createOcorrencia: async () => undefined,
      retroFaltas: { mode: 'none' }
    });

    assert.equal(result.status, 'success');
    assert.equal(calledPayload!.grade.length, 3);
    assert.deepEqual(
      calledPayload!.grade.map((g) => [g.hora_inicio, g.hora_fim]),
      [
        ['18:30', '19:20'],
        ['19:20', '20:10'],
        ['20:10', '21:00']
      ]
    );
  });

  it('CENÁRIO C — grade sem período bloqueia submit (não chama API)', async () => {
    let createCalled = false;
    const result = await executeCreateMateriaWithGradeFlow({
      form: baseForm({
        periodo: { tipo_periodo: 'semestre', numero_periodo: '', periodo_inicio: '', periodo_fim: '' },
        grade: [slot('18:30', '19:20')]
      }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        createCalled = true;
        return { materia: { id: 'x', nome: payload.materia.nome, cor: payload.materia.cor }, grade: [] };
      },
      createOcorrencia: async () => undefined,
      retroFaltas: { mode: 'none' }
    });

    assert.equal(result.status, 'validation_error');
    assert.equal(createCalled, false);
  });

  it('CENÁRIO D — limite 25 permanece 25 no payload', async () => {
    let calledPayload: MateriaComGradeApiPayload | null = null;
    await executeCreateMateriaWithGradeFlow({
      form: baseForm({
        materia: { ...baseForm().materia, limite_faltas_percentual: 25 },
        grade: []
      }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        calledPayload = payload;
        return { materia: { id: 'mat-d', nome: payload.materia.nome, cor: payload.materia.cor }, grade: [] };
      },
      createOcorrencia: async () => undefined,
      retroFaltas: { mode: 'none' }
    });

    assert.equal(calledPayload!.materia.limite_faltas_percentual, 25);
  });

  it('CENÁRIO E/F — local e observacoes no slot; sem campos acadêmicos', async () => {
    let calledPayload: MateriaComGradeApiPayload | null = null;
    await executeCreateMateriaWithGradeFlow({
      form: baseForm({
        grade: [
          slot('18:30', '19:20', [2], {
            local: 'Sala 10',
            observacoes: 'Laboratório nas semanas de prática'
          })
        ]
      }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        calledPayload = payload;
        return { materia: { id: 'mat-e', nome: payload.materia.nome, cor: payload.materia.cor }, grade: [] };
      },
      createOcorrencia: async () => undefined,
      retroFaltas: { mode: 'none' }
    });

    const gradeSlot = calledPayload!.grade[0];
    assert.equal(gradeSlot.local, 'Sala 10');
    assert.equal(gradeSlot.observacoes, 'Laboratório nas semanas de prática');
    assert.deepEqual(Object.keys(gradeSlot).sort(), [
      'dias_semana',
      'hora_fim',
      'hora_inicio',
      'local',
      'observacoes'
    ]);
    assert.equal((gradeSlot as Record<string, unknown>).professor, undefined);
    assert.equal((gradeSlot as Record<string, unknown>).cor, undefined);
    assert.equal((gradeSlot as Record<string, unknown>).periodo_inicio, undefined);
    assert.equal((gradeSlot as Record<string, unknown>).limite_faltas_percentual, undefined);
    assert.equal((gradeSlot as Record<string, unknown>).titulo, undefined);
    assert.equal((gradeSlot as Record<string, unknown>).clientId, undefined);
  });

  it('CENÁRIO G — faltas retroativas usam materia.id retornado', async () => {
    const ocorrenciaIds: string[] = [];
    const result = await executeCreateMateriaWithGradeFlow({
      form: baseForm({ grade: [] }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => ({
        materia: { id: 'returned-materia-id', nome: payload.materia.nome, cor: payload.materia.cor },
        grade: []
      }),
      createOcorrencia: async (body) => {
        ocorrenciaIds.push(body.materia_id);
      },
      retroFaltas: { mode: 'quantidade', quantidade: 3, data: '2026-02-01' }
    });

    assert.equal(result.status, 'success');
    assert.deepEqual(ocorrenciaIds, ['returned-materia-id']);
    if (result.status === 'success') {
      assert.equal(result.retroFaltas.created, 1);
      assert.equal(result.retroFaltasPartialFailure, false);
    }
  });

  it('CENÁRIO H — sucesso estrutural + falha em faltas NÃO recria matéria', async () => {
    let createCalls = 0;
    const result = await executeCreateMateriaWithGradeFlow({
      form: baseForm({ grade: [] }),
      existingNames: [],
      createMateriaWithGrade: async (payload) => {
        createCalls += 1;
        return {
          materia: { id: 'mat-h', nome: payload.materia.nome, cor: payload.materia.cor },
          grade: []
        };
      },
      createOcorrencia: async () => {
        throw new Error('falha ao criar ocorrência');
      },
      retroFaltas: { mode: 'quantidade', quantidade: 2, data: '2026-02-01' }
    });

    assert.equal(createCalls, 1);
    assert.equal(result.status, 'success');
    if (result.status === 'success') {
      assert.equal(result.retroFaltasPartialFailure, true);
      assert.equal(result.retroFaltas.failed, 1);
      assert.equal(result.response.materia.id, 'mat-h');
    }
  });
});

describe('buildRetroFaltasOcorrencias', () => {
  it('monta payload de quantidade sem grade_id', () => {
    const payloads = buildRetroFaltasOcorrencias('m1', {
      mode: 'quantidade',
      quantidade: 4,
      data: '2026-03-01'
    });
    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].materia_id, 'm1');
    assert.equal(payloads[0].quantidade_ocorrencias, 4);
    assert.equal((payloads[0] as Record<string, unknown>).grade_id, undefined);
  });
});

describe('createRetroFaltasOcorrencias', () => {
  it('conta created e failed independentemente', async () => {
    let n = 0;
    const result = await createRetroFaltasOcorrencias(
      'm1',
      {
        mode: 'detalhado',
        items: [
          { data: '2026-01-01', quantidade: 1, tipo_falta: 'comum', observacoes: '', status_reposicao: 'pendente' },
          { data: '2026-01-02', quantidade: 1, tipo_falta: 'comum', observacoes: '', status_reposicao: 'pendente' }
        ]
      },
      async () => {
        n += 1;
        if (n === 2) throw new Error('fail');
      }
    );
    assert.equal(result.attempted, 2);
    assert.equal(result.created, 1);
    assert.equal(result.failed, 1);
  });
});
