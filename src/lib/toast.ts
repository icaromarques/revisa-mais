import { toast as sonnerToast, ExternalToast } from 'sonner';

/**
 * Revisa+ Toast Utility
 * Provides standardized durations and behaviors for the Revisa+ premium experience.
 */

const QUICK_DURATION = 2500;
const STANDARD_DURATION = 3500;
const PERSISTENT_DURATION = 7000;

// Track active toasts to prevent duplicate spamming of the same message
const activeToasts = new Map<string, string | number>();

export const toast = {
  /**
   * Fast success toast for simple actions (save, delete, update).
   * Automatically dismisses quickly.
   */
  success: (message: string, options?: ExternalToast) => {
    // If a toast with the same message exists, dismiss it first to "reset"
    if (activeToasts.has(message)) {
      sonnerToast.dismiss(activeToasts.get(message));
    }

    const id = sonnerToast.success(message, {
      duration: QUICK_DURATION,
      onAutoClose: () => activeToasts.delete(message),
      onDismiss: () => activeToasts.delete(message),
      ...options,
    });

    activeToasts.set(message, id);
    return id;
  },

  /**
   * Standard error toast.
   */
  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      duration: STANDARD_DURATION,
      ...options,
    });
  },

  /**
   * Informational toast.
   */
  info: (message: string, options?: ExternalToast) => {
    return sonnerToast.info(message, {
      duration: STANDARD_DURATION,
      ...options,
    });
  },

  /**
   * Persistent warning or notification that requires more attention.
   */
  important: (message: string, options?: ExternalToast) => {
    return sonnerToast.warning(message, {
      duration: PERSISTENT_DURATION,
      ...options,
      style: {
        border: '1px solid rgba(255, 152, 0, 0.3)',
      }
    });
  },

  /**
   * Action-based notification that might stay even longer.
   */
  alert: (message: string, options?: ExternalToast) => {
    return sonnerToast(message, {
      duration: PERSISTENT_DURATION,
      ...options,
      style: {
        background: '#1e1e24',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }
    });
  },

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  loading: (message: string, options?: ExternalToast) => sonnerToast.loading(message, options),
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
};
