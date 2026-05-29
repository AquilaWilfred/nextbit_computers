// components/auth/RegistrationForm.tsx
import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';

interface RegistrationFormProps {
  formData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  };
  showPassword: boolean;
  isLoading: boolean;
  onFieldChange: (field: string, value: any) => void;
  onPhoneChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RegistrationForm: FC<RegistrationFormProps> = ({
  formData,
  showPassword,
  isLoading,
  onFieldChange,
  onPhoneChange,
  onTogglePassword,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              required
              className="pl-10"
              value={formData.firstName}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              required
              className="pl-10"
              value={formData.lastName}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            required
            placeholder="+254 712 345 678"
            className="pl-10"
            value={formData.phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            required
            className="pl-10"
            value={formData.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            required
            className="pl-10 pr-10"
            value={formData.password}
            onChange={(e) => onFieldChange('password', e.target.value)}
            disabled={isLoading}
          />
          <button type="button" onClick={onTogglePassword} className="absolute right-3 top-2.5">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            required
            className="pl-10"
            value={formData.confirmPassword}
            onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="terms"
          className="rounded w-4 h-4"
          checked={formData.acceptTerms}
          onChange={(e) => onFieldChange('acceptTerms', e.target.checked)}
          disabled={isLoading}
        />
        <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
          I agree to the <a href="/legal/terms-of-service" className="text-[var(--brand)] hover:underline">Terms</a>
        </Label>
      </div>

      <Button type="submit" className="w-full bg-[var(--brand)] text-white h-11" disabled={isLoading}>
        Create Account
      </Button>
    </form>
  );
};