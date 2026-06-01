import { UserGoogleCalendar } from '@/types/googleCalendar';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  calendars: UserGoogleCalendar[];
  loading?: boolean;
  onToggle: (googleCalendarId: string, selected: boolean) => void;
  onRefresh?: () => void;
  compact?: boolean;
};

export function GoogleCalendarsList({
  calendars,
  loading,
  onToggle,
  onRefresh,
  compact
}: Props) {
  if (loading) {
    return (
      <p className={cn('text-on-surface-variant', compact ? 'text-[10px]' : 'text-xs')}>
        Carregando agendas...
      </p>
    );
  }

  if (calendars.length === 0) {
    return (
      <p className={cn('text-on-surface-variant', compact ? 'text-[10px]' : 'text-xs')}>
        Nenhuma agenda encontrada. Conecte o Google ou sincronize nas configurações.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'font-black uppercase tracking-widest text-on-surface-variant',
            compact ? 'text-[9px]' : 'text-[10px]'
          )}
        >
          Minhas agendas Google
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
            title="Atualizar lista de agendas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {calendars.map((cal) => (
          <label
            key={cal.id}
            className="flex items-center gap-2.5 cursor-pointer group py-1"
          >
            <input
              type="checkbox"
              checked={cal.selected}
              onChange={(e) => onToggle(cal.google_calendar_id, e.target.checked)}
              className="sr-only peer"
            />
            <span
              className="w-3 h-3 rounded-sm shrink-0 border border-outline/30 peer-checked:opacity-100 opacity-40"
              style={{
                backgroundColor: cal.background_color || '#4285F4'
              }}
            />
            <span
              className={cn(
                'flex-1 truncate font-medium group-hover:text-primary transition-colors',
                compact ? 'text-[11px]' : 'text-xs',
                !cal.selected && 'opacity-50 line-through'
              )}
              title={cal.summary}
            >
              {cal.summary}
              {cal.primary && (
                <span className="ml-1 text-[9px] uppercase text-primary/80">(principal)</span>
              )}
            </span>
          </label>
        ))}
      </ul>
    </div>
  );
}
