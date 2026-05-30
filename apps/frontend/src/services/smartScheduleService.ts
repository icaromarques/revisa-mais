import { unifiedAvailabilityService, TimeSlot } from './unifiedAvailabilityService';
export type { TimeSlot };

export const smartScheduleService = {
  async findNextBestSlot(
    userId: string,
    startDate: Date,
    durationMinutes: number = 30,
    maxDaysToLook: number = 14
  ): Promise<TimeSlot | null> {
    return unifiedAvailabilityService.sugerirHorarioDisponivel(userId, startDate, durationMinutes, maxDaysToLook);
  },

  async findAvailableSlots(
    userId: string, 
    date: Date, 
    durationMinutes: number = 30
  ): Promise<TimeSlot[]> {
     return unifiedAvailabilityService.getDisponibilidadeUnificada(userId, date, durationMinutes);
  }
};
