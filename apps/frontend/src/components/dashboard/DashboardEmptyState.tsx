import { LucideIcon } from 'lucide-react';
import React from 'react';

interface Props {
  icon: LucideIcon;
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function DashboardEmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-8'}`}>
      <div className={`bg-surface-container rounded-full flex items-center justify-center mb-3 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
        <Icon className={`text-outline ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </div>
      {title && <h4 className={`font-bold text-on-surface ${compact ? 'text-xs' : 'text-sm mb-1'}`}>{title}</h4>}
      <p className={`text-on-surface-variant italic ${compact ? 'text-[10px]' : 'text-xs mb-4'}`}>{description}</p>
      {action && (
        <button 
          onClick={action.onClick}
          className={`${compact ? 'mt-2 text-[10px]' : 'text-xs'} font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
