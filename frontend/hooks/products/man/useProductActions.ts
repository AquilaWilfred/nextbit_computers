import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Product } from "@/types/products/man/products.types";
import { apiFetch } from "@/lib/utils/products/man/man.products.utils";

export function useProductActions(
  onSuccess: () => void
) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const createProduct = useCallback(async (data: Partial<Product>): Promise<Product> => {
    const response = await apiFetch<Product>("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    toast.success("Product created successfully");
    onSuccess();
    return response;
  }, [onSuccess]);

  const updateProduct = useCallback(async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await apiFetch<Product>(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    toast.success("Product updated successfully");
    onSuccess();
    return response;
  }, [onSuccess]);

  const deleteProduct = useCallback(async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return false;
    
    setIsDeleting(id);
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      toast.success("Product deleted successfully");
      onSuccess();
      return true;
    } catch (err: any) {
      toast.error("Failed to delete product: " + err.message);
      return false;
    } finally {
      setIsDeleting(null);
    }
  }, [onSuccess]);

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    isDeleting,
  };
}