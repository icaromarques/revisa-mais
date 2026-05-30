import { useState, useEffect } from 'react';
import { smartScheduleService, TimeSlot } from '@/services/smartScheduleService';

export function useSmartAvailability(userId: string | undefined, date: Date, durationMinutes: number = 30) {
  const [freeSlots, setFreeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setFreeSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    smartScheduleService.findAvailableSlots(userId, date, durationMinutes).then(slots => {
      if (!active) return;
      setFreeSlots(slots);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId, date.getTime(), durationMinutes]);

  return { freeSlots, loading };
}
