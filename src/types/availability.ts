export interface GradeFaculdade {
  id?: string;
  user_id: string;
  materia_id?: string;
  titulo: string;
  professor?: string;
  local?: string;
  dias_semana: number[]; // Array of days: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dia_semana?: number; // Legacy
  data_especifica?: string; // ISO Date string for one-time grade items
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  recorrente: boolean;
  data_inicio_vigencia?: string; // ISO string
  data_fim_vigencia?: string; // ISO string
  periodo_inicio?: string; // ISO string (YYYY-MM-DD)
  periodo_fim?: string; // ISO string (YYYY-MM-DD)
  tipo_periodo?: string; // 'trimestre', 'semestre', 'periodo', 'outro'
  numero_periodo?: number | null;
  limite_faltas_percentual?: number | null;
  observacoes?: string;
  cor?: string;
  ativo: boolean;
  sincronizado_google?: boolean;
  google_event_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface BloqueioAgenda {
  id?: string;
  user_id: string;
  titulo: string;
  tipo: 'bloqueio' | 'rotina';
  categoria: string; // 'trabalho', 'academia', 'pessoal', 'saude', 'deslocamento', 'outros'
  dias_semana?: number[];
  dia_semana?: number; // Legacy
  data_especifica?: string; // ISO Date string for one-time blocks
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  recorrente: boolean;
  data_inicio_vigencia?: string; // ISO string
  data_fim_vigencia?: string; // ISO string
  observacoes?: string;
  cor?: string;
  ativo: boolean;
  sincronizado_google?: boolean;
  google_event_id?: string;
  created_at: string;
  updated_at?: string;
}

export type StatusOcorrencia = 'pendente_confirmacao' | 'assistida' | 'falta' | 'cancelada' | 'resolvida_por_aula_existente' | 'conteudo_recuperado';

export interface OcorrenciaGrade {
  id?: string;
  user_id: string;
  grade_id?: string;
  materia_id: string;
  data: string; // YYYY-MM-DD
  status: StatusOcorrencia;
  aula_id?: string;
  quantidade_ocorrencias?: number;
  origem?: 'automatica' | 'manual' | 'grade' | 'retroativa' | 'evento' | 'recesso_escolar';
  tipo_falta?: 'comum' | 'com_atestado' | 'justificada';
  topico_id?: string;
  observacoes?: string;
  status_reposicao?: 'pendente' | 'recuperado' | 'parcialmente' | 'nao_precisa';
  reposicao_aula_id?: string;
  reposicao_sessao_id?: string;
  reposicao_observacao?: string;
  created_at: string;
  updated_at?: string;
}
