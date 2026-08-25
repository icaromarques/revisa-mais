/**
 * Read-only integrity audit for GradeFaculdade / OcorrenciaGrade.
 * Does not mutate data. Safe to run locally before migrations (Etapa 1C).
 *
 * Usage: npm run audit:grade-ocorrencias --workspace=@revisa/backend
 */
import { prisma } from '../config/prisma';

const VALID_STATUSES = new Set([
  'pendente_confirmacao',
  'assistida',
  'falta',
  'cancelada',
  'resolvida_por_aula_existente',
  'conteudo_recuperado'
]);

function dateKey(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  const [
    ocorrencias,
    grades,
    materias
  ] = await Promise.all([
    prisma.ocorrenciaGrade.findMany({
      select: {
        id: true,
        materiaId: true,
        gradeId: true,
        data: true,
        status: true,
        quantidadeOcorrencias: true
      }
    }),
    prisma.gradeFaculdade.findMany({
      select: {
        id: true,
        materiaId: true,
        limiteFaltasPercentual: true,
        periodoInicio: true,
        periodoFim: true
      }
    }),
    prisma.materia.findMany({
      select: {
        id: true,
        limiteFaltasPercentual: true,
        periodoInicio: true,
        periodoFim: true
      }
    })
  ]);

  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const materiaById = new Map(materias.map((m) => [m.id, m]));

  const ocorrenciasGradeInexistente: string[] = [];
  const ocorrenciasMateriaInexistente: string[] = [];
  const materiaDivergenteDaGrade: string[] = [];
  const quantidadeMaiorQueUmComGrade: string[] = [];
  const statusInvalido: { id: string; status: string }[] = [];

  const duplicatasGradeDataMap = new Map<string, string[]>();

  for (const oc of ocorrencias) {
    if (!materiaById.has(oc.materiaId)) {
      ocorrenciasMateriaInexistente.push(oc.id);
    }

    if (oc.gradeId) {
      const grade = gradeById.get(oc.gradeId);
      if (!grade) {
        ocorrenciasGradeInexistente.push(oc.id);
      } else if (grade.materiaId && grade.materiaId !== oc.materiaId) {
        materiaDivergenteDaGrade.push(oc.id);
      }

      if (oc.quantidadeOcorrencias > 1) {
        quantidadeMaiorQueUmComGrade.push(oc.id);
      }

      const dupKey = `${oc.gradeId}|${dateKey(oc.data)}`;
      const group = duplicatasGradeDataMap.get(dupKey) ?? [];
      group.push(oc.id);
      duplicatasGradeDataMap.set(dupKey, group);
    }

    if (!VALID_STATUSES.has(oc.status)) {
      statusInvalido.push({ id: oc.id, status: oc.status });
    }
  }

  const duplicatasGradeData = [...duplicatasGradeDataMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids, count: ids.length }));

  const gradesSemMateria = grades.filter((g) => !g.materiaId).map((g) => g.id);

  const gradesComLimiteDivergente: string[] = [];
  for (const grade of grades) {
    if (!grade.materiaId) continue;
    const materia = materiaById.get(grade.materiaId);
    if (!materia) continue;

    const limiteDiverge =
      grade.limiteFaltasPercentual != null &&
      materia.limiteFaltasPercentual != null &&
      grade.limiteFaltasPercentual !== materia.limiteFaltasPercentual;

    const periodoInicioDiverge =
      grade.periodoInicio != null &&
      materia.periodoInicio != null &&
      grade.periodoInicio.getTime() !== materia.periodoInicio.getTime();

    const periodoFimDiverge =
      grade.periodoFim != null &&
      materia.periodoFim != null &&
      grade.periodoFim.getTime() !== materia.periodoFim.getTime();

    if (limiteDiverge || periodoInicioDiverge || periodoFimDiverge) {
      gradesComLimiteDivergente.push(grade.id);
    }
  }

  const report = {
    totals: {
      ocorrencias: ocorrencias.length,
      grades: grades.length,
      materias: materias.length
    },
    ocorrenciasGradeInexistente: ocorrenciasGradeInexistente.length,
    ocorrenciasMateriaInexistente: ocorrenciasMateriaInexistente.length,
    materiaDivergenteDaGrade: materiaDivergenteDaGrade.length,
    duplicatasGradeData: duplicatasGradeData.length,
    quantidadeMaiorQueUmComGrade: quantidadeMaiorQueUmComGrade.length,
    gradesSemMateria: gradesSemMateria.length,
    gradesComLimiteDivergente: gradesComLimiteDivergente.length,
    statusInvalido: statusInvalido.length
  };

  console.log(JSON.stringify(report, null, 2));

  if (ocorrenciasGradeInexistente.length > 0) {
    console.log('\n[ocorrenciasGradeInexistente ids]', ocorrenciasGradeInexistente.slice(0, 50));
  }
  if (ocorrenciasMateriaInexistente.length > 0) {
    console.log('\n[ocorrenciasMateriaInexistente ids]', ocorrenciasMateriaInexistente.slice(0, 50));
  }
  if (materiaDivergenteDaGrade.length > 0) {
    console.log('\n[materiaDivergenteDaGrade ids]', materiaDivergenteDaGrade.slice(0, 50));
  }
  if (duplicatasGradeData.length > 0) {
    console.log('\n[duplicatasGradeData groups]', duplicatasGradeData.slice(0, 20));
  }
  if (quantidadeMaiorQueUmComGrade.length > 0) {
    console.log('\n[quantidadeMaiorQueUmComGrade ids]', quantidadeMaiorQueUmComGrade.slice(0, 50));
  }
  if (gradesSemMateria.length > 0) {
    console.log('\n[gradesSemMateria ids]', gradesSemMateria.slice(0, 50));
  }
  if (gradesComLimiteDivergente.length > 0) {
    console.log('\n[gradesComLimiteDivergente ids]', gradesComLimiteDivergente.slice(0, 50));
  }
  if (statusInvalido.length > 0) {
    console.log('\n[statusInvalido]', statusInvalido.slice(0, 50));
  }
}

main()
  .catch((err) => {
    console.error('Audit failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
