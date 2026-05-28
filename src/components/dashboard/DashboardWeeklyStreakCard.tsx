import { Flame } from 'lucide-react';
import { StreakData } from '@/lib/dashboard/streak';

interface Props {
  streak: StreakData | null;
}

export function DashboardWeeklyStreakCard({ streak }: Props) {
  if (!streak) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Streak Semanal</h4>
          <p className="text-[10px] text-on-surface-variant mt-0.5">{streak.activeDaysCount} dias ativos</p>
        </div>
        <Flame className={`w-5 h-5 ${streak.currentStreak > 0 ? 'text-orange-500' : 'text-outline/50'}`} />
      </div>
      
      <div className="flex justify-between items-end gap-1 px-1 flex-1 pb-2">
        {streak.days.map((day, i) => (
          <div key={day.dayLabel+i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
            <div 
               className={`w-full rounded-t-sm transition-all duration-700 min-h-[4px] ${day.isToday ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : (day.active ? 'bg-primary/60' : 'bg-surface-container-highest opacity-50')}`} 
               style={{ height: `${day.active ? 100 : (day.isToday ? 20 : 0)}%` }}
            ></div>
            <span className={`text-[9px] font-black ${day.isToday ? 'text-primary' : 'text-outline'}`}>{day.dayLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
