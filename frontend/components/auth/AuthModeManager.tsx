// components/auth/AuthModeManager.tsx
import { FC, ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface AuthModeManagerProps {
  mode: 'login' | 'register' | 'forgot-password';
  title: string;
  description: string;
  children: ReactNode;
}

export const AuthModeManager: FC<AuthModeManagerProps> = ({
  mode,
  title,
  description,
  children,
}) => {
  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[var(--brand)]" />
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm mt-2">{description}</p>
      </div>
      {children}
    </>
  );
};