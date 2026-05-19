"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";

interface CategoryImageUploadProps {
  imageUrl: string | null;
  isUploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CategoryImageUpload = memo(function CategoryImageUpload({
  imageUrl,
  isUploading,
  onUpload,
  onRemove,
  fileInputRef,
  onFileChange,
}: CategoryImageUploadProps) {
  return (
    <div className="space-y-2">
      <Label>Category Image</Label>
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative"
        onClick={onUpload}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onUpload()}
        aria-label="Upload category image"
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="image/*"
          onChange={onFileChange}
          aria-label="Upload category image file"
        />
        
        {imageUrl ? (
          <div className="relative w-full h-32">
            <img
              src={imageUrl}
              alt="Category preview"
              className="w-full h-full object-cover rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              aria-label="Remove image"
            >
              <X size={12} />
            </Button>
          </div>
        ) : (
          <div className="py-2">
            {isUploading ? (
              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-muted-foreground" />
            ) : (
              <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">Click to upload image</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2 MB</p>
          </div>
        )}
      </div>
    </div>
  );
});