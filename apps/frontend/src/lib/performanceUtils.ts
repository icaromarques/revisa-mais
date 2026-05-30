
export type PerformanceLevel = 'fraco' | 'mediano' | 'bom' | 'excelente' | 'sem_dados';

export interface PerformanceClass {
  level: PerformanceLevel;
  label: string;
  color: string; // Tailwind text class
  bg: string;    // Tailwind bg class
  border: string; // Tailwind border class
  message: string;
  priority: 'baixa' | 'normal' | 'alta';
  percentage: number;
}

export function getPerformanceClass(acertos: number, total: number): PerformanceClass {
  if (!total || total <= 0) {
    return {
      level: 'sem_dados',
      label: 'Sem dados',
      color: 'text-on-surface-variant',
      bg: 'bg-surface-container-highest/50',
      border: 'border-outline/20',
      message: 'Sem dados suficientes para avaliar desempenho',
      priority: 'normal',
      percentage: 0
    };
  }

  const percentual = (acertos / total) * 100;

  if (percentual < 60) {
    return {
      level: 'fraco',
      label: 'Fraco',
      color: 'text-error',
      bg: 'bg-error/10',
      border: 'border-error/20',
      message: 'Desempenho fraco — precisa de reforço',
      priority: 'alta',
      percentage: percentual
    };
  }

  if (percentual < 75) {
    return {
      level: 'mediano',
      label: 'Mediano',
      color: 'text-warning-600', // Assuming a warning/orange color exists or using a custom fallback
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      message: 'Desempenho mediano — revisar com atenção',
      priority: 'normal',
      percentage: percentual
    };
  }

  if (percentual < 90) {
    return {
      level: 'bom',
      label: 'Bom',
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      message: 'Bom desempenho — manter constância',
      priority: 'normal',
      percentage: percentual
    };
  }

  return {
    level: 'excelente',
    label: 'Excelente',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    message: 'Excelente desempenho — retenção forte',
    priority: 'baixa',
    percentage: percentual
  };
}
