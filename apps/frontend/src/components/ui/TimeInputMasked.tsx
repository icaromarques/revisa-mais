import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeInput, normalizeTimeOnBlur } from '@/lib/inputMasks';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string; // HH:MM
  onChange?: (e: any) => void;
  onValueChange?: (val: string) => void;
}

export function TimeInputMasked({ value, onChange, onValueChange, className, disabled, required, ...props }: Props) {
  const [displayValue, setDisplayValue] = useState(value || '');

  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeInput(e.target.value);
    setDisplayValue(formatted);
    
    if (formatted.length === 5) {
      if (onChange) onChange({ target: { name: props.name, value: formatted } });
      if (onValueChange) onValueChange(formatted);
    } else if (formatted === '') {
      if (onChange) onChange({ target: { name: props.name, value: '' } });
      if (onValueChange) onValueChange('');
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue && displayValue.length > 0 && displayValue.length < 5) {
      const normalized = normalizeTimeOnBlur(displayValue);
      setDisplayValue(normalized);
      if (normalized.length === 5) {
        if (onChange) onChange({ target: { name: props.name, value: normalized } });
        if (onValueChange) onValueChange(normalized);
      }
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="HH:MM"
        className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
        disabled={disabled}
        required={required}
        {...props}
      />
      <div className="absolute right-4 overflow-hidden text-on-surface-variant pointer-events-none z-10 hover:text-primary transition-colors">
        <Clock className="w-4 h-4" />
      </div>
      <input 
        type="time"
        value={value || ''}
        required={required}
        onChange={(e) => {
          if (onChange) onChange(e);
          if (onValueChange) onValueChange(e.target.value);
        }}
        className="absolute right-0 top-0 bottom-0 w-12 h-full opacity-0 cursor-pointer z-20"
        title="Selecionar horário"
        disabled={disabled}
      />
    </div>
  );
}
