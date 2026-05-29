// components/auth/ForgotPasswordForm.tsx
import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';

interface ForgotPasswordFormProps {
  email: string;
  isLoading: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({
  email,
  isLoading,
  onEmailChange,
  onSubmit,
  onBack,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            required
            className="pl-10"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full bg-[var(--brand)] text-white h-11" disabled={isLoading}>
        Send Reset Code
      </Button>

      <Button type="button" variant="outline" className="w-full" onClick={onBack} disabled={isLoading}>
        Back to Login
      </Button>
    </form>
  );
};