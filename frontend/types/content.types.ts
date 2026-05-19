export interface Banner {
  id: number;
  title: string;
  description?: string | null;
  image: string;
  active: boolean;
  order?: number;
}

export interface Promotion {
  id: number;
  title: string;
  description?: string | null;
  active: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  content?: string | null;
  image?: string | null;
  linkUrl?: string | null;
  date: string;
  active: boolean;
}

export type ContentType = "banner" | "promotion" | "announcement";
export type FormData = Partial<Banner & Promotion & Announcement>;