export const REVISA_COLORS = [
  { id: 'roxo', label: 'Roxo', corDefault: '#8B5CF6', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.14)', border: 'rgba(139, 92, 246, 0.75)', text: '#C4B5FD' },
  { id: 'violeta', label: 'Violeta', corDefault: '#A78BFA', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.14)', border: 'rgba(167, 139, 250, 0.75)', text: '#DDD6FE' },
  { id: 'azul', label: 'Azul', corDefault: '#3B82F6', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)', border: 'rgba(59, 130, 246, 0.75)', text: '#93C5FD' },
  { id: 'azul_escuro', label: 'Azul Escuro', corDefault: '#1D4ED8', color: '#1D4ED8', bg: 'rgba(29, 78, 216, 0.14)', border: 'rgba(29, 78, 216, 0.75)', text: '#60A5FA' },
  { id: 'ciano', label: 'Ciano', corDefault: '#06B6D4', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.75)', text: '#67E8F9' },
  { id: 'verde', label: 'Verde', corDefault: '#10B981', color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.75)', text: '#6EE7B7' },
  { id: 'verde_claro', label: 'Verde Claro', corDefault: '#4ADE80', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.14)', border: 'rgba(74, 222, 128, 0.75)', text: '#BBF7D0' },
  { id: 'lima', label: 'Lima', corDefault: '#84CC16', color: '#84CC16', bg: 'rgba(132, 204, 22, 0.14)', border: 'rgba(132, 204, 22, 0.75)', text: '#D9F99D' },
  { id: 'amarelo', label: 'Amarelo', corDefault: '#EAB308', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.14)', border: 'rgba(234, 179, 8, 0.75)', text: '#FEF08A' },
  { id: 'mostarda', label: 'Mostarda', corDefault: '#CA8A04', color: '#CA8A04', bg: 'rgba(202, 138, 4, 0.14)', border: 'rgba(202, 138, 4, 0.75)', text: '#FDE047' },
  { id: 'laranja', label: 'Laranja', corDefault: '#F97316', color: '#F97316', bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.75)', text: '#FDBA74' },
  { id: 'coral', label: 'Coral', corDefault: '#FB7185', color: '#FB7185', bg: 'rgba(251, 113, 133, 0.14)', border: 'rgba(251, 113, 133, 0.75)', text: '#FDA4AF' },
  { id: 'vermelho', label: 'Vermelho', corDefault: '#EF4444', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.75)', text: '#FCA5A5' },
  { id: 'rosa', label: 'Rosa', corDefault: '#EC4899', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.14)', border: 'rgba(236, 72, 153, 0.75)', text: '#F9A8D4' },
  { id: 'magenta', label: 'Magenta', corDefault: '#D946EF', color: '#D946EF', bg: 'rgba(217, 70, 239, 0.14)', border: 'rgba(217, 70, 239, 0.75)', text: '#F0ABFC' },
  { id: 'grafite', label: 'Grafite', corDefault: '#6B7280', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.14)', border: 'rgba(107, 114, 128, 0.75)', text: '#D1D5DB' }
];

export function normalizeColorId(value: string | undefined | null): string {
  if (!value) return '';

  const v = value.toLowerCase().trim();

  const mapping: Record<string, string> = {
    'bg-primary': 'roxo',
    'bg-blue-500': 'azul',
    'bg-pink-500': 'rosa',
    'bg-success': 'verde',
    'success': 'verde',
    'bg-tertiary': 'amarelo',
    'bg-error': 'vermelho',
    'outline': 'grafite',
    '#6b7280': 'grafite',
    '#4f46e5': 'roxo',
    '#8b5cf6': 'roxo',
    '#3b82f6': 'azul',
    '#22c55e': 'verde',
    '#ef4444': 'vermelho',
    '#eab308': 'amarelo',
    '#f97316': 'laranja',
    '#ec4899': 'rosa',
    '#10b981': 'verde'
  };

  if (mapping[v]) return mapping[v];

  // Try to find exact match
  if (REVISA_COLORS.find(c => c.id === v)) return v;

  return 'roxo';
}

export function getMateriaColor(colorId: string | undefined | null) {
  const normalizedId = normalizeColorId(colorId);
  const found = REVISA_COLORS.find(c => c.id === normalizedId);
  return found || REVISA_COLORS[0];
}

export function formatPeriodoLabel(tipo: string | undefined, numero?: number | string | null, inicio?: string, fim?: string): string {
  if (!tipo) return '';
  const tipoL = tipo.toLowerCase();
  
  let label = '';
  if (tipoL === 'ano') {
    label = numero ? `Ano ${numero}` : 'Ano letivo';
  } else if (tipoL === 'outro' || tipoL === 'periodo') {
    label = numero ? `Período ${numero}` : 'Período letivo';
  } else if (numero) {
    label = `${numero}º ${tipoL}`;
  } else {
    label = tipoL.charAt(0).toUpperCase() + tipoL.slice(1);
  }

  const formatDataBr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const strInicio = formatDataBr(inicio || '');
  const strFim = formatDataBr(fim || '');

  if (strInicio && strFim) {
    return `${label} • ${strInicio} a ${strFim}`;
  } else if (strInicio) {
    return `${label} • a partir de ${strInicio}`;
  } else if (strFim) {
    return `${label} • até ${strFim}`;
  }

  return label;
}
