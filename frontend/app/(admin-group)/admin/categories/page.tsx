"use client";

import { useRef } from "react";
import Head from "next/head";
import { useCategories } from "@/hooks/categories/useCategories";
import { useCategoryForm } from "@/hooks/categories/useCategoryForm";
import { useImageUpload } from "@/hooks/categories/useImageUpload";
import { CategoryHeader } from "@/components/categories/CategoryHeader";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { ParentCategoryRow } from "@/components/categories/ParentCategoryRow";
import { SubCategoriesGrid } from "@/components/categories/SubCategoriesGrid";
import { CategoryEmptyState } from "@/components/categories/CategoryEmptyState";
import { CategorySkeleton } from "@/components/categories/CategorySkeleton";
import { getRootCategories, getSubCategories } from "@/lib/utils/category.utils";

export default function AdminCategoriesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    categories,
    isLoading,
    upsertCategory,
    deleteCategory,
    reorderCategories,
    setCategories,
  } = useCategories();

  const {
    isOpen,
    formData,
    isSaving,
    editingCategory,
    parentId,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
    setParentCategory,
    setHierarchy,
  } = useCategoryForm({
    onSave: upsertCategory,
    onClose: () => {},
  });

  const { isUploading, handleFileUpload, triggerFileSelect } = useImageUpload({
    onUploadSuccess: (url) => updateField("imageUrl", url),
  });

  const rootCategories = getRootCategories(categories);
  const hasRootCategories = rootCategories.length > 0;

  const handleMoveCategory = (index: number, direction: "up" | "down", siblingList: typeof rootCategories) => {
    const siblings = [...siblingList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    [siblings[index], siblings[targetIndex]] = [siblings[targetIndex], siblings[index]];

    const isRoot = !siblingList[0]?.parentId;
    const allIds: number[] = [];
    const rootList = isRoot ? siblings : rootCategories;

    rootList.forEach((root) => {
      allIds.push(root.id);
      const children = getSubCategories(categories, root.id);
      children.forEach((child) => allIds.push(child.id));
    });

    setCategories((prev) =>
      [...prev].sort((a, b) => allIds.indexOf(a.id) - allIds.indexOf(b.id))
    );

    reorderCategories(allIds).catch(() => {});
  };

  const handleAddSubCategory = (parentId: number) => {
    openForm(undefined, parentId);
  };

  const handleEditCategory = (category: typeof categories[0]) => {
    openForm(category);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category? Products may lose their category reference.")) return;
    await deleteCategory(id);
  };

  return (
    <>
      <Head>
        <title>Categories Management | Admin Dashboard</title>
        <meta name="description" content="Manage product categories and sub-categories for your store." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div>
        <div className="space-y-6">
          <CategoryHeader onAddParent={() => openForm()} />

          {isLoading ? (
            <CategorySkeleton />
          ) : !hasRootCategories ? (
            <CategoryEmptyState onAddParent={() => openForm()} />
          ) : (
            <div className="space-y-6">
              {rootCategories.map((parent, pIndex) => {
                const subCategories = getSubCategories(categories, parent.id);
                return (
                  <div key={parent.id}>
                    <ParentCategoryRow
                      id={parent.id}
                      name={parent.name}
                      slug={parent.slug}
                      description={parent.description}
                      imageUrl={parent.imageUrl}
                      featured={parent.featured}
                      active={parent.active}
                      isFirst={pIndex === 0}
                      isLast={pIndex === rootCategories.length - 1}
                      onMoveUp={() => handleMoveCategory(pIndex, "up", rootCategories)}
                      onMoveDown={() => handleMoveCategory(pIndex, "down", rootCategories)}
                      onAddSub={() => handleAddSubCategory(parent.id)}
                      onEdit={() => handleEditCategory(parent)}
                      onDelete={() => handleDeleteCategory(parent.id)}
                    />
                    <SubCategoriesGrid
                      subCategories={subCategories}
                      onEdit={handleEditCategory}
                      onDelete={handleDeleteCategory}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CategoryForm
        isOpen={isOpen}
        formData={formData}
        isSaving={isSaving}
        isUploading={isUploading}
        editingCategory={editingCategory}
        parentId={parentId}
        rootCategories={rootCategories}
        fileInputRef={fileInputRef}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onUpdateField={updateField}
        onSetParentCategory={setParentCategory}
        onSetHierarchy={setHierarchy}
        onImageUpload={handleFileUpload}
        onTriggerUpload={triggerFileSelect}
        onRemoveImage={() => updateField("imageUrl", "")}
      />
    </>
  );
}