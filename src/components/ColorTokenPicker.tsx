import React, { useState } from 'react';
import { REVISA_COLORS } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  value: string;
  onChange: (colorId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function ColorTokenPicker({ value, onChange, allowEmpty = false, emptyLabel = "Padrão" }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  const visibleColors = expanded ? REVISA_COLORS : REVISA_COLORS.slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {allowEmpty && (
          <button
            type="button"
            onClick={() => onChange('')}
            className={cn(
              "relative drop-shadow-sm shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all",
              !value ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent" : "border border-outline hover:bg-surface-variant"
            )}
            title={emptyLabel}
          >
            <div className="w-4 h-4 rounded-full border border-dashed border-outline-variant bg-surface" />
          </button>
        )}
        {visibleColors.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "relative drop-shadow-sm shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all group",
              value === c.id ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent" : "border border-outline/30 hover:bg-white/5"
            )}
            style={{ backgroundColor: c.bg, borderColor: value === c.id ? c.color || c.corDefault : undefined }}
            title={c.label}
          >
            <div className="w-4 h-4 rounded-full group-hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: c.color || c.corDefault }} />
          </button>
        ))}
      </div>
      {REVISA_COLORS.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="self-start text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Ver menos cores</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Ver mais cores ({REVISA_COLORS.length - 8})</>
          )}
        </button>
      )}
    </div>
  );
}
