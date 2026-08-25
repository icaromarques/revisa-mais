import type {
  GradeSlotFormData,
  MateriaComGradeFormState,
  MateriaFormData,
  PeriodoFormData
} from '@/types/materiaComGradeForm';

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultMateriaFormData(): MateriaFormData {
  return {
    nome: '',
    descricao: '',
    professor: '',
    cor: 'bg-primary',
    prioridade: 'Média',
    peso_importancia: 'Médio',
    meta_semanal_horas: '',
    status: 'em_andamento',
    limite_faltas_percentual: '',
    revisao_automatica_ativa: true,
    exibir_no_calendario: true,
    ia_habilitada: false
  };
}

export function createDefaultPeriodoFormData(): PeriodoFormData {
  return {
    tipo_periodo: 'semestre',
    numero_periodo: '',
    periodo_inicio: '',
    periodo_fim: ''
  };
}

export function createEmptyGradeSlot(overrides: Partial<GradeSlotFormData> = {}): GradeSlotFormData {
  return {
    clientId: createClientId(),
    dias_semana: [1],
    hora_inicio: '08:00',
    hora_fim: '09:00',
    local: '',
    observacoes: '',
    ...overrides
  };
}

export function createDefaultMateriaComGradeFormState(): MateriaComGradeFormState {
  return {
    materia: createDefaultMateriaFormData(),
    periodo: createDefaultPeriodoFormData(),
    grade: []
  };
}
