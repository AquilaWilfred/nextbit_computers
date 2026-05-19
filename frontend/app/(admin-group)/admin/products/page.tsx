"use client";

import { useState, useMemo, useRef } from "react"; // ← Add useState here
import { useDebounce } from "@/hooks/products/man/useDebounce";
import { useProducts } from "@/hooks/products/man/useProducts";
import { useCategories } from "@/hooks/products/man/useCategories";
import { useBrands } from "@/hooks/products/man/useBrands";
import { useProductForm } from "@/hooks/products/man/useProductForm";
import { useProductFilters } from "@/hooks/products/man/useProductFilters";
import { useProductActions } from "@/hooks/products/man/useProductActions";
import { useImageUpload } from "@/hooks/products/man/useImageUpload";
import { ProductsHeader } from "@/components/products/man/ProductsHeader";
import { ProductsSearch } from "@/components/products/man/ProductsSearch";
import { ProductsTable } from "@/components/products/man/ProductsTable";
import { ProductForm } from "@/components/products/man/ProductForm";

// Move useSearchTerm inside the component or create as a separate hook
function useSearchTerm() {
  const [searchTerm, setSearchTerm] = useState("");
  return { searchTerm, setSearchTerm };
}

export default function AdminProductsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { searchTerm, setSearchTerm } = useSearchTerm();
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { products, isLoading, updateProductOptimistically, addProductOptimistically, removeProductOptimistically } = useProducts(debouncedSearch);
  const { categories, rootCategories, getCategoryName } = useCategories();
  const { brands } = useBrands();
  const { createProduct, updateProduct, deleteProduct, isDeleting } = useProductActions(() => {});
  
  const {
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    sortConfig,
    handleSort,
    sortedProducts,
    paginatedProducts,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = useProductFilters(products);

  const { isUploading, handleFileUpload, triggerFileSelect } = useImageUpload((urls) => {
    updateField("images", [...formData.images, ...urls]);
  });

  const handleProductSave = async (payload: any, isEditing: boolean) => {
    if (isEditing) {
      const updated = await updateProduct(payload.id, payload);
      updateProductOptimistically(payload.id, updated);
    } else {
      const created = await createProduct(payload);
      addProductOptimistically(created);
    }
  };

  const {
    isOpen,
    editingId,
    formData,
    isSubmitting,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
    setPrice,
    applyDiscount,
  } = useProductForm(handleProductSave);

  const handleDelete = async (id: number) => {
    const success = await deleteProduct(id);
    if (success) {
      removeProductOptimistically(id);
    }
  };

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const startIndexValue = startIndex; // already defined
  const endIndexValue = endIndex; // already defined

  return (
    <div>
      <div className="space-y-6">
        <ProductsHeader onAddProduct={() => openForm()} />
        <ProductsSearch value={searchTerm} onChange={setSearchTerm} />
        <ProductsTable
          products={paginatedProducts}
          isLoading={isLoading}
          isDeleting={isDeleting}
          categoryMap={categoryMap}
          sortConfig={sortConfig}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndexValue}
          endIndex={endIndexValue}
          itemsPerPage={itemsPerPage}
          onSort={handleSort}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}
          onEdit={openForm}
          onDelete={handleDelete}
        />
      </div>

      <ProductForm
        isOpen={isOpen}
        editingId={editingId}
        formData={formData}
        isSubmitting={isSubmitting}
        isUploading={isUploading}
        categories={categories}
        rootCategories={rootCategories}
        brands={brands}
        fileInputRef={fileInputRef}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onUpdateField={updateField}
        onPriceChange={setPrice}
        onApplyDiscount={applyDiscount}
        onImageUpload={handleFileUpload}
        onTriggerUpload={triggerFileSelect}
        onRemoveImage={(index) => {
          const newImages = [...formData.images];
          newImages.splice(index, 1);
          updateField("images", newImages);
        }}
      />
    </div>
  );
}