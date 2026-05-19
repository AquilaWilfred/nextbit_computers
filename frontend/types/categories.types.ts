export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  featured?: boolean;
  active?: boolean;
  parentId?: number | null;
  order?: number;
}

export type FormData = Partial<Category>;