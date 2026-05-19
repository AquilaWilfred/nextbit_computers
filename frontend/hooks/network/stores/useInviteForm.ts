import { useState, useCallback } from "react";
import { InviteForm, InviteFormKey } from "@/types/network/stores/invite.types";
import { EMPTY_FORM } from "@/constants/network/stores/invite.constants";

export function useInviteForm() {
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [sent, setSent] = useState(false);

  const updateField = useCallback((key: InviteFormKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFieldChange = useCallback(
    (key: InviteFormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, e.target.value);
    },
    [updateField]
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setSent(false);
  }, []);

  const markAsSent = useCallback(() => {
    setSent(true);
  }, []);

  return {
    form,
    sent,
    updateField,
    handleFieldChange,
    resetForm,
    markAsSent,
  };
}