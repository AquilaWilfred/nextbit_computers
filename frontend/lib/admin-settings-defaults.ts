import {
  APPEARANCE_DEFAULTS,
  BACKUP_DEFAULTS,
  EMAIL_DEFAULTS,
  GENERAL_DEFAULTS,
  PAYMENT_DEFAULTS,
  SECURITY_DEFAULTS,
  SOCIAL_DEFAULTS,
  SHIPPING_DEFAULTS,
} from "@/app/(admin-group)/admin/settings/types";

export const ADMIN_SETTINGS_DEFAULTS = {
  general: GENERAL_DEFAULTS,
  appearance: APPEARANCE_DEFAULTS,
  payment: PAYMENT_DEFAULTS,
  shipping: SHIPPING_DEFAULTS,
  email: EMAIL_DEFAULTS,
  security: SECURITY_DEFAULTS,
  social: SOCIAL_DEFAULTS,
  backup: BACKUP_DEFAULTS,
  brands: ["Samsung", "Dell", "HP", "Lenovo", "Asus", "Apple", "Acer"],
  payment_methods: {
    mpesa: true,
    paypal: true,
    stripe: true,
    bank_transfer: false,
    cash_on_delivery: true,
  },
  mpesa_b2c: {
    consumerKey: "",
    consumerSecret: "",
    shortcode: "",
    initiatorName: "",
    initiatorPassword: "",
    certContent: "",
    apiHost: "sandbox",
  },
  ai: {
    model: "gpt-4o-mini",
    systemPrompt:
      "You are a helpful e-commerce assistant for the admin panel of this online store.",
    knowledgeBaseFiles: [],
  },
  ai_knowledge: "",
} as const;

export type AdminSettingKey = keyof typeof ADMIN_SETTINGS_DEFAULTS;
