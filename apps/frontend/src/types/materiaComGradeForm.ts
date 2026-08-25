export type MateriaStatus = 'em_andamento' | 'concluida' | 'aprovada' | 'reprovada' | 'trancada';

export interface MateriaFormData {
  nome: string;
  descricao: string;
  professor: string;
  cor: string;
  prioridade: string;
  peso_importancia: string;
  meta_semanal_horas: number | '';
  status: MateriaStatus;
  limite_faltas_percentual: number | '';
  revisao_automatica_ativa: boolean;
  exibir_no_calendario: boolean;
  ia_habilitada: boolean;
}

export interface PeriodoFormData {
  tipo_periodo: string;
  numero_periodo: number | '';
  periodo_inicio: string;
  periodo_fim: string;
}

/** Slot recorrente — apenas dados específicos do horário (sem campos acadêmicos da matéria). */
export interface GradeSlotFormData {
  /** Client id for React lists; not sent to API. */
  clientId: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  local?: string;
  observacoes?: string;
}

export interface MateriaComGradeFormState {
  materia: MateriaFormData;
  periodo: PeriodoFormData;
  grade: GradeSlotFormData[];
}

export interface MateriaComGradeApiPayload {
  materia: {
    nome: string;
    descricao: string | null;
    professor: string | null;
    cor: string;
    prioridade: string;
    peso_importancia: string;
    meta_semanal_horas: number | null;
    status: MateriaStatus;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    tipo_periodo: string | null;
    numero_periodo: number | null;
    limite_faltas_percentual: number | null;
    revisao_automatica_ativa: boolean;
    exibir_no_calendario: boolean;
    ia_habilitada: boolean;
  };
  grade: Array<{
    dias_semana: number[];
    hora_inicio: string;
    hora_fim: string;
    local?: string;
    observacoes?: string;
  }>;
}

export interface MateriaComGradeFormValidationResult {
  valid: boolean;
  errors: {
    materia?: Partial<Record<keyof MateriaFormData, string>>;
    periodo?: Partial<Record<keyof PeriodoFormData, string>>;
    grade?: Record<number, string[]>;
    form?: string[];
  };
}
