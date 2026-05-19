import { Endpoint, AiSettings } from '@/types/ai.types';

export const FALLBACK_ENDPOINTS: Endpoint[] = [
  { path: "admin/stats", description: "Aggregate store metrics for business analysis." },
  { path: "admin/orders", description: "Fetch full order history for forecasting and analytics." },
  { path: "admin/orders/:id", description: "Retrieve detailed order payloads for fulfillment review." },
  { path: "admin/orders/:id/status", description: "Protected status update endpoint used by internal workflows." },
  { path: "admin/payments", description: "Payment records for financial and reconciliation analysis." },
  { path: "admin/customers", description: "Customer data for segmentation and modelling." },
  { path: "admin/products", description: "Product catalog metadata for merchandising and analytics." },
  { path: "admin/products/:id", description: "Protected product creation/update endpoint." },
  { path: "admin/categories", description: "Product category data for analytics and grouping." },
  { path: "admin/branches", description: "Branch location data for operational analysis." },
  { path: "admin/notifications", description: "Internal admin notification stream." },
  { path: "admin/payouts", description: "Payout request data for finance workflows." },
  { path: "admin/export", description: "Export a protected snapshot of the full store database." },
  { path: "admin/ai/train", description: "Upload documents to the AI knowledge store." },
  { path: "admin/upload/presign", description: "Generate secure upload URLs for protected file ingestion." },
  { path: "admin/settings/:key", description: "Retrieve or update admin-only configuration values." },
  { path: "admin/analytics/ai-stats", description: "AI conversation metrics and training signals." },
  { path: "admin/analytics/demand", description: "Demand forecasting endpoint." },
  { path: "admin/analytics/pricing", description: "Pricing suggestion data for optimisation." },
  { path: "admin/analytics/segments", description: "Customer segmentation data for modelling." },
  { path: "admin/analytics/views", description: "Product view statistics." },
];

export const DEFAULT_SETTINGS: AiSettings = {
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful e-commerce assistant for the admin panel of this online store. Your goal is to help the admin manage the store efficiently.",
  knowledgeBaseFiles: [],
};

export const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o (Most Advanced)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Efficient)" },
  { value: "grok-4-1-fast", label: "Grok 4.1 Fast (x.ai)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
];

export const CONTEXT_VARIABLES = [
  "{Page Context}",
  "{Cart Data}",
  "{User Details}",
];