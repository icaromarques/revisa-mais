export type NotificationPriority = 'baixa' | 'media' | 'alta' | 'critica';
export type NotificationStatus = 'nao_lida' | 'lida' | 'resolvida' | 'arquivada' | 'dispensada';
export type NotificationCategory = 'revisao' | 'falta' | 'reposicao' | 'agenda' | 'avaliacao' | 'planner' | 'material' | 'integridade' | 'sistema';

export interface NotificationAction {
  label: string;
  type: 
    | 'abrir_item' 
    | 'resolver_agora' 
    | 'agendar' 
    | 'abrir_sessao' 
    | 'abrir_materia' 
    | 'abrir_calendario' 
    | 'abrir_revisao' 
    | 'abrir_falta' 
    | 'abrir_material' 
    | 'ignorar' 
    | 'arquivar' 
    | 'navigate';
  payload?: any;
}

export type NotificationType = 
  | 'revisao_hoje'
  | 'revisao_atrasada'
  | 'falta_pendente'
  | 'reposicao_pendente'
  | 'reposicao_agendada'
  | 'risco_faltas'
  | 'prova_proxima'
  | 'trabalho_proximo'
  | 'apresentacao_proxima'
  | 'conflito_agenda'
  | 'planner_vencido'
  | 'material_pendente'
  | 'integridade_dados'
  | 'streak'
  | 'sessao_concluida'
  | 'alerta_desempenho'
  | 'evento_calendario'
  | 'sistema';

export interface AppNotification {
  id: string;
  user_id: string;
  titulo: string; // mapped from 'title'
  mensagem: string; // mapped from 'message'
  tipo: NotificationType;
  category: NotificationCategory;
  prioridade: NotificationPriority;
  status: NotificationStatus;
  lida: boolean; // redundancy for easy check, but tied to status
  
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  resolved_at?: string;
  due_date?: string;

  source_module?: string;
  source_entity_id?: string;
  source_entity_type?: string;
  
  actions?: NotificationAction[];
  
  is_persistent: boolean;
  dedupe_key: string;
  
  // IDs for specific logic
  materia_id?: string;
  topico_id?: string;
  revisao_id?: string;
  evento_id?: string;
  rota_destino?: string;
  origem: string; // Legacy field used as fallback for dedupe if dedupe_key is missing
  metadata?: any;
}
