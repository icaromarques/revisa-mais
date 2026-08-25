import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFaltasResumo,
  buildFaltasResumosForMaterias,
  calculateTotalExpectedOccurrences,
  countFaltasContabilizadas,
  countFaltaUnits
} from './faltas.service';

describe('buildFaltasResumo — cenário A (60 aulas, limite 25%)', () => {
  const total = 60;
  const limite = 25;

  it('14 faltas → ~23,33%, não reprovado, margem 0', () => {
    const ocorrencias = Array.from({ length: 14 }, (_, i) => ({
      status: 'falta',
      grade_id: `grade-${i}`
    }));
    const resumo = buildFaltasResumo(total, limite, ocorrencias);

    assert.equal(resumo.faltasContabilizadas, 14);
    assert.equal(resumo.percentualFaltas, 23.33);
    assert.equal(resumo.reprovadoPorLimite, false);
    assert.equal(resumo.situacao, 'critico');
    assert.equal(resumo.maximoFaltasSemReprovar, 14);
    assert.equal(resumo.faltasAindaPermitidasSemReprovar, 0);
    assert.equal(resumo.minimoFaltasParaReprovar, 15);
  });

  it('15 faltas → 25%, reprovado_limite', () => {
    const ocorrencias = Array.from({ length: 15 }, (_, i) => ({
      status: 'falta',
      grade_id: `grade-${i}`
    }));
    const resumo = buildFaltasResumo(total, limite, ocorrencias);

    assert.equal(resumo.faltasContabilizadas, 15);
    assert.equal(resumo.percentualFaltas, 25);
    assert.equal(resumo.reprovadoPorLimite, true);
    assert.equal(resumo.situacao, 'reprovado_limite');
    assert.equal(resumo.faltasAindaPermitidasSemReprovar, 0);
  });
});

describe('buildFaltasResumo — cenário B (62 aulas, limite 25%)', () => {
  const total = 62;
  const limite = 25;

  it('15 faltas → ~24,19%, ainda permitido', () => {
    const ocorrencias = Array.from({ length: 15 }, (_, i) => ({
      status: 'falta',
      grade_id: `g-${i}`
    }));
    const resumo = buildFaltasResumo(total, limite, ocorrencias);

    assert.equal(resumo.faltasContabilizadas, 15);
    assert.ok(Math.abs((resumo.percentualFaltas ?? 0) - 24.19) < 0.01);
    assert.equal(resumo.reprovadoPorLimite, false);
    assert.equal(resumo.minimoFaltasParaReprovar, 16);
    assert.equal(resumo.maximoFaltasSemReprovar, 15);
    assert.equal(resumo.faltasAindaPermitidasSemReprovar, 0);
  });

  it('16 faltas → ~25,81%, reprovado_limite', () => {
    const ocorrencias = Array.from({ length: 16 }, (_, i) => ({
      status: 'falta',
      grade_id: `g-${i}`
    }));
    const resumo = buildFaltasResumo(total, limite, ocorrencias);

    assert.equal(resumo.faltasContabilizadas, 16);
    assert.ok(Math.abs((resumo.percentualFaltas ?? 0) - 25.81) < 0.01);
    assert.equal(resumo.reprovadoPorLimite, true);
    assert.equal(resumo.situacao, 'reprovado_limite');
  });
});

describe('cenário C — 3 slots, presença + 2 faltas independentes', () => {
  it('conta 2 faltas; assistida não entra no limite', () => {
    const ocorrencias = [
      { status: 'assistida', grade_id: 'slot-a' },
      { status: 'falta', grade_id: 'slot-b' },
      { status: 'falta', grade_id: 'slot-c' }
    ];

    assert.equal(countFaltasContabilizadas(ocorrencias), 2);
    assert.equal(countFaltaUnits(ocorrencias[0]), 0);
    assert.equal(countFaltaUnits(ocorrencias[1]), 1);
    assert.equal(countFaltaUnits(ocorrencias[2]), 1);
  });

  it('cada slot de grade conta 1 mesmo com quantidade_ocorrencias > 1', () => {
    const oc = { status: 'falta', grade_id: 'slot-a', quantidade_ocorrencias: 3 };
    assert.equal(countFaltaUnits(oc), 1);
  });
});

describe('cenário D — conteudo_recuperado conta para o limite', () => {
  it('conteudo_recuperado incrementa faltasContabilizadas', () => {
    const ocorrencias = [
      { status: 'conteudo_recuperado', grade_id: 'slot-1' }
    ];
    const resumo = buildFaltasResumo(60, 25, ocorrencias);
    assert.equal(resumo.faltasContabilizadas, 1);
  });
});

describe('calculateTotalExpectedOccurrences — múltiplos slots por dia', () => {
  it('3 slots na terça contam 3 por terça letiva', () => {
    const grade = [
      {
        ativo: true,
        recorrente: true,
        dias_semana: [2],
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-01-07'
      },
      {
        ativo: true,
        recorrente: true,
        dias_semana: [2],
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-01-07'
      },
      {
        ativo: true,
        recorrente: true,
        dias_semana: [2],
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-01-07'
      }
    ];
    // Jan 2026: Tue = 6th only in first week range 1-7
    const total = calculateTotalExpectedOccurrences(grade, '2026-01-01', '2026-01-07');
    assert.equal(total, 3);
  });
});

describe('buildFaltasResumosForMaterias — batch', () => {
  it('returns one resumo per materia using the same buildFaltasResumo rules', () => {
    const materias = [
      { id: 'm1', periodoInicio: '2026-01-01', periodoFim: '2026-01-31', limiteFaltasPercentual: 25 },
      { id: 'm2', periodoInicio: null, periodoFim: null, limiteFaltasPercentual: 25 }
    ];
    const grade = [
      {
        materiaId: 'm1',
        ativo: true,
        recorrente: true,
        dias_semana: [1],
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-01-31'
      }
    ];
    const ocorrencias = Array.from({ length: 14 }, (_, i) => ({
      materiaId: 'm1',
      status: 'falta',
      grade_id: `g-${i}`
    }));

    const resumos = buildFaltasResumosForMaterias(materias, grade, ocorrencias);
    assert.equal(resumos.length, 2);
    assert.equal(resumos[0].materiaId, 'm1');
    assert.equal(resumos[0].faltasContabilizadas, 14);
    assert.equal(resumos[0].faltasAindaPermitidasSemReprovar, 0);
    assert.equal(resumos[1].materiaId, 'm2');
    assert.equal(resumos[1].situacao, 'indeterminado');
  });
});
