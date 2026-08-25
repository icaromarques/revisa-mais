import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/prisma';
import {
  MateriaGradeValidationError,
  assertMateriaPeriodRequiredWhenGradePresent,
  assertNoDuplicateSlots,
  assertNoOverlappingSlots,
  buildGradeDataFromMateria,
  executeCreateMateriaWithGradeInTransaction,
  materiaGradeService,
  parseGradeSlotInput,
  validateCreateMateriaWithGradeInput,
  validateGradeSlot
} from './materiaGrade.service';
import { buildMateriaData } from '../mappers/materia.mapper';

const TEST_USER_ID = 'test-materia-grade-service-user';
const TEST_EMAIL = 'test-materia-grade-service@local.test';

function baseMateriaBody(overrides: Record<string, unknown> = {}) {
  return {
    nome: 'Projeto Integrador',
    cor: 'azul',
    professor: 'Prof. Silva',
    periodo_inicio: '2026-02-01',
    periodo_fim: '2026-06-30',
    tipo_periodo: 'semestre',
    numero_periodo: 1,
    limite_faltas_percentual: 25,
    ...overrides
  };
}

function slot(
  horaInicio: string,
  horaFim: string,
  diasSemana: number[] = [2],
  extra: Record<string, unknown> = {}
) {
  return parseGradeSlotInput({
    dias_semana: diasSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    local: 'Sala 10',
    ...extra
  });
}

async function countMateriasForUser(userId: string) {
  return prisma.materia.count({ where: { userId } });
}

async function countGradesForUser(userId: string) {
  return prisma.gradeFaculdade.count({ where: { userId } });
}

describe('materiaGrade.service — validação pura', () => {
  it('CENÁRIO E — rejeita duplicata exata no mesmo request', () => {
    const slots = [slot('18:30', '19:20'), slot('18:30', '19:20')];
    assert.throws(
      () => assertNoDuplicateSlots(slots),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('duplicado')
    );
  });

  it('CENÁRIO F — aceita horários consecutivos (fim = início)', () => {
    const slots = [slot('18:30', '19:20'), slot('19:20', '20:10')];
    assert.doesNotThrow(() => assertNoOverlappingSlots(slots));
  });

  it('CENÁRIO G — rejeita sobreposição real no mesmo dia', () => {
    const slots = [slot('18:30', '19:30'), slot('19:00', '20:00')];
    assert.throws(
      () => assertNoOverlappingSlots(slots),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('Sobreposição')
    );
  });

  it('rejeita slot com dias_semana vazio', () => {
    const invalid = parseGradeSlotInput({ dias_semana: [], hora_inicio: '08:00', hora_fim: '09:00' });
    assert.throws(
      () => validateGradeSlot(invalid, 0),
      (err: unknown) => err instanceof MateriaGradeValidationError
    );
  });

  it('rejeita hora_fim anterior ou igual a hora_inicio', () => {
    const invalid = slot('10:00', '09:30');
    assert.throws(
      () => validateGradeSlot(invalid, 0),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('hora_fim')
    );
  });

  it('rejeita matéria com grade sem periodo_inicio e periodo_fim', () => {
    const materiaData = buildMateriaData('', { nome: 'Projeto Integrador' });
    const slots = [slot('18:30', '19:20')];
    assert.throws(
      () => assertMateriaPeriodRequiredWhenGradePresent(materiaData, slots),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('periodo_inicio e periodo_fim')
    );
  });

  it('rejeita matéria com grade e periodo incompleto (só início)', () => {
    const materiaData = buildMateriaData('', { nome: 'Projeto Integrador', periodo_inicio: '2026-02-01' });
    assert.throws(
      () => assertMateriaPeriodRequiredWhenGradePresent(materiaData, [slot('18:30', '19:20')]),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('periodo_fim')
    );
  });

  it('rejeita matéria com grade e periodo incompleto (só fim)', () => {
    const materiaData = buildMateriaData('', { nome: 'Projeto Integrador', periodo_fim: '2026-06-30' });
    assert.throws(
      () => assertMateriaPeriodRequiredWhenGradePresent(materiaData, [slot('18:30', '19:20')]),
      (err: unknown) =>
        err instanceof MateriaGradeValidationError &&
        err.message.includes('periodo_inicio')
    );
  });

  it('permite matéria sem grade sem período letivo', () => {
    const materiaData = buildMateriaData('', { nome: 'Matéria Sem Grade' });
    assert.doesNotThrow(() => assertMateriaPeriodRequiredWhenGradePresent(materiaData, []));
  });

  it('cor omitida recebe default roxo via buildMateriaData', () => {
    const materiaData = buildMateriaData('', { nome: 'Sem Cor Explícita' });
    assert.equal(materiaData.cor, 'roxo');
    assert.doesNotThrow(() => validateCreateMateriaWithGradeInput({ nome: 'Sem Cor Explícita' }, []));
  });
});

describe('materiaGrade.service — integração com banco', () => {
  before(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: { email: TEST_EMAIL, nome: 'Test Materia Grade' },
      create: { id: TEST_USER_ID, email: TEST_EMAIL, nome: 'Test Materia Grade' }
    });
  });

  afterEach(async () => {
    await prisma.materia.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  after(async () => {
    await prisma.materia.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  });

  it('CENÁRIO A — matéria sem grade', async () => {
    const beforeMaterias = await countMateriasForUser(TEST_USER_ID);
    const beforeGrades = await countGradesForUser(TEST_USER_ID);

    const result = await materiaGradeService.createMateriaWithGrade(
      TEST_USER_ID,
      { nome: 'Matéria Sem Grade' },
      []
    );

    assert.equal(result.materia.nome, 'Matéria Sem Grade');
    assert.equal(result.materia.periodoInicio, null);
    assert.equal(result.materia.periodoFim, null);
    assert.equal(result.grade.length, 0);
    assert.equal(await countMateriasForUser(TEST_USER_ID), beforeMaterias + 1);
    assert.equal(await countGradesForUser(TEST_USER_ID), beforeGrades);
  });

  it('CENÁRIO B — três aulas na terça com mesmo materiaId', async () => {
    const slots = [
      slot('18:30', '19:20'),
      slot('19:20', '20:10'),
      slot('20:10', '21:00')
    ];

    const result = await materiaGradeService.createMateriaWithGrade(
      TEST_USER_ID,
      baseMateriaBody(),
      slots
    );

    assert.equal(result.materia.nome, 'Projeto Integrador');
    assert.equal(result.grade.length, 3);
    assert.ok(result.grade.every((g) => g.materiaId === result.materia.id));
    assert.ok(result.grade.every((g) => g.diasSemana.includes(2)));
  });

  it('CENÁRIO C — grades herdam dados acadêmicos da matéria', async () => {
    const result = await materiaGradeService.createMateriaWithGrade(
      TEST_USER_ID,
      baseMateriaBody(),
      [slot('18:30', '19:20')]
    );

    const grade = result.grade[0];
    assert.equal(grade.titulo, 'Projeto Integrador');
    assert.equal(grade.professor, 'Prof. Silva');
    assert.equal(grade.cor, 'azul');
    assert.equal(grade.tipoPeriodo, 'semestre');
    assert.equal(grade.numeroPeriodo, 1);
    assert.equal(grade.limiteFaltasPercentual, 25);
    assert.equal(grade.materiaId, result.materia.id);
    assert.equal(grade.userId, TEST_USER_ID);

    const materiaPeriodoInicio = result.materia.periodoInicio?.toISOString().split('T')[0];
    const gradePeriodoInicio = grade.periodoInicio?.toISOString().split('T')[0];
    assert.equal(gradePeriodoInicio, materiaPeriodoInicio);
  });

  it('CENÁRIO D — validação pré-transação: nada persiste com slot inválido', async () => {
    const beforeMaterias = await countMateriasForUser(TEST_USER_ID);
    const beforeGrades = await countGradesForUser(TEST_USER_ID);

    const slots = [slot('18:30', '19:20'), slot('19:20', '20:10'), slot('21:00', '20:10')];

    await assert.rejects(
      () => materiaGradeService.createMateriaWithGrade(TEST_USER_ID, baseMateriaBody(), slots),
      (err: unknown) => err instanceof MateriaGradeValidationError
    );

    assert.equal(await countMateriasForUser(TEST_USER_ID), beforeMaterias);
    assert.equal(await countGradesForUser(TEST_USER_ID), beforeGrades);
  });

  it('CENÁRIO D-transaction — rollback físico quando grade falha após matéria e 1º slot', async () => {
    const beforeMaterias = await countMateriasForUser(TEST_USER_ID);
    const beforeGrades = await countGradesForUser(TEST_USER_ID);

    const slots = [slot('18:30', '19:20'), slot('19:20', '20:10')];
    const materiaData = validateCreateMateriaWithGradeInput(baseMateriaBody(), slots);
    materiaData.userId = TEST_USER_ID;

    let gradeCreateAttempts = 0;

    await assert.rejects(
      () =>
        prisma.$transaction(async (tx) => {
          const wrappedTx = {
            ...tx,
            materia: tx.materia,
            gradeFaculdade: {
              ...tx.gradeFaculdade,
              create: (async (...args: unknown[]) => {
                gradeCreateAttempts += 1;
                if (gradeCreateAttempts >= 2) {
                  throw new Error('simulated grade failure inside transaction');
                }
                return tx.gradeFaculdade.create(
                  ...(args as Parameters<typeof tx.gradeFaculdade.create>)
                );
              }) as typeof tx.gradeFaculdade.create
            }
          };

          return executeCreateMateriaWithGradeInTransaction(
            wrappedTx,
            TEST_USER_ID,
            materiaData,
            slots
          );
        }),
      /simulated grade failure/
    );

    assert.equal(gradeCreateAttempts, 2);
    assert.equal(await countMateriasForUser(TEST_USER_ID), beforeMaterias);
    assert.equal(await countGradesForUser(TEST_USER_ID), beforeGrades);
  });

  it('executeCreateMateriaWithGradeInTransaction usa apenas o client tx (sem prisma direto)', async () => {
    let materiaCreateCalled = false;
    let gradeCreateCalled = false;

    const fakeMateria = {
      id: 'fake-materia-id',
      userId: TEST_USER_ID,
      nome: 'Fake',
      cor: 'roxo',
      professor: null,
      periodoInicio: new Date('2026-02-01'),
      periodoFim: new Date('2026-06-30'),
      tipoPeriodo: null,
      numeroPeriodo: null,
      limiteFaltasPercentual: null
    };

    const fakeTx = {
      materia: {
        create: async () => {
          materiaCreateCalled = true;
          return fakeMateria;
        }
      },
      gradeFaculdade: {
        create: async () => {
          gradeCreateCalled = true;
          return { id: 'fake-grade-id', materiaId: fakeMateria.id };
        }
      }
    };

    const materiaData = validateCreateMateriaWithGradeInput(baseMateriaBody(), [slot('18:30', '19:20')]);
    materiaData.userId = TEST_USER_ID;

    const result = await executeCreateMateriaWithGradeInTransaction(
      fakeTx as unknown as Parameters<typeof executeCreateMateriaWithGradeInTransaction>[0],
      TEST_USER_ID,
      materiaData,
      [slot('18:30', '19:20')]
    );

    assert.equal(materiaCreateCalled, true);
    assert.equal(gradeCreateCalled, true);
    assert.equal(result.materia.id, 'fake-materia-id');
    assert.equal(result.grade.length, 1);
  });

  it('CENÁRIO H — limite_faltas_percentual persiste como percentual', async () => {
    const result = await materiaGradeService.createMateriaWithGrade(
      TEST_USER_ID,
      baseMateriaBody({ limite_faltas_percentual: 25 }),
      [slot('18:30', '19:20')]
    );

    assert.equal(result.materia.limiteFaltasPercentual, 25);
    assert.equal(result.grade[0].limiteFaltasPercentual, 25);
  });

  it('cor omitida persiste com default roxo na matéria e grade', async () => {
    const result = await materiaGradeService.createMateriaWithGrade(
      TEST_USER_ID,
      {
        nome: 'Matéria Default Cor',
        periodo_inicio: '2026-02-01',
        periodo_fim: '2026-06-30'
      },
      [slot('18:30', '19:20')]
    );

    assert.equal(result.materia.cor, 'roxo');
    assert.equal(result.grade[0].cor, 'roxo');
  });

  it('buildGradeDataFromMateria usa vigência da matéria por padrão', async () => {
    const materiaBody = baseMateriaBody();
    const materiaData = validateCreateMateriaWithGradeInput(materiaBody, []);
    materiaData.userId = TEST_USER_ID;
    const materia = await prisma.materia.create({ data: materiaData });

    const gradeData = buildGradeDataFromMateria(TEST_USER_ID, materia, slot('18:30', '19:20'));
    const vigenciaInicio = gradeData.dataInicioVigencia instanceof Date
      ? gradeData.dataInicioVigencia.toISOString().split('T')[0]
      : null;
    const vigenciaFim = gradeData.dataFimVigencia instanceof Date
      ? gradeData.dataFimVigencia.toISOString().split('T')[0]
      : null;
    assert.equal(vigenciaInicio, materia.periodoInicio?.toISOString().split('T')[0]);
    assert.equal(vigenciaFim, materia.periodoFim?.toISOString().split('T')[0]);

    await prisma.materia.delete({ where: { id: materia.id } });
  });
});
