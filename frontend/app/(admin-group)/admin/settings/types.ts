// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Feature {
  icon: string;
  title: string;
  desc: string;
  content: string;
}

export interface OpeningHour {
  label: string;
  value: string;
}

export interface FloatingBadge {
  icon: string;
  title: string;
  desc: string;
}

export interface Lifestyle {
  title: string;
  description: string;
  icon: string;
  color: string;
  link: string;
}

export interface LogoTextEntry {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  font: string;
  color: string;
  position: "default" | "left" | "right" | "top" | "bottom";
}

// ─── Section-specific types ───────────────────────────────────────────────────

export interface GeneralSettings {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: string;
  heroBadge: string;
  ctaTitle: string;
  ctaDescription: string;
  statsProductCount: string;
  statsCustomerCount: string;
  statsAvgRating: string;
  features: Feature[];
  openingHours: OpeningHour[];
  floatingBadge1: FloatingBadge;
  floatingBadge2: FloatingBadge;
  lifestyles: Lifestyle[];
}

export interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  promoBannerColor: string;
  logoUrl: string;
  faviconUrl: string;
  logoWidth: number;
  logoHeight: number;
  logoTextSide: string;
  logoTextDisplay: string;
  logoTextSpacing: number;
  logoOpacity: number;
  logoCropMode: string;
  logoCropAmount: number;
  footerAdText: string;
  logoTextItems: LogoTextEntry[];
  userTheme: string;
  adminTheme: string;
}

export interface PaymentSettings {
  mpesaKey: string;
  mpesaSecret: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaEnv: string;
  paypalClientId: string;
  paypalSecret: string;
  stripePublishable: string;
  stripeSecret: string;
  codEnabled: boolean;
}

export interface ShippingSettings {
  standardFee: string;
  expressDelivery: string;
  freeShippingThreshold: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  orderConfirmation: boolean;
  shippingNotification: boolean;
  abandonedCartReminder: boolean;
  orderConfirmationMessage: string;
  shippingNotificationMessage: string;
  productImageWidth: string;
  emailBackgroundColor: string;
  emailButtonColor: string;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  loginAttemptLimit: string;
  captchaEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  facebookAppId: string;
  facebookAppSecret: string;
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
}

export interface BackupSettings {
  schedule: "daily" | "weekly" | "monthly";
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const GENERAL_DEFAULTS: GeneralSettings = {
  storeName: "Store",
  storeDescription: "Premium Computer & Laptop Store",
  contactEmail: "support@company.com",
  phone: "+254 724 704 865",
  address: "123 Innovation Drive, Nairobi, Kenya",
  currency: "USD",
  timezone: "Africa/Nairobi",
  heroTitle: "Premium Tech, Exceptional Performance",
  heroDescription:
    "Discover the latest laptops, desktops, and accessories from the world's leading brands.",
  heroImage: "",
  heroBadge: "New Arrivals 2025",
  ctaTitle: "Ready to Upgrade Your Setup?",
  ctaDescription:
    "Join thousands of satisfied customers. Shop the latest tech with confidence.",
  statsProductCount: "",
  statsCustomerCount: "",
  statsAvgRating: "",
  features: [
    {
      icon: "Truck",
      title: "Free Shipping",
      desc: "On orders over $500",
      content:
        "Fast, free standard shipping on all orders over $500, delivered in 3-5 business days.",
    },
    {
      icon: "Shield",
      title: "2-Year Warranty",
      desc: "On all products",
      content:
        "Every product is backed by a comprehensive 2-year warranty covering manufacturer defects.",
    },
    {
      icon: "RefreshCw",
      title: "30-Day Returns",
      desc: "Hassle-free returns",
      content:
        "Return any item in original condition within 30 days for a full refund or exchange.",
    },
    {
      icon: "Award",
      title: "Certified Products",
      desc: "100% authentic hardware",
      content:
        "All products are 100% authentic, sourced directly from official manufacturers.",
    },
  ],
  openingHours: [
    { label: "Mon - Fri", value: "9:00 AM - 8:00 PM" },
    { label: "Saturday", value: "10:00 AM - 6:00 PM" },
    { label: "Sunday", value: "Closed" },
  ],
  floatingBadge1: { icon: "Shield", title: "Verified Quality", desc: "All products certified" },
  floatingBadge2: { icon: "Truck", title: "Fast Delivery", desc: "2–5 business days" },
  lifestyles: [
    {
      title: "Creative & Technical",
      description: "For designers, developers, and artists.",
      icon: "Palette",
      color: "text-purple-500 bg-purple-500/10",
      link: "/products?tag=creative",
    },
    {
      title: "Professional",
      description: "For business, productivity, and meetings.",
      icon: "Briefcase",
      color: "text-blue-500 bg-blue-500/10",
      link: "/products?tag=professional",
    },
    {
      title: "Gaming",
      description: "For high-performance, immersive gaming.",
      icon: "Gamepad2",
      color: "text-red-500 bg-red-500/10",
      link: "/products?tag=gaming",
    },
    {
      title: "School & Hobbies",
      description: "For students, learning, and personal projects.",
      icon: "BookOpen",
      color: "text-green-500 bg-green-500/10",
      link: "/products?tag=student",
    },
  ],
};

export const APPEARANCE_DEFAULTS: AppearanceSettings = {
  primaryColor: "#0284c7",
  secondaryColor: "#0ea5e9",
  promoBannerColor: "#0369a1",
  logoUrl: "",
  faviconUrl: "",
  logoWidth: 120,
  logoHeight: 56,
  logoTextSide: "none",
  logoTextDisplay: "inline",
  logoTextSpacing: 16,
  logoOpacity: 1,
  logoCropMode: "none",
  logoCropAmount: 0,
  footerAdText: "",
  logoTextItems: [],
  userTheme: "light",
  adminTheme: "light",
};

export const PAYMENT_DEFAULTS: PaymentSettings = {
  mpesaKey: "",
  mpesaSecret: "",
  mpesaShortcode: "",
  mpesaPasskey: "",
  mpesaEnv: "sandbox",
  paypalClientId: "",
  paypalSecret: "",
  stripePublishable: "",
  stripeSecret: "",
  codEnabled: false,
};

export const SHIPPING_DEFAULTS: ShippingSettings = {
  standardFee: "50.00",
  expressDelivery: "100.00",
  freeShippingThreshold: "50000.00",
};

export const EMAIL_DEFAULTS: EmailSettings = {
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  orderConfirmation: true,
  shippingNotification: true,
  abandonedCartReminder: true,
  orderConfirmationMessage:
    "Thank you for your order. We are getting your items ready for shipment.",
  shippingNotificationMessage:
    "Great news! Your order has been shipped and is on its way to you.",
  productImageWidth: "40",
  emailBackgroundColor: "#ffffff",
  emailButtonColor: "#3b82f6",
};

export const SECURITY_DEFAULTS: SecuritySettings = {
  twoFactorAuth: false,
  loginAttemptLimit: "5",
  captchaEnabled: true,
  googleClientId: "",
  googleClientSecret: "",
  facebookAppId: "",
  facebookAppSecret: "",
};

export const SOCIAL_DEFAULTS: SocialSettings = {
  facebook: "https://facebook.com/yourstore",
  instagram: "https://instagram.com/yourstore",
  twitter: "https://twitter.com/yourstore",
  linkedin: "https://linkedin.com/company/yourstore",
  youtube: "https://youtube.com/@yourstore",
  tiktok: "https://tiktok.com/@yourstore",
};

export const BACKUP_DEFAULTS: BackupSettings = { schedule: "weekly" };

// ─── Utility ──────────────────────────────────────────────────────────────────

export const ICON_OPTIONS = [
  "Truck","Shield","RefreshCw","Award","Clock","CreditCard","Gift",
  "Headphones","Heart","MapPin","Package","Phone","ShoppingBag","Star",
  "ThumbsUp","Zap","CheckCircle","Globe","Monitor","Cpu","Smartphone",
];

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "KES", label: "KES (Ksh)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "UGX", label: "UGX (USh)" },
  { value: "TZS", label: "TZS (TSh)" },
  { value: "ZAR", label: "ZAR (R)" },
  { value: "NGN", label: "NGN (₦)" },
];

export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

export function clampWords(value: string, maxWords = 15): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}