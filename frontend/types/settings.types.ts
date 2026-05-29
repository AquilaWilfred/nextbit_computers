// types/settings.types.ts
export interface StoreFeature {
  icon: string;
  title: string;
  desc: string;
  content?: string;
}

export interface GeneralSettings {
  storeName?: string;
  storeDescription?: string;
  features?: StoreFeature[];
}

export interface PublicSettings {
  general?: GeneralSettings;
}