import type { MouseEvent } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  startOfMonth,
  endOfMonth,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventoAcademico } from '@/types/calendar';
import {
  formatEventTime,
  getCalendarRenderKey,
  isEventOnDay,
  parseEventLocalDate,
  resolveCalendarColor
} from '@/lib/calendar-utils';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

type ViewProps = {
  currentDate: Date;
  events: EventoAcademico[];
  onDayClick: (day: Date) => void;
  onEventClick: (e: MouseEvent, event: EventoAcademico) => void;
  getTypeStyle: (tipo: string, cor?: string) => { bg: string; text: string; border: string };
};

export function CalendarDayView({ currentDate, events, onEventClick, getTypeStyle }: ViewProps) {
  const dayEvents = events
    .filter((e) => isEventOnDay(e, currentDate))
    .sort((a, b) => parseEventLocalDate(a.data_inicio).getTime() - parseEventLocalDate(b.data_inicio).getTime());

  return (
    <div className="border border-outline/10 rounded-2xl overflow-hidden flex flex-col max-h-[70vh]">
      <div className="overflow-y-auto custom-scrollbar flex-1">
        {HOURS.map((hour) => {
          const slotEvents = dayEvents.filter((e) => {
            if (e.dia_inteiro) return hour === 6;
            return parseEventLocalDate(e.data_inicio).getHours() === hour;
          });
          return (
            <div key={hour} className="flex border-b border-outline/10 min-h-[52px]">
              <div className="w-14 shrink-0 py-2 pr-2 text-right text-[10px] font-bold text-outline">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1 space-y-1 border-l border-outline/10">
                {slotEvents.map((event, idx) => {
                  const style = getTypeStyle(event.tipo, event.cor);
                  return (
                    <button
                      key={getCalendarRenderKey(event, 'day', idx)}
                      type="button"
                      onClick={(ev) => onEventClick(ev, event)}
                      className="w-full text-left text-[11px] px-2 py-1 rounded border truncate font-medium"
                      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                    >
                      {event.dia_inteiro
                        ? event.titulo
                        : `${formatEventTime(event.data_inicio)} — ${event.titulo}`}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {dayEvents.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant py-12">Nenhum evento neste dia.</p>
        )}
      </div>
    </div>
  );
}

export function CalendarWeekView({ currentDate, events, onDayClick, onEventClick, getTypeStyle }: ViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="border border-outline/10 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 bg-surface-container border-b border-outline/10">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onDayClick(day)}
            className={`py-2 text-center border-r border-outline/10 last:border-r-0 hover:bg-surface-variant/50 ${
              isToday(day) ? 'bg-primary/10' : ''
            }`}
          >
            <div className="text-[10px] font-bold text-outline uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
            <div
              className={`text-sm font-black mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                isToday(day) ? 'bg-primary text-on-primary' : ''
              }`}
            >
              {format(day, 'd')}
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[420px]">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => isEventOnDay(e, day))
            .sort((a, b) => parseEventLocalDate(a.data_inicio).getTime() - parseEventLocalDate(b.data_inicio).getTime());
          return (
            <div
              key={`week-col-${day.toISOString()}`}
              className="border-r border-outline/10 last:border-r-0 p-1 space-y-1 overflow-y-auto max-h-[420px] custom-scrollbar"
            >
              {dayEvents.slice(0, 8).map((event, idx) => {
                const style = getTypeStyle(event.tipo, event.cor);
                return (
                  <button
                    key={getCalendarRenderKey(event, 'week', idx)}
                    type="button"
                    onClick={(ev) => onEventClick(ev, event)}
                    className="w-full text-left text-[9px] px-1.5 py-0.5 rounded border truncate font-medium"
                    style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                  >
                    {!event.dia_inteiro && formatEventTime(event.data_inicio)} {event.titulo}
                  </button>
                );
              })}
              {dayEvents.length > 8 && (
                <span className="text-[9px] text-outline px-1">+{dayEvents.length - 8}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarYearView({ currentDate, events, onDayClick }: ViewProps) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-1">
      {months.map((monthDate) => {
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        const gridStart = startOfWeek(mStart, { weekStartsOn: 0 });
        const gridEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

        return (
          <button
            key={monthDate.getMonth()}
            type="button"
            onClick={() => onDayClick(mStart)}
            className="p-3 rounded-xl border border-outline/10 hover:border-primary/30 hover:bg-surface-container/50 text-left transition-colors"
          >
            <p className="text-xs font-black uppercase mb-2 capitalize">
              {format(monthDate, 'MMMM', { locale: ptBR })}
            </p>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const count = events.filter((e) => isEventOnDay(e, day)).length;
                const inMonth = isSameMonth(day, monthDate);
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square rounded-sm text-[8px] flex items-center justify-center ${
                      !inMonth ? 'opacity-20' : count > 0 ? 'bg-primary/30 font-bold' : 'bg-surface-container'
                    } ${isToday(day) ? 'ring-1 ring-primary' : ''}`}
                    title={count > 0 ? `${count} evento(s)` : undefined}
                  >
                    {inMonth ? format(day, 'd') : ''}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CalendarAgendaView({ currentDate, events, onEventClick, getTypeStyle }: ViewProps) {
  const from = new Date(currentDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 60);

  const upcoming = events
    .filter((e) => {
      const d = parseEventLocalDate(e.data_inicio);
      return d >= from && d <= to && e.tipo !== 'bloqueio';
    })
    .sort((a, b) => parseEventLocalDate(a.data_inicio).getTime() - parseEventLocalDate(b.data_inicio).getTime());

  let lastDayKey = '';

  return (
    <div className="border border-outline/10 rounded-2xl overflow-y-auto max-h-[70vh] custom-scrollbar">
      {upcoming.length === 0 ? (
        <p className="text-center text-sm text-on-surface-variant py-16">Nenhum evento nos próximos 60 dias.</p>
      ) : (
        <ul className="divide-y divide-outline/10">
          {upcoming.map((event, idx) => {
            const start = parseEventLocalDate(event.data_inicio);
            const dayKey = format(start, 'yyyy-MM-dd');
            const showHeader = dayKey !== lastDayKey;
            lastDayKey = dayKey;
            const style = getTypeStyle(event.tipo, event.cor);

            return (
              <li key={getCalendarRenderKey(event, 'agenda', idx)}>
                {showHeader && (
                  <div className="px-4 py-2 bg-surface-container text-xs font-black uppercase tracking-wider text-primary sticky top-0 z-10">
                    {format(start, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={(ev) => onEventClick(ev, event)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-container/50 flex gap-3 items-start"
                >
                  <span className="text-sm font-bold text-outline w-12 shrink-0 pt-0.5">
                    {event.dia_inteiro ? 'Dia' : formatEventTime(event.data_inicio)}
                  </span>
                  <span
                    className="flex-1 text-sm font-semibold px-2 py-1 rounded border"
                    style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                  >
                    {event.titulo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
