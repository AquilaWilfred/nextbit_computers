import { ProductFormData } from "@/types/products/man/products.types";

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_ITEMS_PER_PAGE = 20;
export const POLLING_INTERVAL = 60000; // 60 seconds

export const DEFAULT_FORM: ProductFormData = {
  name: "",
  slug: "",
  categoryId: "",
  price: "",
  comparePrice: "",
  stock: "",
  brand: "",
  sku: "",
  description: "",
  shortDescription: "",
  images: [],
  specifications: "",
  tags: "",
  featured: false,
  active: true,
};

export const DISCOUNT_PERCENTAGES = [5, 10, 15, 20, 25, 30, 50];

export const STOCK_THRESHOLDS = {
  HIGH: 20,
  MEDIUM: 5,
} as const;

export const SORTABLE_COLUMNS = [
  { key: "name", label: "Product Name" },
  { key: "categoryId", label: "Category" },
  { key: "brand", label: "Brand" },
  { key: "price", label: "Price", right: true },
  { key: "stock", label: "Stock", right: true },
];