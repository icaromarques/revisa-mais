import { toSnakeCase } from '../utils/responseMapper';

export function mapGrade(item: {
  dataEspecifica?: Date | null;
  periodoInicio?: Date | null;
  periodoFim?: Date | null;
  dataInicioVigencia?: Date | null;
  dataFimVigencia?: Date | null;
  [key: string]: unknown;
}) {
  const mapped = toSnakeCase(item) as Record<string, unknown>;
  if (item.dataEspecifica) mapped.data_especifica = item.dataEspecifica.toISOString().split('T')[0];
  if (item.periodoInicio) mapped.periodo_inicio = item.periodoInicio.toISOString().split('T')[0];
  if (item.periodoFim) mapped.periodo_fim = item.periodoFim.toISOString().split('T')[0];
  if (item.dataInicioVigencia) mapped.data_inicio_vigencia = item.dataInicioVigencia.toISOString();
  if (item.dataFimVigencia) mapped.data_fim_vigencia = item.dataFimVigencia.toISOString();
  return mapped;
}
