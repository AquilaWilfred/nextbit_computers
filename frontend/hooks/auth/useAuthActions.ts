// hooks/auth/useAuthActions.ts
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { useMutation } from '@/lib/api-hooks';
import { proxyClient } from '@/lib/api-client';
import { toast } from 'sonner';

// Define response types
interface AuthResponse {
  token?: string;
  email?: string;
  user?: any;
  message?: string;
}

interface VerificationData {
  token: string;
  email: string;
}

interface ResetData {
  token: string;
  email: string;
}

interface AuthActionsProps {
  onVerificationNeeded: (data: VerificationData) => void;
  onResetNeeded: (data: ResetData) => void;
}

export function useAuthActions({ onVerificationNeeded, onResetNeeded }: AuthActionsProps) {
  const router = useRouter();
  const { refetchUser } = useAuth();

  const login = useMutation((data: any) => proxyClient.post("/api/auth/login", data));
  const register = useMutation((data: any) => proxyClient.post("/api/auth/register", data));
  const forgotPassword = useMutation((data: any) => proxyClient.post("/api/auth/reset-password-request", data));
  const resetPassword = useMutation((data: any) => proxyClient.post("/api/auth/reset-password", data));
  const resendVerification = useMutation((data: any) => proxyClient.post("/api/auth/resend-verification", data));
  const verifyEmail = useMutation((data: any) => proxyClient.post("/api/auth/verify-email", data));

  const handleLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean; email?: string }> => {
    try {
      await login.mutate({ email, password });
      toast.success("Successfully logged in");
      window.dispatchEvent(new Event("userAuthChanged"));
      await refetchUser();
      return { success: true };
    } catch (err: any) {
      toast.error(err.message || "Login failed");
      if (err.message?.toLowerCase().includes("verify")) {
        return { success: false, needsVerification: true, email };
      }
      return { success: false };
    }
  }, [login, refetchUser]);

  const handleRegister = useCallback(async (data: any): Promise<{ success: boolean; data?: AuthResponse }> => {
    try {
      const result = await register.mutate(data) as AuthResponse;
      toast.success("Account created! Please check your email for the verification code.");
      if (result.token && result.email) {
        onVerificationNeeded({ token: result.token, email: result.email });
      }
      return { success: true, data: result };
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
      return { success: false };
    }
  }, [register, onVerificationNeeded]);

  const handleForgotPassword = useCallback(async (email: string): Promise<{ success: boolean }> => {
    try {
      const result = await forgotPassword.mutate({ email }) as AuthResponse;
      toast.success("Password reset code sent to your email!");
      if (result.token && result.email) {
        onResetNeeded({ token: result.token, email: result.email });
      }
      return { success: true };
    } catch (err: any) {
      toast.error(err.message || "Failed to request password reset");
      return { success: false };
    }
  }, [forgotPassword, onResetNeeded]);

  const isPending = login.isPending || register.isPending || forgotPassword.isPending ||
    resetPassword.isPending || resendVerification.isPending || verifyEmail.isPending;

  return {
    login,
    register,
    forgotPassword,
    resetPassword,
    resendVerification,
    verifyEmail,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    isPending,
  };
}