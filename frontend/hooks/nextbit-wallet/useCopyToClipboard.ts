import { useCallback } from 'react';
import { toast } from 'sonner';

export function useCopyToClipboard() {
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  }, []);

  return { copyToClipboard };
}