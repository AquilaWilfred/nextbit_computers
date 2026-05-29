// components/ui/form-input.tsx
import { forwardRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
          <Input
            ref={ref}
            id={inputId}
            className={cn(icon && 'pl-10', error && 'border-red-500', className)}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';