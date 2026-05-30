import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export interface StreakData {
  days: { dayLabel: string; active: boolean; isToday: boolean; percentage: number }[];
  currentStreak: number;
  activeDaysCount: number;
}

export function calculateWeeklyStreak(sessoes: any[], revisoes: any[]): StreakData {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
  const end = endOfWeek(today, { weekStartsOn: 0 });

  const daysInterval = eachDayOfInterval({ start, end });
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Map activities to dates
  const activeDates: Date[] = [];
  
  sessoes.forEach(s => {
      const d = s.created_at ? (typeof s.created_at.toDate === 'function' ? s.created_at.toDate() : new Date(s.created_at)) : null;
      if (d && !isNaN(d.getTime())) activeDates.push(d);
  });

  revisoes.forEach(r => {
      if (r.concluida_em || r.status === 'concluida') {
        const d = r.concluida_em ? new Date(r.concluida_em) : (r.updated_at ? new Date(r.updated_at) : null);
        if (d && !isNaN(d.getTime())) activeDates.push(d);
      }
  });

  let activeDaysCount = 0;

  const days = daysInterval.map((date, i) => {
    const isActive = activeDates.some(activeDate => isSameDay(activeDate, date));
    if (isActive) activeDaysCount++;
    // For visual purposes, we can give a percentage (0 or 100 in simple case, or amount of activity)
    const percentage = isActive ? 100 : 0; 
    
    return {
      dayLabel: dayLabels[i],
      active: isActive,
      isToday: isSameDay(date, today),
      percentage
    };
  });

  // Calculate current streak. Check backwards from today!
  // This is a simplified weekly streak. For a proper "current continuous streak", we would check all history.
  // We'll just return the active days count as a quick "streak" indicator, or a basic calculation.
  let currentStreak = 0;
  for (let i = today.getDay(); i >= 0; i--) {
     if (days[i].active || (i === today.getDay() && !days[i].active)) {
         if (days[i].active) currentStreak++;
     } else {
         break;
     }
  }

  return {
    days,
    currentStreak,
    activeDaysCount
  };
}
