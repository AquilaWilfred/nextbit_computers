"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, LogIn, ArrowLeft } from "lucide-react";

export default function B2BLoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [companyCode, setCompanyCode] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/b2b");
    }
  }, [user, router]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/auth?redirect=/b2b");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <Card className="p-8">
          <div className="flex flex-col gap-3 mb-8">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                Corporate access
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Sign in to your B2B corporate portal.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                Enter your company passcode and access PIN, then continue to the secure sign-in page.
                If you do not have a corporate account yet, apply now.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Company passcode</label>
                <Input
                  placeholder="e.g. P051234567B"
                  value={companyCode}
                  onChange={(event) => setCompanyCode(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Access PIN</label>
                <Input
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit" className="w-full bg-primary text-primary-foreground">
                <LogIn className="w-4 h-4 mr-2" /> Continue to sign in
              </Button>
              <Link href="/b2b/registration" className="w-full">
                <Button variant="outline" className="w-full">
                  Apply for corporate account
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-semibold">Need help?</p>
              <p className="mt-2">
                If your company is already in the system, you will be redirected to the main authentication page.
                New partners should submit a B2B application.
              </p>
            </div>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <Link href="/b2b" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" /> Return to B2B home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
