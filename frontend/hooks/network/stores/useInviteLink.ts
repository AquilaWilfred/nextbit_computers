import { useState, useCallback } from "react";
import { toast } from "sonner";
import { generateInviteToken, getInviteLink } from "@/lib/utils/network/stores/invite.utils";

export function useInviteLink() {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateLink = useCallback(async () => {
    setGenerating(true);
    try {
      const token = generateInviteToken();
      const link = getInviteLink(token);
      setInviteLink(link);
      toast.success("Invite link generated");
      return link;
    } finally {
      setGenerating(false);
    }
  }, []);

  const copyLink = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied to clipboard");
  }, [inviteLink]);

  const regenerateLink = useCallback(() => {
    generateLink();
  }, [generateLink]);

  return {
    inviteLink,
    generating,
    generateLink,
    copyLink,
    regenerateLink,
  };
}