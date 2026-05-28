export type EventoAcademicoTipo = 'prova' | 'trabalho' | 'apresentacao' | 'revisao' | 'sessao_estudo' | 'lembrete' | 'tarefa' | 'aula' | 'bloqueio' | 'evento_google';
export type EventoOrigem = 'manual' | 'automatica' | 'google' | 'google_external' | 'planner_ai' | 'revisao' | 'grade' | 'sistema' | 'assistente_aula';
export type SyncStatus = 'local' | 'pendente' | 'pendente_conexao' | 'sincronizado' | 'erro' | 'desativado' | 'externo' | 'precisa_reconectar' | 'removido_google';

export interface EventoAcademico {
  id?: string;
  user_id: string;
  titulo: string;
  descricao: string;
  tipo: EventoAcademicoTipo;
  materia_id?: string | null;
  topico_id?: string | null;
  revisao_id?: string | null;
  sessao_id?: string | null;
  aula_id?: string | null;
  grade_id?: string | null;
  origem: EventoOrigem;
  data_inicio: string; // ISO string
  data_fim: string; // ISO string
  dia_inteiro: boolean;
  local: string;
  cor: string;
  concluido: boolean;
  google_event_id?: string | null;
  google_calendar_id?: string | null;
  peso?: string | number | null;
  valor?: string | number | null;
  sync_status?: SyncStatus;
  sync_enabled?: boolean;
  sync_error?: string | null;
  imported_from_google?: boolean;
  google_deleted?: boolean;
  last_google_sync_at?: string;
  last_sync_at?: string | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  
  htmlLink?: string | null;
  materia_nome?: string | null;
  topico_nome?: string | null;
  source_calendar_id?: string | null;
  google_status?: string | null;
}
