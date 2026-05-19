import { InviteForm } from "@/types/network/stores/invite.types";

export const EMPTY_FORM: InviteForm = {
  storeName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  message: "",
};

export const ONBOARDING_STEPS = [
  "Store receives an invitation email with onboarding instructions.",
  "They complete registration and their branch is created with status Pending.",
  "You approve or reject from Network > Stores.",
  "Once approved, they enable federation to share inventory network-wide.",
];