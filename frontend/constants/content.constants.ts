export const API_ENDPOINTS = {
  banners: "/api/content/banners",
  promotions: "/api/content/promotions",
  announcements: "/api/content/announcements",
  reorderBanners: "/api/content/banners/reorder",
  presignedUrl: "/api/content/presigned-url",
} as const;

export const TAB_ITEMS = [
  { value: "banners", label: "Banners", icon: "ImageIcon" },
  { value: "promotions", label: "Promotions", icon: "Tag" },
  { value: "announcements", label: "Announcements", icon: "Megaphone" },
] as const;