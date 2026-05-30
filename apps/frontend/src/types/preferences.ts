export interface BlockedTimeRange {
  start: string; // "00:00"
  end: string;   // "07:00"
}

export interface UserPreferences {
  user_id?: string;
  scheduling: {
    blocked_hours: BlockedTimeRange[];
    allow_weekend_scheduling: boolean;
  };
  durations: {
    default_review_minutes: number;
    default_session_minutes: number;
    default_recovery_minutes: number;
  };
  reviews: {
    auto_schedule: boolean;
  };
  recovery: {
    default_strategy: 'proximo_disponivel' | 'amanha' | 'fim_de_semana' | 'manual';
    allow_recovery_by_study: boolean;
  };
  sessions: {
    auto_title: boolean;
  };
  notifications: {
    min_priority: 'baixa' | 'media' | 'alta' | 'critica';
  };
  googleCalendar?: {
    syncReviewsByDefault?: boolean;
    syncManualEventsByDefault?: boolean;
    syncPlannerEventsByDefault?: boolean;
    autoImportExternalEvents?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  scheduling: {
    blocked_hours: [{ start: '00:00', end: '07:00' }],
    allow_weekend_scheduling: true,
  },
  durations: {
    default_review_minutes: 30,
    default_session_minutes: 60,
    default_recovery_minutes: 45,
  },
  reviews: {
    auto_schedule: true,
  },
  recovery: {
    default_strategy: 'proximo_disponivel',
    allow_recovery_by_study: true,
  },
  sessions: {
    auto_title: true,
  },
  notifications: {
    min_priority: 'baixa',
  },
  googleCalendar: {
    syncReviewsByDefault: true,
    syncManualEventsByDefault: true,
    syncPlannerEventsByDefault: true,
    autoImportExternalEvents: true
  }
};
