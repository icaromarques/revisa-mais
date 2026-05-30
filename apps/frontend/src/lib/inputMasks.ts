export function formatDateInput(value: string): string {
  if (!value) return '';
  // Remove tudo que não for número
  const digits = value.replace(/\D/g, '').slice(0, 8);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function dateDisplayToISO(value: string): string | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    if (year.length === 4) {
      const dateString = `${year}-${month}-${day}`;
      const d = new Date(`${dateString}T12:00:00Z`);
      if (!isNaN(d.getTime())) {
         return dateString;
      }
    }
  }
  return null;
}

export function isoToDateDisplay(value: string): string {
  if (!value) return '';
  if (value.includes('/')) return value; // Already formatted?
  const parts = value.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return value;
}

export function formatTimeInput(value: string): string {
  if (!value) return '';
  // Remove non-numeric characters, except if there's already a colon
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length === 0) return '';
  if (digits.length <= 2) {
      return digits; // Users typing 0, 08, 12...
  }
  
  if (digits.length === 3) {
      // 830 -> 08:30 or 123 -> 12:3 or 1:23?
      // Usually users type 830 for 08:30
      const firstDigit = parseInt(digits[0], 10);
      if (firstDigit > 2) {
          return `0${digits[0]}:${digits.slice(1)}`;
      } else {
          return `${digits.slice(0, 2)}:${digits[2]}`; // e.g. 12:3 Wait, 123 in time: usually 1:23 or 12:30. Let's assume 01:23. Wait, 830 is 08:30.
          // Let's standardise: 1st digit > 2 ? 0[0]:[1][2] else [0][1]:[2]
      }
  }

  // 4 digits: 1230 -> 12:30
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function normalizeTimeOnBlur(value: string): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '').slice(0, 4);
  
  if (digits.length === 1) digits = `0${digits}00`;
  else if (digits.length === 2) digits = `${digits}00`;
  else if (digits.length === 3) {
      const firstDigit = parseInt(digits[0], 10);
      if (firstDigit > 2) digits = `0${digits}`;
      else digits = `${digits}0`; // 123 -> 12:30
  }
  
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  
  let hr = parseInt(hh, 10);
  let min = parseInt(mm, 10);
  
  if (hr > 23) hr = 23;
  if (min > 59) min = 59;
  
  return `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export function timeDisplayToHHMM(value: string): string | null {
  const normalized = normalizeTimeOnBlur(value);
  if (normalized.length === 5) return normalized;
  return null;
}
