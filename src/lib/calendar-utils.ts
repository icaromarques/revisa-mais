import { EventoAcademico } from '@/types/calendar';

export function getVisibleCalendarEvents(events: EventoAcademico[]): EventoAcademico[] {
  // 1. Remove logically deleted events
  const validEvents = events.filter(e => e.sync_status !== 'removido_google' && !e.google_deleted);

  // 2. Identify Revisa+ events that have a google_event_id
  const localSyncedGoogleIds = new Set(
    validEvents
      .filter(e => e.origem !== 'google_external' && e.google_event_id && String(e.google_event_id).trim() !== '')
      .map(e => e.google_event_id)
  );

  // 3. Deduplicate 
  // - Filter out external events if a local event exists with the same google_event_id
  const filteredEvents = validEvents.filter(e => {
    if (e.origem === 'google_external' && e.google_event_id && String(e.google_event_id).trim() !== '') {
        return !localSyncedGoogleIds.has(e.google_event_id);
    }
    return true;
  });

  return filteredEvents;
}

export function getCalendarRenderKey(event: EventoAcademico, context?: string, index?: number): string {
  const parts = [];
  parts.push(context ? `ctx-${context}` : 'ctx-none');
  
  if (event.id && event.id.trim() !== '') {
    parts.push(`id-${event.id}`);
  } else if (event.google_event_id && event.google_event_id.trim() !== '') {
    parts.push(`gid-${event.google_event_id}`);
  }
  
  parts.push(`orig-${event.origem || 'unknown'}`);
  parts.push(`type-${event.tipo || 'unknown'}`);
  
  const titleSlug = (event.titulo || 'no-title').replace(/\s+/g, '-').substring(0, 20);
  parts.push(`tit-${titleSlug}`);
  
  parts.push(`st-${event.data_inicio || 'no-st'}`);
  
  if (index !== undefined) {
    parts.push(`idx-${index}`);
  } else {
    // Generate a quick random string if index isn't provided just to be safe
    parts.push(`rnd-${Math.random().toString(36).substr(2, 5)}`);
  }

  const key = parts.join('_');
  return key || `fallback-key-${Math.random()}`;
}

export function getStableRenderKey(prefix: string, item: any, index: number): string {
  if (!item) return `${prefix}-null-idx-${index}`;
  
  let baseId = '';
  if (typeof item === 'string' || typeof item === 'number') {
    baseId = String(item);
  } else if (item.id && String(item.id).trim() !== '') {
    baseId = String(item.id);
  } else if (item.value && String(item.value).trim() !== '') {
    baseId = String(item.value);
  } else if (item.hex && String(item.hex).trim() !== '') {
    baseId = String(item.hex);
  } else if (item.nome && String(item.nome).trim() !== '') {
    baseId = String(item.nome);
  } else if (item.name && String(item.name).trim() !== '') {
    baseId = String(item.name);
  }
  
  if (baseId) {
    return `${prefix}-${baseId}-idx-${index}`;
  }
  
  return `${prefix}-fallback-idx-${index}-${Math.random().toString(36).substring(2, 6)}`;
}

export function resolveCalendarColor(cor?: string | null): string {
  if (!cor) return '#8B5CF6'; // Default (roxo)
  
  const token = cor.toLowerCase().trim();
  if (token.startsWith('#')) return token;
  
  switch (token) {
    case 'azul': return '#3b82f6';
    case 'azul-escuro': return '#1d4ed8';
    case 'verde': return '#10b981';
    case 'verde-escuro': return '#047857';
    case 'roxo': return '#8B5CF6';
    case 'rosa': return '#ec4899';
    case 'laranja': return '#f97316';
    case 'amarelo': return '#eab308';
    case 'ciano': return '#06b6d4';
    case 'vermelho': return '#ef4444';
    case 'cinza': return '#64748b';
    default:
      return '#8B5CF6'; // fallback
  }
}

export function getCalendarVisibleRange(
  activeView: 'day' | 'week' | 'month' | 'year' | 'agenda', 
  currentDate: Date
): { timeMin: Date; timeMax: Date } {
  const timeMin = new Date(currentDate);
  const timeMax = new Date(currentDate);
  
  if (activeView === 'day') {
    timeMin.setHours(0, 0, 0, 0);
    timeMax.setHours(23, 59, 59, 999);
  } else if (activeView === 'week') {
    // Assuming start of week is Sunday (0) or Monday (1). Usually Date.getDay()
    const day = timeMin.getDay();
    timeMin.setDate(timeMin.getDate() - day);
    timeMin.setHours(0, 0, 0, 0);
    timeMax.setDate(timeMax.getDate() + (6 - day));
    timeMax.setHours(23, 59, 59, 999);
  } else if (activeView === 'month') {
    // We typically load a bit before the month and a bit after to cover grid overlaps
    timeMin.setDate(1);
    timeMin.setDate(timeMin.getDate() - 7);
    timeMin.setHours(0, 0, 0, 0);
    
    timeMax.setMonth(timeMax.getMonth() + 1);
    timeMax.setDate(0);
    timeMax.setDate(timeMax.getDate() + 7);
    timeMax.setHours(23, 59, 59, 999);
  } else if (activeView === 'year') {
    timeMin.setMonth(0, 1);
    timeMin.setHours(0, 0, 0, 0);
    timeMax.setMonth(11, 31);
    timeMax.setHours(23, 59, 59, 999);
  } else if (activeView === 'agenda') {
    // currentDate to currentDate + 30 days
    timeMin.setHours(0, 0, 0, 0);
    timeMax.setDate(timeMax.getDate() + 30);
    timeMax.setHours(23, 59, 59, 999);
  }
  
  return { timeMin, timeMax };
}
