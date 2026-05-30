import React from 'react';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

export function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day].sort());
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            className={cn(
              "w-10 h-10 rounded-full text-[10px] font-black transition-all border-2",
              isSelected 
                ? "bg-primary border-primary text-on-primary" 
                : "bg-background border-outline/10 text-on-surface-variant hover:border-primary/50"
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
