"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SuccessStateProps {
  email: string;
  onSendAnother: () => void;
}

export const SuccessState = memo(function SuccessState({ email, onSendAnother }: SuccessStateProps) {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Invitation Sent</h2>
      <p className="text-muted-foreground text-sm mb-6">
        An invitation has been sent to <strong>{email}</strong>. They will receive instructions to join the federated network.
      </p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onSendAnother}>
          Send Another
        </Button>
        <Link href="/admin/network">
          <Button>Back to Network</Button>
        </Link>
      </div>
    </div>
  );
});