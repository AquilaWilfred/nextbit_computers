// components/ResetPasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ResetData } from "@/types/auth.types";
import { validatePassword } from "@/lib/utils/validators";

interface ResetPasswordFormProps {
  resetData: ResetData;
  resetPassword: any;
  resendCode: any;
  onBackToLogin: () => void;
}

export function ResetPasswordForm({
  resetData,
  resetPassword,
  resendCode,
  onBackToLogin,
}: ResetPasswordFormProps) {
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const err = validatePassword(password);
    if (err) {
      toast.error(err);
      return;
    }
    resetPassword.mutate({ token: resetData.token, code: otpCode, newPassword: password });
  };

  const handleResend = () => {
    resendCode.mutate({ email: resetData.email }).then(() => setResendTimer(60));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-display">Reset Password</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Enter the 6-digit code sent to <strong>{resetData.email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
          <Label>Reset Code</Label>
          <div className="relative flex justify-center gap-2 mt-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                  otpCode.length === i
                    ? "border-[var(--brand)] ring-4 ring-[var(--brand)]/20"
                    : otpCode.length > i
                    ? "border-foreground"
                    : "border-border bg-muted/30"
                }`}
              >
                {otpCode[i] || ""}
              </div>
            ))}
            <input
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-2.5"
              >
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
                placeholder="••••••••"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[var(--brand)] text-white h-11"
          disabled={otpCode.length !== 6 || resetPassword.isPending}
        >
          {resetPassword.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </form>

      <div className="text-center mt-6 space-y-4">
        {resendTimer > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend code in <span className="font-medium">{resendTimer}s</span>
          </p>
        ) : (
          <button onClick={handleResend} className="text-sm font-medium text-[var(--brand)] hover:underline">
            Resend Code
          </button>
        )}
        <button onClick={onBackToLogin} className="text-sm text-muted-foreground hover:underline block w-full">
          ← Back to Login
        </button>
      </div>
    </div>
  );
}