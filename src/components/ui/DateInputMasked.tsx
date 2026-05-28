import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateInput, isoToDateDisplay, dateDisplayToISO } from '@/lib/inputMasks';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string; // YYYY-MM-DD
  onChange?: (e: any) => void;
  onValueChange?: (val: string) => void;
}

export function DateInputMasked({ value, onChange, onValueChange, className, disabled, required, ...props }: Props) {
  const [displayValue, setDisplayValue] = useState(isoToDateDisplay(value));

  useEffect(() => {
    setDisplayValue(isoToDateDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDisplayValue(formatted);
    
    // Only update underlying value if it's explicitly cleared or fully valid
    if (formatted === '') {
      if (onChange) onChange({ target: { name: props.name, value: '' } });
      if (onValueChange) onValueChange('');
    } else {
      const parsed = dateDisplayToISO(formatted);
      if (parsed) {
        if (onChange) onChange({ target: { name: props.name, value: parsed } });
        if (onValueChange) onValueChange(parsed);
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Attempt strict parse if incomplete on blur? Actually, leave it as is, standard behavior.
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="DD/MM/AAAA"
        className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
        disabled={disabled}
        required={required}
        {...props}
      />
      <div className="absolute right-4 overflow-hidden text-on-surface-variant pointer-events-none z-10 hover:text-primary transition-colors">
        <Calendar className="w-4 h-4" />
      </div>
      <input 
        type="date"
        value={value || ''}
        required={required}
        onChange={(e) => {
          if (onChange) onChange(e);
          if (onValueChange) onValueChange(e.target.value);
        }}
        className="absolute right-0 top-0 bottom-0 w-12 h-full opacity-0 cursor-pointer z-20"
        title="Abrir calendário"
        disabled={disabled}
      />
    </div>
  );
}
