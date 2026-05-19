"use client";

import { InviteHeader } from "@/components/network/stores/invites/InviteHeader";
import { StoreDetailsForm } from "@/components/network/stores/invites/StoreDetailsForm";
import { PersonalMessageInput } from "@/components/network/stores/invites/PersonalMessageInput";
import { InviteLinkCard } from "@/components/network/stores/invites/InviteLinkCard";
import { HelpCard } from "@/components/network/stores/invites/HelpCard";
import { SuccessState } from "@/components/network/stores/invites/SuccessState";
import { useInviteForm } from "@/hooks/network/stores/useInviteForm";
import { useSendInvite } from "@/hooks/network/stores/useSendInvite";
import { useInviteLink } from "@/hooks/network/stores/useInviteLink";

export default function InviteStorePage() {
  const { form, sent, handleFieldChange, resetForm, markAsSent } = useInviteForm();
  const { sending, sendInvite } = useSendInvite();
  const { inviteLink, generating, generateLink, copyLink, regenerateLink } = useInviteLink();

  const handleSendInvite = async () => {
    const success = await sendInvite(form);
    if (success) {
      markAsSent();
    }
  };

  const handleSendAnother = () => {
    resetForm();
  };

  if (sent) {
    return (
      <div>
        <SuccessState email={form.email} onSendAnother={handleSendAnother} />
      </div>
    );
  }

  return (
    <div>
      <InviteHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <StoreDetailsForm form={form} onFieldChange={handleFieldChange} />
          <PersonalMessageInput
            message={form.message}
            onMessageChange={handleFieldChange("message")}
            onSend={handleSendInvite}
            isSending={sending}
          />
        </div>

        <div className="space-y-4">
          <InviteLinkCard
            inviteLink={inviteLink}
            generating={generating}
            onGenerate={generateLink}
            onCopy={copyLink}
            onRegenerate={regenerateLink}
          />
          <HelpCard />
        </div>
      </div>
    </div>
  );
}