"use client";

import { memo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ContentImageUpload } from "./ContentImageUpload";
import { ContentType, FormData } from "@/types/content.types";

interface ContentFormProps {
  isOpen: boolean;
  formType: ContentType | null;
  formData: FormData;
  isSaving: boolean;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerUpload: () => void;
  onRemoveImage: () => void;
}

export const ContentForm = memo(function ContentForm({
  isOpen,
  formType,
  formData,
  isSaving,
  isUploading,
  onClose,
  onSubmit,
  onUpdateField,
  onImageUpload,
  onTriggerUpload,
  onRemoveImage,
}: ContentFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !formType) return null;

  const isEditing = !!formData.id;
  const isBanner = formType === "banner";
  const isPromotion = formType === "promotion";
  const isAnnouncement = formType === "announcement";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold capitalize">
              {isEditing ? "Edit" : "Add"} {formType}
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            {/* Title - all types */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                required
                value={formData.title || ""}
                onChange={(e) => onUpdateField("title", e.target.value)}
                placeholder={isBanner ? "E.g. Summer Sale" : "E.g. 20% Off"}
              />
            </div>

            {/* Banner-specific fields */}
            {isBanner && (
              <>
                <div className="space-y-2">
                  <Label>Subtitle / Description (Optional)</Label>
                  <Input
                    value={formData.description || ""}
                    onChange={(e) => onUpdateField("description", e.target.value)}
                    placeholder="E.g. Save up to 40% on top tech"
                  />
                </div>
                <ContentImageUpload
                  imageUrl={formData.image || null}
                  isUploading={isUploading}
                  fileInputRef={fileInputRef}
                  onUpload={onTriggerUpload}
                  onRemove={onRemoveImage}
                  onFileChange={onImageUpload}
                  aspectRatio="21/9"
                  label="Banner Image *"
                />
              </>
            )}

            {/* Announcement image + link */}
            {isAnnouncement && (
              <>
                <ContentImageUpload
                  imageUrl={formData.image || null}
                  isUploading={isUploading}
                  fileInputRef={fileInputRef}
                  onUpload={onTriggerUpload}
                  onRemove={onRemoveImage}
                  onFileChange={onImageUpload}
                  label="Announcement Image (Optional)"
                  compact
                />
                <div className="space-y-2">
                  <Label>Link URL (Optional)</Label>
                  <Input
                    value={formData.linkUrl || ""}
                    onChange={(e) => onUpdateField("linkUrl", e.target.value)}
                    placeholder="e.g. /products?category=laptops or https://…"
                  />
                </div>
              </>
            )}

            {/* Promotion description */}
            {isPromotion && (
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  required
                  value={formData.description || ""}
                  onChange={(e) => onUpdateField("description", e.target.value)}
                  placeholder="Use code SUMMER20 at checkout"
                />
              </div>
            )}

            {/* Announcement content + date */}
            {isAnnouncement && (
              <>
                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea
                    required
                    value={formData.content || ""}
                    onChange={(e) => onUpdateField("content", e.target.value)}
                    placeholder="Details about the announcement"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.date || ""}
                    onChange={(e) => onUpdateField("date", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Active toggle - all types */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <Label className="cursor-pointer">Active / Visible on Store</Label>
              <Switch
                checked={!!formData.active}
                onCheckedChange={(c) => onUpdateField("active", c)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isUploading}
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-24"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});