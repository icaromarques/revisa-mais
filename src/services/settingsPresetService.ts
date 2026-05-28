import { UserPreferences } from '@/types/preferences';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userPreferencesService } from './userPreferencesService';

export type PresetId = 'leve' | 'equilibrado' | 'intensivo' | 'pre_prova' | 'personalizado';

export interface UserSettingsDoc {
  restWindow?: {
    active: boolean;
    start: string;
    end: string;
    allowManual: boolean;
  };
  showRevisionSuggestion?: boolean;
  intelligentRevision?: {
    active: boolean;
    mode: 'suggestion' | 'auto';
    sensitivity: 'conservative' | 'balanced' | 'intensive';
  };
}

export interface FullConfiguration {
  preferences: UserPreferences;
  settings: UserSettingsDoc;
}

export interface PresetDefinition {
  id: PresetId;
  name: string;
  description: string;
  preferences: Partial<UserPreferences>;
  settings: Partial<UserSettingsDoc>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'leve',
    name: 'Leve & Flexível',
    description: 'Menos cobrança, mais espaço livre. Ideal para semanas tranquilas ou pós-provas.',
    preferences: {
      durations: { default_review_minutes: 20, default_session_minutes: 45, default_recovery_minutes: 30 },
      reviews: { auto_schedule: false },
      recovery: { default_strategy: 'proximo_disponivel', allow_recovery_by_study: true },
      sessions: { auto_title: true },
      notifications: { min_priority: 'media' }
    },
    settings: {
      intelligentRevision: { active: true, mode: 'suggestion', sensitivity: 'conservative' },
      showRevisionSuggestion: true
    }
  },
  {
    id: 'equilibrado',
    name: 'Constância (Equilibrado)',
    description: 'Padrão recomendado. Garante consistência sem causar esgotamento.',
    preferences: {
      durations: { default_review_minutes: 30, default_session_minutes: 60, default_recovery_minutes: 45 },
      reviews: { auto_schedule: true },
      recovery: { default_strategy: 'amanha', allow_recovery_by_study: true },
      sessions: { auto_title: true },
      notifications: { min_priority: 'baixa' }
    },
    settings: {
      intelligentRevision: { active: true, mode: 'auto', sensitivity: 'balanced' },
      showRevisionSuggestion: true
    }
  },
  {
    id: 'intensivo',
    name: 'Imersão Total (Intensivo)',
    description: 'Foco alto e sessões longas. Recomendado apenas para períodos sem aulas.',
    preferences: {
      durations: { default_review_minutes: 45, default_session_minutes: 90, default_recovery_minutes: 60 },
      reviews: { auto_schedule: true },
      recovery: { default_strategy: 'fim_de_semana', allow_recovery_by_study: false },
      sessions: { auto_title: false },
      notifications: { min_priority: 'baixa' }
    },
    settings: {
      intelligentRevision: { active: true, mode: 'auto', sensitivity: 'intensive' },
      showRevisionSuggestion: true
    }
  },
  {
    id: 'pre_prova',
    name: 'Semana de Provas',
    description: 'Minimiza distrações, evita agendamento automático e filtra alertas. Foco no que importa agora.',
    preferences: {
      durations: { default_review_minutes: 60, default_session_minutes: 120, default_recovery_minutes: 60 },
      reviews: { auto_schedule: false },
      recovery: { default_strategy: 'manual', allow_recovery_by_study: true },
      sessions: { auto_title: true },
      notifications: { min_priority: 'alta' }
    },
    settings: {
      intelligentRevision: { active: false, mode: 'suggestion', sensitivity: 'balanced' },
      showRevisionSuggestion: false
    }
  }
];

export class SettingsPresetService {
  getAvailablePresets() {
    return PRESETS;
  }

  isExactPresetMatch(config: FullConfiguration, presetId: PresetId): boolean {
    if (presetId === 'personalizado') return false;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    if (preset.preferences.durations) {
      if (preset.preferences.durations.default_review_minutes !== config.preferences.durations?.default_review_minutes) return false;
      if (preset.preferences.durations.default_session_minutes !== config.preferences.durations?.default_session_minutes) return false;
      if (preset.preferences.durations.default_recovery_minutes !== config.preferences.durations?.default_recovery_minutes) return false;
    }
    if (preset.preferences.reviews && preset.preferences.reviews.auto_schedule !== config.preferences.reviews?.auto_schedule) return false;
    if (preset.preferences.recovery) {
      if (preset.preferences.recovery.default_strategy !== config.preferences.recovery?.default_strategy) return false;
      if (preset.preferences.recovery.allow_recovery_by_study !== config.preferences.recovery?.allow_recovery_by_study) return false;
    }
    if (preset.preferences.notifications && preset.preferences.notifications.min_priority !== config.preferences.notifications?.min_priority) return false;

    if (preset.settings.showRevisionSuggestion !== undefined && preset.settings.showRevisionSuggestion !== (config.settings.showRevisionSuggestion ?? true)) return false;
    
    // Default values if undefined
    const uir = config.settings.intelligentRevision || { active: true, mode: 'auto', sensitivity: 'balanced' };
    const pir = preset.settings.intelligentRevision;
    if (pir) {
      if (uir.active !== pir.active || uir.mode !== pir.mode || uir.sensitivity !== pir.sensitivity) return false;
    }

    return true;
  }

  getCurrentPreset(config: FullConfiguration): PresetId {
    for (const preset of PRESETS) {
      if (this.isExactPresetMatch(config, preset.id)) {
        return preset.id;
      }
    }
    return 'personalizado';
  }

  async applyPreset(userId: string, presetId: PresetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const currentPrefs = await userPreferencesService.getPreferences(userId);
    const updatedPrefs = { ...currentPrefs };
    
    if (preset.preferences.durations) updatedPrefs.durations = { ...updatedPrefs.durations, ...preset.preferences.durations };
    if (preset.preferences.reviews) updatedPrefs.reviews = { ...updatedPrefs.reviews, ...preset.preferences.reviews };
    if (preset.preferences.recovery) updatedPrefs.recovery = { ...updatedPrefs.recovery, ...preset.preferences.recovery };
    if (preset.preferences.sessions) updatedPrefs.sessions = { ...updatedPrefs.sessions, ...preset.preferences.sessions };
    if (preset.preferences.notifications) updatedPrefs.notifications = { ...updatedPrefs.notifications, ...preset.preferences.notifications };

    await userPreferencesService.savePreferences(userId, updatedPrefs);

    const updates: Record<string, any> = {};
    if (preset.settings.showRevisionSuggestion !== undefined) {
      updates['settings.showRevisionSuggestion'] = preset.settings.showRevisionSuggestion;
    }
    if (preset.settings.intelligentRevision) {
      updates['settings.intelligentRevision.active'] = preset.settings.intelligentRevision.active;
      updates['settings.intelligentRevision.mode'] = preset.settings.intelligentRevision.mode;
      updates['settings.intelligentRevision.sensitivity'] = preset.settings.intelligentRevision.sensitivity;
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'users', userId), updates);
    }
  }

  analyzeCustomConfiguration(config: FullConfiguration) {
    const warnings: string[] = [];
    const strengths: string[] = [];
    
    if (!config.preferences.reviews?.auto_schedule) {
      warnings.push("Você desativou a revisão automática. Isso exige forte disciplina manual para evitar acúmulo de matérias deixadas para trás.");
    } else {
      strengths.push("A revisão automática está ativa, garantindo que nenhum conteúdo seja esquecido a longo prazo.");
    }

    const reqMins = config.preferences.durations?.default_review_minutes || 0;
    if (reqMins > 45) {
      warnings.push(`Sua duração de revisão padrão (${reqMins}m) é bastante longa. Cuidado com o cansaço cognitivo. Preferível dividir em revisões menores.`);
    }

    const ir = config.settings.intelligentRevision || { active: true, mode: 'auto', sensitivity: 'balanced' };
    if (!ir.active) {
      warnings.push("A lógica inteligente adaptativa está desativada. As revisões usarão intervalos rígidos, sem adaptação ao seu desempenho real.");
    } else if (ir.sensitivity === 'intensive') {
      warnings.push("A sensibilidade intensiva pode gerar muitas revisões diárias em pouco tempo. Reduza se começar a sentir sobrecarga.");
    } else if (ir.sensitivity === 'balanced') {
      strengths.push("Sua sensibilidade adaptativa está equilibrada e tende a reduzir sobrecarga atuando no espaçamento da curva de esquecimento.");
    }

    const notif = config.preferences.notifications?.min_priority || 'baixa';
    if (notif === 'critica' || notif === 'alta') {
      warnings.push("Atenção: você ocultou alertas e lembretes de prioridade média. Isso pode reduzir sua consistência em dias atarefados no Revisa+.");
    }

    const type = 
      (!config.preferences.reviews?.auto_schedule) ? 'Mais Manual (Requer disciplina)' :
      (ir.sensitivity === 'intensive') ? 'Mais Intensivo' :
      'Mista (Personalizada)';

    return { type, warnings, strengths };
  }

  getConfigurationSummary(config: FullConfiguration) {
    const presetId = this.getCurrentPreset(config);
    const presetName = presetId === 'personalizado' ? 'Configuração Personalizada' : PRESETS.find(p => p.id === presetId)?.name || 'Desconhecido';
    
    const isAutoSched = config.preferences.reviews?.auto_schedule;
    const ir = config.settings.intelligentRevision || { active: true, mode: 'auto', sensitivity: 'balanced' };

    let automation = 'Média';
    if (isAutoSched && ir.active && ir.mode === 'auto') automation = 'Alta';
    else if (!isAutoSched && !ir.active) automation = 'Baixa';

    const notif = config.preferences.notifications?.min_priority || 'baixa';
    const alerts = 
      notif === 'baixa' ? 'Todos' :
      notif === 'media' ? 'Padrão' : 'Mínimos';
    
    const reviews = 
      (!ir.active) ? 'Rígidas' :
      (ir.sensitivity === 'conservative') ? 'Espaçadas' :
      (ir.sensitivity === 'intensive') ? 'Frequentes' : 'Equilibradas';

    return { presetId, presetName, automation, alerts, reviews };
  }
}

export const settingsPresetService = new SettingsPresetService();
