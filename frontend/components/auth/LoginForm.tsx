// components/auth/LoginForm.tsx
import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  isLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  errorMessage?: string;
}

export const LoginForm: FC<LoginFormProps> = ({
  email,
  password,
  rememberMe,
  showPassword,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onTogglePassword,
  onForgotPassword,
  onSubmit,
  errorMessage
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className={`absolute left-3 top-3 h-4 w-4 ${errorMessage ? 'text-red-500' : 'text-muted-foreground'}`} />
          <Input
            type="email"
            required
            className={`pl-10 transition-colors ${errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className={`absolute left-3 top-3 h-4 w-4 ${errorMessage ? 'text-red-500' : 'text-muted-foreground'}`} />
          <Input
            type={showPassword ? "text" : "password"}
            required
            className={`pl-10 pr-10 transition-colors ${errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-2.5"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="rounded w-4 h-4"
            checked={rememberMe}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            disabled={isLoading}
          />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
            Remember Me
          </Label>
        </div>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-[var(--brand)] hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      {errorMessage && (
        <div
          key={errorMessage}
          className="shake flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2"
        >
          <Lock className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button type="submit" className="w-full bg-[var(--brand)] text-white h-11" disabled={isLoading}>
        Sign In
      </Button>
    </form>
  );
};