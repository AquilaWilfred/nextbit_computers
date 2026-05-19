"use client";

import { useState, useCallback } from "react";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentTabs } from "@/components/content/ContentTabs";
import { BannersTab } from "@/components/content/BannersTab";
import { PromotionsTab } from "@/components/content/PromotionsTab";
import { AnnouncementsTab } from "@/components/content/AnnouncementsTab";
import { ContentForm } from "@/components/content/ContentForm";
import { useImageUpload } from "@/hooks/content/useImageUpload";
import { useContentForm } from "@/hooks/content/useContentForm";
import { useBanners } from "@/hooks/content/useBanners";
import { usePromotions } from "@/hooks/content/usePromotions";
import { useAnnouncements } from "@/hooks/content/useAnnouncements";
import { ContentType, Banner, Promotion, Announcement } from "@/types/content.types";

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState("banners");
  
  const { saveBanner, deleteBanner } = useBanners();
  const { savePromotion, deletePromotion } = usePromotions();
  const { saveAnnouncement, deleteAnnouncement } = useAnnouncements();

  const { isUploading, handleFileUpload, triggerFileSelect } = useImageUpload({
    onSuccess: (url) => updateField("image", url),
  });

  const handleSave = useCallback(async (data: any, type: ContentType) => {
    if (type === "banner") await saveBanner(data);
    if (type === "promotion") await savePromotion(data);
    if (type === "announcement") await saveAnnouncement(data);
  }, [saveBanner, savePromotion, saveAnnouncement]);

  const {
    isOpen,
    formType,
    formData,
    isSaving,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
  } = useContentForm({ onSave: handleSave, onClose: () => {} });

  const handleEdit = useCallback((item: Banner | Promotion | Announcement, type: ContentType) => {
    openForm(type, item);
  }, [openForm]);

  const handleDelete = useCallback(async (id: number, type: ContentType) => {
    if (!confirm(`Delete this ${type}?`)) return;
    if (type === "banner") await deleteBanner(id);
    if (type === "promotion") await deletePromotion(id);
    if (type === "announcement") await deleteAnnouncement(id);
  }, [deleteBanner, deletePromotion, deleteAnnouncement]);

  return (
    <div>
      <div className="space-y-6">
        <ContentHeader />
        <ContentTabs value={activeTab} onValueChange={setActiveTab} />

        {activeTab === "banners" && (
          <BannersTab
            onAdd={() => openForm("banner")}
            onEdit={(item) => handleEdit(item, "banner")}
            onDelete={(id) => handleDelete(id, "banner")}
          />
        )}

        {activeTab === "promotions" && (
          <PromotionsTab
            onAdd={() => openForm("promotion")}
            onEdit={(item) => handleEdit(item, "promotion")}
            onDelete={(id) => handleDelete(id, "promotion")}
          />
        )}

        {activeTab === "announcements" && (
          <AnnouncementsTab
            onAdd={() => openForm("announcement")}
            onEdit={(item) => handleEdit(item, "announcement")}
            onDelete={(id) => handleDelete(id, "announcement")}
          />
        )}
      </div>

      <ContentForm
        isOpen={isOpen}
        formType={formType}
        formData={formData}
        isSaving={isSaving}
        isUploading={isUploading}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onUpdateField={updateField}
        onImageUpload={handleFileUpload}
        onTriggerUpload={triggerFileSelect}
        onRemoveImage={() => updateField("image", "")}
      />
    </div>
  );
}