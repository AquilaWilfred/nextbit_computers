// components/auth/RegistrationForm.tsx
import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, Phone, Eye, EyeOff, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
];

interface RegistrationFormProps {
  formData: {
    firstName: string;
    lastName: string;
    surname: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
    countryCode: string;
  };
  showPassword: boolean;
  isLoading: boolean;
  fieldErrors?: { [key: string]: string };
  onFieldChange: (field: string, value: any) => void;
  onPhoneChange: (value: string, countryCode?: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RegistrationForm: FC<RegistrationFormProps> = ({
  formData,
  showPassword,
  isLoading,
  fieldErrors = {},
  onFieldChange,
  onPhoneChange,
  onTogglePassword,
  onSubmit,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const countryCode = formData.countryCode || '+254';
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const handleCountrySelect = (code: string) => {
    onFieldChange('countryCode', code);
    if (formData.phone) {
      onPhoneChange(formData.phone, code);
    }
    setDropdownOpen(false);
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value, countryCode);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">

      {/* First Name + Last Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              required
              placeholder="John"
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
              placeholder="Doe"
              className="pl-10"
              value={formData.lastName}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Surname (full width) */}
      <div className="space-y-2">
        <Label>Surname <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g. Kamau"
            className="pl-10"
            value={formData.surname}
            onChange={(e) => onFieldChange('surname', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Country Code + Phone */}
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="flex gap-2">
          {/* Country code dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={isLoading}
              className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors min-w-[90px]"
            >
              <span className="text-base leading-none">{selectedCountry.flag}</span>
              <span className="font-mono text-xs">{selectedCountry.code}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
            </button>
            {dropdownOpen && (
              <div className="absolute z-50 top-11 left-0 w-56 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-60">
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c.code)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone number input */}
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              required
              type="tel"
              placeholder="712 345 678"
              className="pl-10"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            required
            placeholder="john@example.com"
            className={`pl-10 ${fieldErrors.email ? 'border-red-500 bg-red-50' : ''}`}
            value={formData.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            disabled={isLoading}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-red-500 text-sm">
            {fieldErrors.email}{' '}
            <a href="/auth?mode=login" className="font-semibold underline hover:text-red-600">
              Sign in now
            </a>
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            className="pl-10 pr-10"
            value={formData.password}
            onChange={(e) => onFieldChange('password', e.target.value)}
            disabled={isLoading}
          />
          <button type="button" onClick={onTogglePassword} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label>Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            className="pl-10"
            value={formData.confirmPassword}
            onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Terms */}
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
          I agree to the{' '}
          <a href="/legal/terms-of-service" className="text-[var(--brand)] hover:underline">Terms & Conditions</a>
        </Label>
      </div>

      <Button type="submit" className="w-full bg-[var(--brand)] text-white h-11" disabled={isLoading}>
        {isLoading ? 'Creating account…' : 'Create Account'}
      </Button>
    </form>
  );
};
