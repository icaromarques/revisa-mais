import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseValidDate(dateInput: any): Date {
  if (!dateInput) return new Date(NaN);
  
  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'string') {
    d = parseISO(dateInput);
    if (isNaN(d.getTime())) {
      d = new Date(dateInput);
    }
  } else if (dateInput && typeof dateInput.toDate === 'function') {
    d = dateInput.toDate();
  } else if (dateInput && typeof dateInput.seconds === 'number' && typeof dateInput.nanoseconds === 'number') {
    d = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else {
    return new Date(NaN);
  }

  if (isNaN(d.getTime())) {
    console.warn("parseValidDate: Invalid date value detected:", dateInput);
    return new Date(NaN);
  }
  return d;
}

export function eventDateToISOString(dateInput: any): string {
  const d = parseValidDate(dateInput);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function eventDateToDate(dateInput: any): Date {
  return parseValidDate(dateInput);
}

export function safeFormat(dateInput: any, formatString: string, options?: any): string {
  try {
    const d = parseValidDate(dateInput);
    if (isNaN(d.getTime())) {
      return 'Data indisponível';
    }
    return format(d, formatString, options);
  } catch (err: any) {
    console.error("[safeFormat] Error formatting date:", dateInput, "Error:", err.message);
    return 'Data indisponível';
  }
}

export function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  let normalized = url.trim();
  if (!normalized) return '';
  
  // Do not add https:// for special protocols or relative paths
  if (
    normalized.startsWith('http://') || 
    normalized.startsWith('https://') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('file:') ||
    normalized.startsWith('gs:') ||
    normalized.startsWith('/') // internal path
  ) {
    return normalized;
  }
  
  return `https://${normalized}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(secondsInput: any): string {
  if (secondsInput == null || isNaN(Number(secondsInput))) return '00:00:00';
  const totalSeconds = Math.max(0, Math.floor(Number(secondsInput)));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
}

export function openMaterial(materialOrUrl: any, toastError?: (msg: string) => void) {
  if (!materialOrUrl) {
     if (toastError) toastError("Arquivo ou link indisponível para este material.");
     return;
  }

  let finalUrl = '';

  if (typeof materialOrUrl === 'string') {
     finalUrl = materialOrUrl;
  } else if (typeof materialOrUrl === 'object') {
     // Try to find a valid link in this order
     if (materialOrUrl.drive_open_url && materialOrUrl.drive_open_url.trim()) {
         finalUrl = materialOrUrl.drive_open_url.trim();
     } else if (materialOrUrl.drive_preview_url && materialOrUrl.drive_preview_url.trim()) {
         finalUrl = materialOrUrl.drive_preview_url.trim();     
     } else if (materialOrUrl.drive_web_view_link && materialOrUrl.drive_web_view_link.trim()) {
         finalUrl = materialOrUrl.drive_web_view_link.trim();
     } else if (materialOrUrl.drive_web_content_link && materialOrUrl.drive_web_content_link.trim()) {
         finalUrl = materialOrUrl.drive_web_content_link.trim();
     } else if (materialOrUrl.url && materialOrUrl.url.trim()) {
         finalUrl = materialOrUrl.url.trim();
     } else if (materialOrUrl.arquivo_url && materialOrUrl.arquivo_url.trim()) {
         finalUrl = materialOrUrl.arquivo_url.trim();
     } else if (materialOrUrl.conteudo && typeof materialOrUrl.conteudo === 'string' && materialOrUrl.conteudo.trim()) {
         const content = materialOrUrl.conteudo.trim();
         if (content.startsWith('http')) finalUrl = content;
     } else if (materialOrUrl.descricao && typeof materialOrUrl.descricao === 'string' && materialOrUrl.descricao.trim()) {
         const desc = materialOrUrl.descricao.trim();
         if (desc.startsWith('http')) finalUrl = desc;
     }
  }

  const normalized = normalizeUrl(finalUrl);
  if (!normalized) {
    if (toastError) toastError("Link indisponível para este material.");
    return;
  }
  window.open(normalized, '_blank', 'noopener,noreferrer');
}
