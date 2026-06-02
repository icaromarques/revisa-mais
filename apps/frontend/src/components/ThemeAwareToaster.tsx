import { Toaster } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeAwareToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme}
      richColors
      duration={3000}
      visibleToasts={3}
      closeButton
      expand={false}
    />
  );
}
