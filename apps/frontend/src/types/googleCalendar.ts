export interface UserGoogleCalendar {
  id: string;
  user_id: string;
  google_calendar_id: string;
  summary: string;
  description?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  access_role?: string | null;
  primary: boolean;
  selected: boolean;
}
