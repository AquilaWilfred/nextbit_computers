"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";

interface ContentImageUploadProps {
  imageUrl: string | null;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpload: () => void;
  onRemove: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  aspectRatio?: string;
  compact?: boolean;
}

export const ContentImageUpload = memo(function ContentImageUpload({
  imageUrl,
  isUploading,
  fileInputRef,
  onUpload,
  onRemove,
  onFileChange,
  label = "Image",
  aspectRatio = "16/9",
  compact = false,
}: ContentImageUploadProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative"
        onClick={onUpload}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onUpload()}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="image/*"
          onChange={onFileChange}
        />
        
        {imageUrl ? (
          <div className={`relative w-full ${compact ? "h-32" : `aspect-[${aspectRatio}]`} rounded-lg overflow-hidden border border-border`}>
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full opacity-90 hover:opacity-100 shadow-sm"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <X size={compact ? 12 : 16} />
            </Button>
          </div>
        ) : (
          <div className={compact ? "py-3" : "py-6"}>
            {isUploading ? (
              <Loader2 className={`mx-auto mb-2 animate-spin text-muted-foreground/60 ${compact ? "w-5 h-5" : "w-8 h-8"}`} />
            ) : (
              <Upload className={`mx-auto mb-2 text-muted-foreground/60 ${compact ? "w-5 h-5" : "w-8 h-8"}`} />
            )}
            <p className="text-sm font-medium">Click to upload image</p>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (Max 2MB)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});