// app/(public)/auth/AuthClient.tsx (updated with proper types)
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAuthForm } from "@/hooks/auth/useAuthForm";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useTechnicianCheck } from "@/hooks/technician_and_repairs/useTechnicianCheck";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegistrationForm } from "@/components/auth/RegistrationForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { TechnicianApplicationForm } from "@/components/auth/TechnicianApplicationForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { normalizeRedirectPath } from "@/lib/const";

type AuthMode = 'login' | 'register' | 'forgot-password';

interface VerificationDataType {
  token: string;
  email: string;
}

interface ResetDataType {
  token: string;
  email: string;
}

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetchUser, user } = useAuth();
  const { showApplication, setShowApplication, pendingUserId, pendingUserEmail } = useTechnicianCheck(user);

  // URL params
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectUrl = normalizeRedirectPath(rawRedirect) ?? "/dashboard";
  const oauthError = searchParams.get("error");
  const mode = searchParams.get("mode");
  const prefillEmail = searchParams.get("email") || "";
  const claimOrderNumber = searchParams.get("claimOrder") || undefined;

  // UI State
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(mode === "register" ? "register" : "login");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationDataType | null>(null);
  const [resetData, setResetData] = useState<ResetDataType | null>(null);

  useEffect(() => {
    setAuthMode(mode === "register" ? "register" : "login");
  }, [mode]);

  // Form state
  const { form, showPassword, fieldErrors, updateField, updatePhone, setShowPassword, setFieldError, validateRegistration, getFullName } = 
    useAuthForm(prefillEmail);

  // Actions
  const {
    handleLogin,
    handleRegister,
    handleForgotPassword,
    resetPassword,
    resendVerification,
    verifyEmail,
    isPending,
  } = useAuthActions({
    onVerificationNeeded: (data: VerificationDataType) => setVerificationData(data),
    onResetNeeded: (data: ResetDataType) => setResetData(data),
  });

  // If token present in URL (from email link), attempt automatic verification
  useEffect(() => {
    const tokenParam = searchParams.get("verify") || searchParams.get("token");
    if (!tokenParam) return;

    (async () => {
      try {
        const res = await verifyEmail.mutate({ token: tokenParam }) as any;
        toast.success(res?.message || "Email verified successfully");
        if (res?.email) {
          updateField('email', res.email);
        }
        setUnverifiedEmail(null);
        setVerificationData(null);
        setAuthMode('login');
        // Clean URL by navigating to /auth without query params
        try { router.replace('/auth'); } catch (e) { /* ignore */ }
      } catch (err: any) {
        toast.error(err?.message || "Email verification failed");
      }
    })();
  }, [searchParams, verifyEmail, updateField, router]);

  // OAuth error handling
  useEffect(() => {
    if (oauthError === "google_not_configured") {
      toast.error("Google Login is not configured yet. Please use email/password.");
    } else if (oauthError === 'google_failed') {
      toast.error('Google sign-in failed. Please try again.');
    } else if (oauthError === 'google_cancelled') {
      toast.error('Google sign-in was cancelled.');
    } else if (oauthError === 'facebook_failed') {
      toast.error('Facebook sign-in failed. Please try again.');
    } else if (oauthError === 'facebook_cancelled') {
      toast.error('Facebook sign-in was cancelled.');
    } else if (oauthError === 'facebook_no_email') {
      toast.error('Facebook did not share your email. Please use email/password instead.');
    } else if (oauthError === "facebook_not_configured") {
      toast.error("Facebook Login is not configured yet. Please use email/password.");
    }
  }, [oauthError]);

  // Handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'forgot-password') {
      await handleForgotPassword(form.email);
      return;
    }

    if (authMode === 'login') {
      const result = await handleLogin(form.email, form.password);
      // If account needs verification, surface a field-level error and show resend option
      if (result.needsVerification && result.email) {
        setUnverifiedEmail(result.email);
        setLoginError('Account must be verified to Sign in.');
        return;
      }
      if (result.success) {
        router.push(redirectUrl);
      }
      setLoginError(result.error || "Invalid email or password.");
      return;
    }

    if (authMode === 'register') {
      const error = validateRegistration();
      if (error) {
        toast.error(error);
        return;
      }

      const result = await handleRegister({
        first_name: form.firstName,
        last_name: form.lastName,
        surname: form.surname || undefined,
        email: form.email,
        password: form.password,
        phone: form.phone,
        country_code: form.countryCode || '+254',
        claimOrderNumber,
      });

      if (result.fieldError) {
        setFieldError(result.fieldError.field, result.fieldError.message);
        return;
      }

      if (result.success) {
        // Always show verification gate — never redirect straight to dashboard
        setUnverifiedEmail(form.email);
        return;
      }
    }
  }, [authMode, form, handleLogin, handleRegister, handleForgotPassword, validateRegistration, setFieldError, getFullName, claimOrderNumber, redirectUrl, verificationData]);

  const toggleAuthMode = useCallback(() => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
    setUnverifiedEmail(null);
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (unverifiedEmail) {
      const result = await resendVerification.mutate({ email: unverifiedEmail }) as VerificationDataType;
      toast.success("Verification email resent!");
      setVerificationData({ token: result.token, email: result.email });
    }
  }, [unverifiedEmail, resendVerification]);

  const handleTechnicianComplete = useCallback(() => {
    setShowApplication(false);
    toast.success("Thank you for applying! We'll review your application.");
    router.push("/dashboard");
  }, [router, setShowApplication]);

  // Memoized content
  const content = useMemo(() => {
    if (resetData) {
      return (
        <ResetPasswordForm
          resetData={resetData}
          resetPassword={resetPassword}
          resendCode={handleForgotPassword}
          onBackToLogin={() => { setResetData(null); setAuthMode('login'); }}
        />
      );
    }

    if (verificationData) {
      return (
        <VerifyEmailForm
          verificationData={verificationData}
          verifyEmail={verifyEmail}
          resendVerification={resendVerification}
          onVerified={() => { setVerificationData(null); setUnverifiedEmail(null); setAuthMode('login'); }}
          onBackToLogin={() => { setVerificationData(null); setAuthMode('login'); }}
        />
      );
    }

    const getModeConfig = () => {
      switch (authMode) {
        case 'login':
          return {
            title: "Welcome Back",
            description: "Sign in to your account to continue",
            form: (
              <LoginForm
                email={form.email}
                password={form.password}
                rememberMe={form.rememberMe}
                showPassword={showPassword}
                isLoading={isPending}
                onEmailChange={(v) => { updateField('email', v); setLoginError(null); }}
                onPasswordChange={(v) => { updateField('password', v); setLoginError(null); }}
                onRememberMeChange={(v) => updateField('rememberMe', v)}
                onTogglePassword={() => setShowPassword(prev => !prev)}
                onForgotPassword={() => setAuthMode('forgot-password')}
                onSubmit={handleSubmit}
                errorMessage={loginError}
                needsVerification={Boolean(unverifiedEmail)}
                onResendVerification={handleResendVerification}
              />
            ),
          };
        case 'register':
          return {
            title: "Create an Account",
            description: "Join us to track orders and save your details",
            form: (
              <RegistrationForm
                formData={form}
                showPassword={showPassword}
                isLoading={isPending}
                fieldErrors={fieldErrors}
                onFieldChange={updateField}
                onPhoneChange={updatePhone}
                onTogglePassword={() => setShowPassword(prev => !prev)}
                onSubmit={handleSubmit}
              />
            ),
          };
        case 'forgot-password':
          return {
            title: "Forgot Password",
            description: "We'll send you a code to reset it",
            form: (
              <ForgotPasswordForm
                email={form.email}
                isLoading={isPending}
                onEmailChange={(v) => updateField('email', v)}
                onSubmit={handleSubmit}
                onBack={() => setAuthMode('login')}
              />
            ),
          };
      }
    };

    const config = getModeConfig();

    return (
      <>
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-[var(--brand)]" />
          </div>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground text-sm mt-2">{config.description}</p>
        </div>

        {config.form}

        {unverifiedEmail && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center space-y-2">
            <p className="text-sm font-medium">
              {authMode === 'register'
                ? '📧 Check your inbox to verify your email before signing in.'
                : 'Your email is not verified yet.'}
            </p>
            <p className="text-xs text-muted-foreground">{unverifiedEmail}</p>
            <button
              onClick={handleResendVerification}
              disabled={resendVerification.isPending}
              className="text-sm text-[var(--brand)] hover:underline"
            >
              Resend verification email
            </button>
          </div>
        )}

        {authMode !== 'forgot-password' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-3 text-muted-foreground">OR</span>
              </div>
            </div>
            <OAuthButtons />
          </>
        )}

        <div className="mt-6 text-center">
          {authMode === 'forgot-password' ? (
            <button onClick={() => setAuthMode('login')} className="text-sm text-[var(--brand)] hover:underline">
              ← Back to Login
            </button>
          ) : (
            <button onClick={toggleAuthMode} className="text-sm text-[var(--brand)] hover:underline">
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          )}
        </div>
      </>
    );
  }, [authMode, form, showPassword, isPending, resetData, verificationData, unverifiedEmail, 
      handleSubmit, updateField, updatePhone, setShowPassword, toggleAuthMode, handleResendVerification,
      resetPassword, handleForgotPassword, verifyEmail, resendVerification]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 shadow-xl relative">
          {isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--brand)] mb-4" />
              <p className="text-sm font-medium animate-pulse">Please wait...</p>
            </div>
          )}
          {content}
        </Card>
      </div>
      <Footer />

      {showApplication && (
        <TechnicianApplicationForm
          userEmail={pendingUserEmail}
          userId={pendingUserId}
          onClose={() => { setShowApplication(false); router.push("/dashboard"); }}
          onSuccess={handleTechnicianComplete}
        />
      )}
    </div>
  );
}