// app/(public)/auth/AuthClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { useMutation } from "@/lib/api-hooks";
import { proxyClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, Mail, User, Eye, EyeOff, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Components
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { TechnicianApplicationForm } from "@/components/auth/TechnicianApplicationForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

// Hooks
import { useTechnicianCheck } from "@/hooks/technician_and_repairs/useTechnicianCheck";

// Utils
import { formatPhone } from "@/lib/utils/phoneFormatter";
import { validatePassword, validatePhone } from "@/lib/utils/validators";
import { FormState, ResetData, VerificationData } from "@/types/auth.types";

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetchUser, user } = useAuth();

  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const oauthError = searchParams.get("error");
  const mode = searchParams.get("mode");
  const prefillEmail = searchParams.get("email") || "";
  const claimOrderNumber = searchParams.get("claimOrder") || undefined;

  // UI State
  const [isLogin, setIsLogin] = useState(mode !== "register");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [resetData, setResetData] = useState<ResetData | null>(null);
  
  // Technician check
  const { showApplication, setShowApplication, pendingUserId, pendingUserEmail } = useTechnicianCheck(user);

  // Form state
  const [form, setForm] = useState<FormState>({
    firstName: "", lastName: "", surname: "", phone: "",
    email: prefillEmail, password: "", confirmPassword: "",
    acceptTerms: false, rememberMe: false,
  });

  // Mutations
  const login = useMutation((data: any) => proxyClient.post("/api/auth/login", data));
  const register = useMutation((data: any) => proxyClient.post("/api/auth/register", data));
  const forgotPassword = useMutation((data: any) => proxyClient.post("/api/auth/reset-password-request", data));
  const resetPassword = useMutation((data: any) => proxyClient.post("/api/auth/reset-password", data));
  const resendVerification = useMutation((data: any) => proxyClient.post("/api/auth/resend-verification", data));
  const verifyEmail = useMutation((data: any) => proxyClient.post("/api/auth/verify-email", data));

  // OAuth error handling
  useEffect(() => {
    if (oauthError === "google_not_configured") {
      toast.error("Google Login is not configured yet. Please use email/password.");
    } else if (oauthError === "facebook_not_configured") {
      toast.error("Facebook Login is not configured yet. Please use email/password.");
    }
  }, [oauthError]);

  // Success handlers
  const handleLoginSuccess = async () => {
    toast.success("Successfully logged in");
    window.dispatchEvent(new Event("userAuthChanged"));
    await refetchUser();
  };

  const handleRegisterSuccess = (data: any) => {
    toast.success("Account created! Please check your email for the verification code.");
    setVerificationData({ token: data.token, email: data.email });
    setForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
  };

  const handleForgotPasswordSuccess = (data: any) => {
    toast.success("Password reset code sent to your email!");
    setResetData({ token: data.token, email: data.email });
    setIsForgotPassword(false);
  };

  const handleResetPasswordSuccess = () => {
    toast.success("Password updated successfully! Please sign in.");
    setResetData(null);
    setIsLogin(true);
  };

  const handleVerifyEmailSuccess = () => {
    toast.success("Email verified successfully! You can now sign in.");
    setVerificationData(null);
    setIsLogin(true);
  };

  const handleTechnicianApplicationComplete = () => {
    setShowApplication(false);
    toast.success("Thank you for applying! We'll review your application.");
    router.push("/dashboard");
  };

  // Wrapped mutations
  const wrappedVerifyEmail = { ...verifyEmail, mutate: async (data: any) => {
    const result = await verifyEmail.mutate(data);
    handleVerifyEmailSuccess();
    return result;
  }};

  const wrappedResetPassword = { ...resetPassword, mutate: async (data: any) => {
    const result = await resetPassword.mutate(data);
    handleResetPasswordSuccess();
    return result;
  }};

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isForgotPassword) {
      forgotPassword.mutate({ email: form.email })
        .then(handleForgotPasswordSuccess)
        .catch((err: Error) => toast.error(err.message || "Failed to request password reset"));
      return;
    }

    if (isLogin) {
      login.mutate({ email: form.email, password: form.password })
        .then(handleLoginSuccess)
        .catch((err: Error) => {
          toast.error(err.message || "Login failed");
          if (err.message?.toLowerCase().includes("verify")) setUnverifiedEmail(form.email);
        });
      return;
    }

    // Registration validation
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
    const pwdError = validatePassword(form.password);
    if (pwdError) return toast.error(pwdError);
    const phoneError = validatePhone(form.phone);
    if (phoneError) return toast.error(phoneError);
    if (!form.acceptTerms) return toast.error("Please accept the Terms & Conditions");

    const fullName = [form.firstName, form.lastName, form.surname].filter(Boolean).join(" ");
    register.mutate({ name: fullName, email: form.email, password: form.password, phone: form.phone, claimOrderNumber })
      .then(handleRegisterSuccess)
      .catch((err: Error) => toast.error(err.message || "Registration failed"));
  };

  const isPending = login.isPending || register.isPending || forgotPassword.isPending ||
    resetPassword.isPending || resendVerification.isPending || verifyEmail.isPending;

  const toggleAuthMode = () => {
    setIsLogin(p => !p);
    setUnverifiedEmail(null);
    login.reset();
    register.reset();
  };

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

          {resetData ? (
            <ResetPasswordForm
              resetData={resetData}
              resetPassword={wrappedResetPassword}
              resendCode={forgotPassword}
              onBackToLogin={() => { setResetData(null); setIsLogin(true); }}
            />
          ) : verificationData ? (
            <VerifyEmailForm
              verificationData={verificationData}
              verifyEmail={wrappedVerifyEmail}
              resendVerification={resendVerification}
              onBackToLogin={() => { setVerificationData(null); setIsLogin(true); }}
            />
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-[var(--brand)]" />
                </div>
                <h1 className="text-2xl font-bold">
                  {isForgotPassword ? "Forgot Password" : isLogin ? "Welcome Back" : "Create an Account"}
                </h1>
                <p className="text-muted-foreground text-sm mt-2">
                  {isForgotPassword ? "We'll send you a code to reset it" :
                   isLogin ? "Sign in to your account to continue" :
                   "Join us to track orders and save your details"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Registration fields */}
                {!isLogin && !isForgotPassword && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input required className="pl-10" value={form.firstName}
                            onChange={e => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input required className="pl-10" value={form.lastName}
                            onChange={e => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input required placeholder="+254 712 345 678" className="pl-10"
                          value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} />
                      </div>
                    </div>
                  </>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" required className="pl-10" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>

                {/* Password */}
                {!isForgotPassword && (
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} required className="pl-10 pr-10"
                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                      <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-2.5">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm password */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} required className="pl-10"
                        value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Terms */}
                {!isLogin && !isForgotPassword && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="terms" className="rounded w-4 h-4"
                      checked={form.acceptTerms} onChange={e => setForm({ ...form, acceptTerms: e.target.checked })} />
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                      I agree to the <a href="/legal/terms-of-service" className="text-[var(--brand)] hover:underline">Terms</a>
                    </Label>
                  </div>
                )}

                {/* Forgot password link */}
                {isLogin && !isForgotPassword && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="remember" className="rounded w-4 h-4"
                        checked={form.rememberMe} onChange={e => setForm({ ...form, rememberMe: e.target.checked })} />
                      <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember Me</Label>
                    </div>
                    <button type="button" onClick={() => setIsForgotPassword(true)}
                      className="text-sm font-medium text-[var(--brand)] hover:underline">
                      Forgot Password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full bg-[var(--brand)] text-white h-11">
                  {isForgotPassword ? "Send Reset Code" : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              {/* Resend verification */}
              {unverifiedEmail && isLogin && !isForgotPassword && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm mb-2">Didn't receive the verification email?</p>
                  <Button variant="outline" className="w-full" disabled={resendVerification.isPending}
                    onClick={() => resendVerification.mutate({ email: unverifiedEmail })
                      .then((data: any) => {
                        toast.success("Verification email resent!");
                        setVerificationData({ token: data.token, email: data.email });
                      })}
                  >
                    Resend Verification Code
                  </Button>
                </div>
              )}

              {/* OAuth buttons */}
              {!isForgotPassword && (
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

              {/* Toggle auth mode */}
              <div className="mt-6 text-center">
                {isForgotPassword ? (
                  <button onClick={() => setIsForgotPassword(false)} className="text-sm text-[var(--brand)] hover:underline">
                    ← Back to Login
                  </button>
                ) : (
                  <button onClick={toggleAuthMode} className="text-sm text-[var(--brand)] hover:underline">
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
      <Footer />

      {/* Technician Application Modal */}
      {showApplication && (
        <TechnicianApplicationForm
          userEmail={pendingUserEmail}
          userId={pendingUserId}
          onClose={() => { setShowApplication(false); router.push("/dashboard"); }}
          onSuccess={handleTechnicianApplicationComplete}
        />
      )}
    </div>
  );
}